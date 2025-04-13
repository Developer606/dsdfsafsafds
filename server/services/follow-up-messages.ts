/**
 * Follow-up Messages Service
 * 
 * This service allows characters to automatically follow up on promises
 * they made in previous messages, such as "I'll be right back with food"
 * by actually sending a follow-up message about returning with food.
 */

import { storage } from '../storage';
import { socketService } from '../socket-io-server';
import { generateCharacterResponse } from '../openai';
import { deliverProgressiveMessage } from './progressive-delivery';

// Response patterns that should trigger follow-up messages
interface FollowUpPattern {
  regex: RegExp;
  delay: number; // Delay in ms before follow-up
  prompt: string; // Prompt to generate follow-up message
}

// Follow-up patterns to detect in character messages
const followUpPatterns: FollowUpPattern[] = [
  // Food related follow-ups
  {
    regex: /I'll be (right )?back with (your|the|some) (food|tempura|yakitori|meal|dinner|breakfast|lunch|snack)/i,
    delay: 8000, // 8 seconds
    prompt: "You promised to come back with food. You've now returned with the food. Describe the food you've brought and your reaction to seeing the user again."
  },
  {
    regex: /I think you mean.*?I'll be right back with your food/i,
    delay: 8000, // 8 seconds
    prompt: "You corrected the user's English and said you'll be right back with food. You've now returned with the food. Describe what food you've brought and your excitement about sharing it with them."
  },
  {
    regex: /I'll (get|start) cooking/i,
    delay: 10000, // 10 seconds
    prompt: "You said you'll get cooking. You've now finished preparing the food. Describe what you've cooked and how delicious it looks/smells."
  },
  {
    regex: /heads to the kitchen/i,
    delay: 12000, // 12 seconds 
    prompt: "You went to the kitchen. You've now returned with some delicious food. Describe what you've prepared and your excitement to share it."
  },
  {
    regex: /I'll go (get|prepare|make|cook) (some|the|a) (.+?) for you/i,
    delay: 10000, // 10 seconds
    prompt: "You said you would get/prepare/make/cook something for the user. You've now returned with it. Describe what you've brought and your excitement to share it with them."
  },
  {
    regex: /I'll (bring|get|fetch) you (some|a|an|the) (.+?)( (later|soon|in a bit|in a moment|when I'm done))?/i,
    delay: 12000,
    prompt: "You promised to bring something to the user. You've now returned with it. Describe what you've brought and your feelings about giving it to them."
  },
  
  // Temporary absence follow-ups
  {
    regex: /I need to (go|leave) for a (moment|second|minute|bit)/i,
    delay: 15000, // 15 seconds
    prompt: "You said you needed to leave for a moment. You've now returned. Explain where you went and what happened while you were gone."
  },
  {
    regex: /I'll be (right |just )?back/i,
    delay: 10000,
    prompt: "You said you'd be right back. You've now returned. Describe what you were doing and your current state/mood."
  },
  {
    regex: /(wait|hold on|give me a (second|minute|moment))/i,
    delay: 8000,
    prompt: "You asked the user to wait or give you a moment. Now that time has passed, continue the conversation with what you wanted to say or do."
  },
  {
    regex: /(brb|be right back)/i,
    delay: 10000,
    prompt: "You said you'd be right back. You've now returned to the conversation. Explain what you were doing or mention that you're back now."
  },
  
  // Information gathering follow-ups
  {
    regex: /I'll (check|find out|ask|see) (and|then) (let you know|tell you|get back to you)/i,
    delay: 12000, // 12 seconds
    prompt: "You promised to check something and get back to the user. You've now returned with the information. Share what you found out with excitement or interest."
  },
  {
    regex: /let me (check|verify|confirm|think about|find|search for|look for) (.+?)( first| quickly| for you)?/i,
    delay: 15000,
    prompt: "You said you'd check or find something. You've now completed that task. Share what you discovered or your thoughts about it."
  },
  
  // Action-based follow-ups
  {
    regex: /I (will|should|need to|have to) (.+?) (and|then) (I'll|I will) (.+?)/i,
    delay: 18000,
    prompt: "You said you needed to do something and then do something else. You've now completed these actions. Describe what happened and the outcome."
  },
  {
    regex: /I'm going to (.+?) (right now|now|quickly)/i,
    delay: 12000,
    prompt: "You said you were going to do something right away. You've now completed that action. Describe what happened and how you feel about it."
  },
  
  // Promise-based follow-ups
  {
    regex: /I promise (to|I'll|I will) (.+?)/i,
    delay: 15000,
    prompt: "You made a promise to the user. You've now fulfilled that promise. Describe how you kept your promise and the result."
  },
  {
    regex: /(yes|sure|of course|definitely|absolutely)[,.!]? I (can|will|could) (.+?) for you/i,
    delay: 14000,
    prompt: "You agreed to do something for the user. You've now completed that task. Describe what you did and express your happiness to help."
  }
];

/**
 * Check if a message matches any follow-up patterns
 * @param message The message to check
 * @returns The matching pattern or null if no match
 */
function checkForFollowUpPromise(message: string): FollowUpPattern | null {
  // Debug: Print all pattern tests against this message
  console.log(`[FollowUpMessages] Testing message against ${followUpPatterns.length} patterns: "${message}"`);
  
  // First, check all the explicit patterns
  for (const pattern of followUpPatterns) {
    const matches = pattern.regex.test(message);
    console.log(`[FollowUpMessages] Pattern ${pattern.regex} => ${matches ? 'MATCHED' : 'no match'}`);
    
    if (matches) {
      return pattern;
    }
  }
  
  // Advanced detection for implicit promises and action statements
  
  // Look for narration actions in third person (like "heads to the kitchen")
  const narrationRegex = /\*([^*]+)\*|_([^_]+)_|heads to|goes to|walks to|runs to|moves to/i;
  if (narrationRegex.test(message)) {
    console.log(`[FollowUpMessages] Detected narration or action in message: "${message}"`);
    
    // Set contextual prompt based on content
    let prompt = "You performed an action earlier. You've now completed that action. Describe what happened and how you feel about it.";
    
    // If kitchen or cooking related
    if (/kitchen|cook|food|meal|eating|dining/i.test(message)) {
      return {
        regex: narrationRegex,
        delay: 15000, // Longer delay for cooking
        prompt: "You went to the kitchen or mentioned cooking. You've now prepared some delicious food. Describe what you've cooked and how excited you are to share it."
      };
    }
    
    // If fetching something
    if (/get|bring|fetch|grab|pick up/i.test(message)) {
      return {
        regex: narrationRegex,
        delay: 8000,
        prompt: "You went to get something. You've now returned with the item. Describe what you brought back and why you're excited to share it."
      };
    }
    
    // Default action follow-up
    return {
      regex: narrationRegex,
      delay: 10000,
      prompt
    };
  }
  
  // Detect statements about going somewhere or doing something
  const actionRegex = /I('ll| will| am going to| need to| have to| should| am about to) (go|get|make|prepare|check|find|bring|do|work on|create|cook)/i;
  if (actionRegex.test(message)) {
    console.log(`[FollowUpMessages] Detected action statement in message: "${message}"`);
    
    // Set contextual delay and prompt based on content
    let delay = 12000;
    let prompt = "You mentioned that you would do something. You've now completed that action. Describe what you did and the outcome.";
    
    // If cooking related
    if (/cook|food|meal|prepare dinner|make breakfast|bake/i.test(message)) {
      delay = 20000; // Longer delay for cooking
      prompt = "You mentioned that you would cook or prepare food. You've now finished cooking. Describe the delicious meal you've prepared, including aromas, presentation, and your excitement to share it.";
    }
    
    // If quick check or search related
    if (/check|look|see if|search/i.test(message)) {
      delay = 8000; // Shorter delay for quick actions
      prompt = "You said you would check or search for something. You've now found what you were looking for. Describe what you discovered and your thoughts about it.";
    }
    
    return {
      regex: actionRegex,
      delay,
      prompt
    };
  }
  
  return null;
}

/**
 * Enhanced debugging - log message to console with truncation for readability
 */
function debugLog(prefix: string, message: string, maxLength: number = 100): void {
  const truncated = message.length > maxLength 
    ? `${message.substring(0, maxLength)}...` 
    : message;
  console.log(`${prefix} ${truncated}`);
}

/**
 * Schedule an automatic follow-up message based on a character's promise
 */
export async function scheduleFollowUpMessage(
  userId: number,
  characterId: string,
  message: string,
  characterName: string,
  characterAvatar: string,
  characterPersonality: string
): Promise<void> {
  // Check if message contains a promise pattern
  debugLog(`[FollowUpMessages] Checking for promises in message:`, message);
  
  // Force lowercase for more accurate matching
  const lowerMessage = message.toLowerCase();
  
  // Enhanced comprehensive direct string pattern detection with 1000+ patterns
  // This is a much more robust approach that catches many common action phrases
  const directActionPatterns = [
    // Food and cooking related
    { 
      patterns: [
        // Basic cooking phrases
        "i'll get cooking", "i'll cook", "let me cook", "heads to the kitchen", "i'll prepare", 
        "i'll make", "going to cook", "i'm cooking", "start cooking", "prepare", "making food", 
        "make us some", "get some food", "i'll whip up", "i'll bake", "start preparing", 
        "prepare a meal", "make us dinner", "make us lunch", "make us breakfast", "prepare something",
        "goes to cook", "starts cooking", "warming up", "making a dish", "will make you", "will cook you",
        "will prepare you", "let me fix you", "let me make you", "kitchen to", "go to the kitchen",
        
        // Expanded cooking phrases
        "i should cook", "i can cook", "i'll start making", "let me prepare", "let me whip up",
        "let me fix", "gonna cook", "going to prepare", "going to make", "gonna make", "time to cook",
        "time to make", "i'm going to whip up", "i'm gonna prepare", "begin cooking", "begin preparing",
        "start making", "start the preparation", "prep some", "prep the", "prepare the", "make the",
        "cooking coming up", "i'd be happy to cook", "be happy to make", "glad to cook", "glad to prepare",
        "let's see what i can cook", "see what i can make", "check what ingredients", "what ingredients i have",
        "what i can make", "what i can cook", "what i can prepare", "what i can whip up",
        "let me see what food", "check the kitchen", "see what's in the kitchen", "look in the kitchen",
        "look in the fridge", "check the fridge", "see what's in the fridge", "raid the fridge",
        "look for ingredients", "get some ingredients", "gather ingredients", "collect ingredients",
        "need some ingredients", "need ingredients for", "ingredients for", "recipe for",
        "i know a recipe", "i know a good recipe", "i have a recipe", "follow a recipe",
        "make something tasty", "cook something delicious", "prepare something tasty", "whip up something delicious",
        "cook up a", "whip up a", "prepare a", "fix a", "make a", "baking a", "cooking a", "grilling a",
        "boiling some", "frying some", "roasting some", "steaming some", "simmering some", "sautéing some",
        
        // Cultural and specific food mentions
        "make some pasta", "cook some pasta", "prepare some pasta", "boil some pasta", "cook pasta",
        "make some soup", "cook some soup", "prepare some soup", "simmer some soup", "make a soup",
        "make some rice", "cook some rice", "prepare some rice", "steam some rice", "cook rice",
        "make a sandwich", "prepare a sandwich", "fix a sandwich", "assemble a sandwich", "make sandwich",
        "make some noodles", "cook some noodles", "prepare some noodles", "boil some noodles", "cook noodles",
        "make some curry", "cook some curry", "prepare some curry", "simmer some curry", "make curry",
        "make some stir-fry", "cook some stir-fry", "prepare some stir-fry", "stir-fry some", "make stir-fry",
        "make some pizza", "prepare some pizza", "bake some pizza", "make a pizza", "bake a pizza",
        "make some tacos", "prepare some tacos", "cook some tacos", "assemble some tacos", "make tacos",
        "make some sushi", "prepare some sushi", "roll some sushi", "make sushi", "prepare sushi",
        "make some tempura", "prepare some tempura", "fry some tempura", "make tempura", "cook tempura",
        "make some ramen", "prepare some ramen", "cook some ramen", "boil some ramen", "make ramen",
        "make some udon", "prepare some udon", "cook some udon", "boil some udon", "make udon",
        "make some soba", "prepare some soba", "cook some soba", "boil some soba", "make soba",
        "make some yakitori", "prepare some yakitori", "grill some yakitori", "make yakitori", "cook yakitori",
        "make some donburi", "prepare some donburi", "cook some donburi", "make donburi", "cook donburi",
        "make some gyoza", "prepare some gyoza", "steam some gyoza", "fry some gyoza", "make gyoza",
        "make some takoyaki", "prepare some takoyaki", "cook some takoyaki", "make takoyaki", "cook takoyaki",
        "make some okonomiyaki", "prepare some okonomiyaki", "cook some okonomiyaki", "make okonomiyaki",
        "make some snacks", "prepare some snacks", "get some snacks", "fix some snacks", "make snacks",
        "make some treats", "prepare some treats", "bake some treats", "make treats", "bake treats",
        "make some dessert", "prepare some dessert", "bake some dessert", "make dessert", "bake dessert",
        "make some cookies", "bake some cookies", "prepare some cookies", "make cookies", "bake cookies",
        "make some cake", "bake some cake", "prepare some cake", "make cake", "bake cake",
        "make some pie", "bake some pie", "prepare some pie", "make pie", "bake pie",
        
        // Narration and roleplay actions in kitchen
        "*goes to the kitchen*", "*heads to the kitchen*", "*walks to the kitchen*", "*runs to the kitchen*",
        "*enters the kitchen*", "*moves to the kitchen*", "*hurries to the kitchen*", "*skips to the kitchen*",
        "*sneaks to the kitchen*", "*steps into the kitchen*", "*dashes to the kitchen*", "*proceeds to the kitchen*",
        "*makes way to kitchen*", "*finds the kitchen*", "*reaches the kitchen*", "*arrives at the kitchen*",
        "*stands in the kitchen*", "*waits in the kitchen*", "*stays in the kitchen*", "*works in the kitchen*",
        "*cooks in kitchen*", "*prepares in kitchen*", "*starts cooking*", "*begins cooking*", "*commences cooking*",
        "*initiates cooking*", "*gets cooking*", "*gets to cooking*", "*gets to work*", "*sets to work*",
        "*puts on apron*", "*ties apron*", "*wears apron*", "*dons apron*", "*slips on apron*",
        "*rolls up sleeves*", "*washes hands*", "*checks ingredients*", "*gathers ingredients*",
        "*opens fridge*", "*searches refrigerator*", "*opens refrigerator*", "*looks inside fridge*",
        "*searches pantry*", "*opens pantry*", "*checks pantry*", "*looks inside pantry*",
        "*takes out ingredients*", "*pulls out ingredients*", "*selects ingredients*", "*chooses ingredients*",
        "*prepares ingredients*", "*chops vegetables*", "*cuts vegetables*", "*slices vegetables*",
        "*dices vegetables*", "*minces vegetables*", "*peels vegetables*", "*peels fruits*",
        "*cuts meat*", "*slices meat*", "*trims meat*", "*prepares meat*", "*seasons meat*",
        "*measures ingredients*", "*weighs ingredients*", "*mixes ingredients*", "*combines ingredients*",
        "*stirs ingredients*", "*blends ingredients*", "*whisks ingredients*", "*folds ingredients*",
        "*kneads dough*", "*rolls dough*", "*shapes dough*", "*proofs dough*", "*rests dough*",
        "*heats pan*", "*preheats oven*", "*turns on stove*", "*lights stove*", "*adjusts heat*",
        "*adds oil*", "*pours oil*", "*greases pan*", "*butters pan*", "*adds butter*",
        "*starts cooking*", "*begins cooking*", "*puts pan on*", "*sets timer*", "*checks timer*",
        "*watches pot*", "*stirs pot*", "*tastes food*", "*seasons food*", "*adds seasoning*",
        "*adds salt*", "*adds pepper*", "*adds spices*", "*adds herbs*", "*tastes and adjusts*",
        "*plates food*", "*serves food*", "*garnishes dish*", "*presents dish*", "*photographs dish*"
      ],
      category: "cooking",
      delay: 15000,
      prompt: "You were cooking or preparing food. You've now finished and have delicious food to share. Describe what you've made and how excited you are to share it."
    },
    
    // Getting items or fetching something
    {
      patterns: [
        // Basic fetching phrases
        "i'll go get", "i'll get it", "i'll grab", "let me get", "i'll fetch", "i'll find", 
        "heads to get", "goes to get", "going to find", "let me find", "i'll look for", 
        "let me see if", "going to search", "i'll retrieve", "let me check if", "bring you", 
        "fetch you", "get you", "will get you", "will bring you", "i'll bring", "go get",
        
        // Expanded fetching phrases
        "i should get", "i can get", "i'm going to get", "let me grab", "let me pick up",
        "let me fetch", "gonna get", "going to grab", "going to pick up", "gonna grab", "time to get",
        "time to fetch", "i'm going to retrieve", "i'm gonna find", "begin searching", "begin looking",
        "start searching", "start the hunt", "hunt for", "search for", "look for", "find the",
        "item coming up", "i'd be happy to get", "be happy to find", "glad to get", "glad to find",
        "let's see what i can find", "see what i can get", "check where", "where i can find",
        "what i can retrieve", "what i can collect", "what i can gather", "what i can pick up",
        "let me see where", "check the room", "see what's in the room", "look in the room",
        "look in the drawer", "check the drawer", "see what's in the drawer", "open the drawer",
        "look for item", "get some items", "gather items", "collect items",
        "need some items", "need items for", "items for", "materials for",
        "i know where", "i know a good place", "i have an idea", "i'll check",
        "get something useful", "find something helpful", "gather something needed", "retrieve something important",
        "pick up a", "gather a", "collect a", "find a", "get a", "retrieving a", "fetching a", "searching for a",
        "looking for some", "gathering some", "collecting some", "finding some", "getting some", "retrieving some",
        
        // Specific item fetching
        "get a book", "grab a book", "find a book", "look for a book", "retrieve a book",
        "get some books", "grab some books", "find some books", "look for books", "retrieve books",
        "get a drink", "grab a drink", "find a drink", "look for a drink", "retrieve a drink",
        "get some drinks", "grab some drinks", "find some drinks", "look for drinks", "retrieve drinks",
        "get water", "grab water", "find water", "look for water", "retrieve water",
        "get a glass", "grab a glass", "find a glass", "look for a glass", "retrieve a glass",
        "get some glasses", "grab some glasses", "find some glasses", "look for glasses", "retrieve glasses",
        "get a cup", "grab a cup", "find a cup", "look for a cup", "retrieve a cup",
        "get some cups", "grab some cups", "find some cups", "look for cups", "retrieve cups",
        "get a plate", "grab a plate", "find a plate", "look for a plate", "retrieve a plate",
        "get some plates", "grab some plates", "find some plates", "look for plates", "retrieve plates",
        "get a tool", "grab a tool", "find a tool", "look for a tool", "retrieve a tool",
        "get some tools", "grab some tools", "find some tools", "look for tools", "retrieve tools",
        "get a blanket", "grab a blanket", "find a blanket", "look for a blanket", "retrieve a blanket",
        "get some blankets", "grab some blankets", "find some blankets", "look for blankets", "retrieve blankets",
        "get a pillow", "grab a pillow", "find a pillow", "look for a pillow", "retrieve a pillow",
        "get some pillows", "grab some pillows", "find some pillows", "look for pillows", "retrieve pillows",
        "get a gift", "grab a gift", "find a gift", "look for a gift", "retrieve a gift",
        "get some gifts", "grab some gifts", "find some gifts", "look for gifts", "retrieve gifts",
        "get a present", "grab a present", "find a present", "look for a present", "retrieve a present",
        
        // Narration and roleplay actions for fetching
        "*goes to get*", "*heads to get*", "*walks to get*", "*runs to get*",
        "*leaves to get*", "*moves to get*", "*hurries to get*", "*skips to get*",
        "*sneaks away to get*", "*steps out to get*", "*dashes to get*", "*proceeds to get*",
        "*makes way to find*", "*searches for*", "*looks for*", "*hunts for*",
        "*stands to get*", "*rises to get*", "*gets up to find*", "*works on finding*",
        "*searches intently*", "*begins searching*", "*commences hunt*", "*initiates search*",
        "*gets looking*", "*gets to searching*", "*gets to work finding*", "*sets to work locating*",
        "*opens drawer*", "*checks drawer*", "*searches drawer*", "*rummages through drawer*",
        "*opens cabinet*", "*checks cabinet*", "*searches cabinet*", "*looks through cabinet*",
        "*opens box*", "*checks box*", "*searches box*", "*examines box*",
        "*opens closet*", "*checks closet*", "*searches closet*", "*looks through closet*",
        "*opens bag*", "*checks bag*", "*searches bag*", "*looks through bag*",
        "*looks around*", "*glances around*", "*scans room*", "*surveys area*"
      ],
      category: "fetching",
      delay: 10000,
      prompt: "You went to get something. You've now returned with the item. Describe what you brought back and why you're excited to share it."
    },
    
    // General actions
    {
      patterns: [
        // Basic action phrases
        "let me go", "i'll go", "heads out", "leaves the room", "goes to", "i'll check", 
        "i'll be back", "be right back", "brb", "give me a moment", "wait here", 
        "wait a second", "will return", "i need to", "let me just", "one moment", "one second",
        "be back in", "going to see", "check on", "look into", "will look at",
        
        // Expanded general actions
        "i should go", "i need to go", "i must go", "i have to go", "i'm going to go",
        "let me head", "need to head", "going to head", "gonna head", "heading to",
        "will be heading", "should be heading", "must be heading", "have to head",
        "let me step", "need to step", "going to step", "gonna step", "stepping to",
        "will be stepping", "should be stepping", "must be stepping", "have to step",
        "let me run", "need to run", "going to run", "gonna run", "running to",
        "will be running", "should be running", "must be running", "have to run",
        "let me leave", "need to leave", "going to leave", "gonna leave", "leaving to",
        "will be leaving", "should be leaving", "must be leaving", "have to leave",
        "let me check", "need to check", "going to check", "gonna check", "checking on",
        "will be checking", "should be checking", "must be checking", "have to check",
        "i'll return", "need to return", "going to return", "gonna return", "returning to",
        "will be returning", "should be returning", "must be returning", "have to return",
        "i'll come back", "need to come back", "going to come back", "gonna come back", "coming back to",
        "will be coming back", "should be coming back", "must be coming back", "have to come back",
        
        // Specific location actions
        "go to the bathroom", "head to the bathroom", "step to the bathroom", "run to the bathroom",
        "go to the bedroom", "head to the bedroom", "step to the bedroom", "run to the bedroom",
        "go to the living room", "head to the living room", "step to the living room", "run to the living room",
        "go to the garden", "head to the garden", "step to the garden", "run to the garden",
        "go to the yard", "head to the yard", "step to the yard", "run to the yard",
        "go to the study", "head to the study", "step to the study", "run to the study",
        "go to the office", "head to the office", "step to the office", "run to the office",
        "go to the store", "head to the store", "step to the store", "run to the store",
        "go to the shop", "head to the shop", "step to the shop", "run to the shop",
        "go to the market", "head to the market", "step to the market", "run to the market",
        
        // Waiting and time-based phrases
        "just a minute", "just a moment", "just a second", "just a bit", "just a while",
        "in a minute", "in a moment", "in a second", "in a bit", "in a while",
        "for a minute", "for a moment", "for a second", "for a bit", "for a while",
        "wait a minute", "wait a moment", "wait a second", "wait a bit", "wait a while",
        "give me a minute", "give me a moment", "give me a second", "give me a bit", "give me a while",
        "hang on", "hold on", "hold up", "hang tight", "hold tight",
        "sit tight", "stay put", "don't move", "remain here", "stay here",
        "pause", "timeout", "time out", "hold that thought", "freeze",
        
        // Narration and roleplay actions
        "*walks away*", "*steps away*", "*moves away*", "*backs away*", "*edges away*",
        "*turns away*", "*spins away*", "*walks off*", "*steps off*", "*moves off*",
        "*leaves*", "*departs*", "*exits*", "*goes out*", "*steps out*",
        "*disappears*", "*vanishes*", "*fades away*", "*slips away*", "*slides away*",
        "*runs off*", "*dashes off*", "*sprints off*", "*jogs off*", "*hurries off*",
        "*wanders off*", "*strolls off*", "*ambles off*", "*saunters off*", "*meanders off*",
        "*sneaks off*", "*tiptoes away*", "*creeps away*", "*slinks away*", "*slithers away*",
        "*rushes off*", "*charges off*", "*zooms off*", "*speeds off*", "*bolts off*",
        "*jumps up*", "*leaps up*", "*springs up*", "*bounds up*", "*hops up*",
        "*gets up*", "*stands up*", "*rises up*", "*straightens up*", "*perks up*"
      ],
      category: "general",
      delay: 12000,
      prompt: "You left to do something. You've now returned. Describe what you did and your current mood or state."
    },
    
    // Phone, communication and digital interaction actions
    {
      patterns: [
        // Phone related phrases
        "i'll call", "let me call", "going to call", "gonna call", "need to call", 
        "have to call", "should call", "must call", "will call", "want to call",
        "i'll phone", "let me phone", "going to phone", "gonna phone", "need to phone", 
        "i'll text", "let me text", "going to text", "gonna text", "need to text",
        "i'll message", "let me message", "going to message", "gonna message", "need to message",
        "i'll email", "let me email", "going to email", "gonna email", "need to email",
        "check my phone", "check my messages", "check my calls", "check my texts", "check my emails",
        "answer this call", "take this call", "respond to this text", "reply to this message",
        "make a call", "place a call", "dial a number", "ring someone", "phone someone",
        "send a text", "type a message", "compose a text", "write a message", "draft a text",
        
        // Digital device phrases
        "check my computer", "use my computer", "go on my computer", "work on my computer", 
        "check my laptop", "use my laptop", "go on my laptop", "work on my laptop",
        "check my tablet", "use my tablet", "go on my tablet", "work on my tablet",
        "search online", "look online", "check online", "research online", "browse online",
        "check the internet", "use the internet", "go on the internet", "search the internet",
        "check my email", "check my inbox", "check my messages", "check my notifications",
        "log in", "sign in", "access my account", "check my account", "open my account",
        "download something", "upload something", "transfer files", "share files", "send files",
        
        // Narration and roleplay actions for communication
        "*takes out phone*", "*pulls out phone*", "*grabs phone*", "*checks phone*", "*looks at phone*",
        "*answers phone*", "*picks up phone*", "*takes call*", "*responds to call*", "*talks on phone*",
        "*texts back*", "*types message*", "*sends text*", "*replies to message*", "*messages back*",
        "*opens laptop*", "*turns on computer*", "*uses keyboard*", "*types on keyboard*", "*clicks mouse*",
        "*scrolls through*", "*browses online*", "*searches web*", "*checks website*", "*visits site*",
        "*reads email*", "*opens email*", "*checks inbox*", "*replies to email*", "*sends email*",
        "*opens app*", "*uses app*", "*taps screen*", "*swipes screen*", "*navigates app*"
      ],
      category: "communication",
      delay: 10000,
      prompt: "You were using a phone or digital device. You've now finished your digital task. Describe what you did and what you discovered or accomplished."
    },
    
    // Cleaning, organizing and household tasks
    {
      patterns: [
        // Cleaning phrases
        "i'll clean", "let me clean", "going to clean", "gonna clean", "need to clean", 
        "have to clean", "should clean", "must clean", "will clean", "want to clean",
        "i'll tidy", "let me tidy", "going to tidy", "gonna tidy", "need to tidy",
        "i'll wash", "let me wash", "going to wash", "gonna wash", "need to wash",
        "i'll wipe", "let me wipe", "going to wipe", "gonna wipe", "need to wipe",
        "i'll dust", "let me dust", "going to dust", "gonna dust", "need to dust",
        "i'll vacuum", "let me vacuum", "going to vacuum", "gonna vacuum", "need to vacuum",
        "i'll sweep", "let me sweep", "going to sweep", "gonna sweep", "need to sweep",
        "i'll mop", "let me mop", "going to mop", "gonna mop", "need to mop",
        "i'll scrub", "let me scrub", "going to scrub", "gonna scrub", "need to scrub",
        
        // Organizing phrases
        "i'll organize", "let me organize", "going to organize", "gonna organize", "need to organize",
        "i'll arrange", "let me arrange", "going to arrange", "gonna arrange", "need to arrange",
        "i'll sort", "let me sort", "going to sort", "gonna sort", "need to sort",
        "i'll declutter", "let me declutter", "going to declutter", "gonna declutter", "need to declutter",
        "i'll put away", "let me put away", "going to put away", "gonna put away", "need to put away",
        "i'll straighten", "let me straighten", "going to straighten", "gonna straighten", "need to straighten",
        "i'll neaten", "let me neaten", "going to neaten", "gonna neaten", "need to neaten",
        "i'll fix", "let me fix", "going to fix", "gonna fix", "need to fix",
        "i'll repair", "let me repair", "going to repair", "gonna repair", "need to repair",
        "i'll maintenance", "let me maintenance", "going to maintenance", "gonna maintenance", "need to maintenance",
        
        // Narration and roleplay actions for household tasks
        "*starts cleaning*", "*begins tidying*", "*commences washing*", "*initiates dusting*", "*begins vacuuming*",
        "*grabs cleaning supplies*", "*gets cleaning tools*", "*prepares cleaning products*", "*sets up to clean*",
        "*wipes surface*", "*scrubs floor*", "*dusts furniture*", "*polishes table*", "*cleans windows*",
        "*organizes items*", "*arranges things*", "*sorts objects*", "*puts things away*", "*straightens room*",
        "*folds clothes*", "*hangs clothes*", "*puts away clothes*", "*organizes closet*", "*arranges wardrobe*",
        "*makes bed*", "*changes sheets*", "*fluffs pillows*", "*arranges blankets*", "*straightens bedding*",
        "*washes dishes*", "*loads dishwasher*", "*unloads dishwasher*", "*dries dishes*", "*puts away dishes*",
        "*takes out trash*", "*empties bin*", "*replaces trash bag*", "*disposes waste*", "*removes garbage*"
      ],
      category: "household",
      delay: 13000,
      prompt: "You were doing some cleaning or organizing. You've now finished the task. Describe what you accomplished and how the space looks now."
    },
    
    // Personal care and self-maintenance
    {
      patterns: [
        // Personal care phrases
        "i'll freshen up", "let me freshen up", "going to freshen up", "gonna freshen up", "need to freshen up",
        "i'll wash up", "let me wash up", "going to wash up", "gonna wash up", "need to wash up",
        "i'll clean up", "let me clean up", "going to clean up", "gonna clean up", "need to clean up",
        "i'll get ready", "let me get ready", "going to get ready", "gonna get ready", "need to get ready",
        "i'll prepare myself", "let me prepare myself", "going to prepare myself", "gonna prepare myself", "need to prepare myself",
        "i'll shower", "let me shower", "going to shower", "gonna shower", "need to shower",
        "i'll bathe", "let me bathe", "going to bathe", "gonna bathe", "need to bathe",
        "i'll wash my hands", "let me wash my hands", "going to wash my hands", "gonna wash my hands", "need to wash my hands",
        "i'll wash my face", "let me wash my face", "going to wash my face", "gonna wash my face", "need to wash my face",
        "i'll brush my teeth", "let me brush my teeth", "going to brush my teeth", "gonna brush my teeth", "need to brush my teeth",
        "i'll brush my hair", "let me brush my hair", "going to brush my hair", "gonna brush my hair", "need to brush my hair",
        "i'll change clothes", "let me change clothes", "going to change clothes", "gonna change clothes", "need to change clothes",
        "i'll get dressed", "let me get dressed", "going to get dressed", "gonna get dressed", "need to get dressed",
        "i'll put on makeup", "let me put on makeup", "going to put on makeup", "gonna put on makeup", "need to put on makeup",
        "i'll do my makeup", "let me do my makeup", "going to do my makeup", "gonna do my makeup", "need to do my makeup",
        "i'll fix my hair", "let me fix my hair", "going to fix my hair", "gonna fix my hair", "need to fix my hair",
        "i'll do my hair", "let me do my hair", "going to do my hair", "gonna do my hair", "need to do my hair",
        "i'll style my hair", "let me style my hair", "going to style my hair", "gonna style my hair", "need to style my hair",
        
        // Narration and roleplay actions for personal care
        "*goes to freshen up*", "*leaves to wash up*", "*steps out to clean up*", "*heads to get ready*", "*moves to prepare*",
        "*goes to shower*", "*heads to bathe*", "*steps to wash hands*", "*moves to wash face*", "*leaves to brush teeth*",
        "*changes clothes*", "*gets dressed*", "*puts on outfit*", "*selects clothing*", "*tries on outfit*",
        "*fixes appearance*", "*adjusts clothing*", "*straightens outfit*", "*checks appearance*", "*looks presentable*",
        "*applies makeup*", "*does makeup*", "*puts on lipstick*", "*applies foundation*", "*uses cosmetics*",
        "*styles hair*", "*fixes hair*", "*brushes hair*", "*combs hair*", "*arranges hair*"
      ],
      category: "personal_care",
      delay: 11000,
      prompt: "You went to take care of your personal appearance. You've now finished and returned looking refreshed. Describe how you feel after taking care of yourself."
    },
    
    // Social and emotional responses
    {
      patterns: [
        // Emotional response phrases
        "i need a moment", "give me a moment", "just need a moment", "moment to collect", "moment to compose",
        "need to calm down", "let me calm down", "going to calm down", "need to relax", "let me relax",
        "need to breathe", "let me breathe", "going to breathe", "take a deep breath", "deep breaths",
        "need to think", "let me think", "going to think", "moment to think", "think about this",
        "need to process", "let me process", "going to process", "time to process", "process this",
        "need space", "give me space", "want some space", "take some space", "get some space",
        "need time", "give me time", "want some time", "take some time", "get some time",
        "need privacy", "give me privacy", "want some privacy", "take some privacy", "get some privacy",
        "need silence", "give me silence", "want some silence", "some quiet", "moment of quiet",
        
        // Narration and roleplay actions for emotional responses
        "*takes a moment*", "*pauses briefly*", "*breathes deeply*", "*collects thoughts*", "*composes self*",
        "*calms down*", "*relaxes*", "*centers self*", "*grounds self*", "*steadies emotions*",
        "*thinks carefully*", "*considers options*", "*weighs choices*", "*contemplates response*", "*ponders situation*",
        "*processes feelings*", "*works through emotions*", "*manages feelings*", "*handles emotions*", "*deals with feelings*",
        "*steps back*", "*creates space*", "*takes space*", "*finds space*", "*gets distance*",
        "*takes time*", "*finds time*", "*makes time*", "*uses time*", "*spends time*",
        "*seeks privacy*", "*finds privacy*", "*ensures privacy*", "*gets privacy*", "*has privacy*",
        "*embraces silence*", "*enjoys quiet*", "*appreciates silence*", "*welcomes quiet*", "*values stillness*"
      ],
      category: "emotional",
      delay: 9000,
      prompt: "You needed a moment to process your emotions or thoughts. You've now collected yourself and feel ready to continue. Describe your current emotional state and thoughts."
    }
  ];
  
  // Check for direct string matches across all defined patterns
  for (const patternGroup of directActionPatterns) {
    for (const pattern of patternGroup.patterns) {
      if (lowerMessage.includes(pattern)) {
        console.log(`[FollowUpMessages] Detected direct action pattern: "${pattern}" (category: ${patternGroup.category})`);
        
        // Create a custom follow-up pattern
        const actionPattern = {
          regex: new RegExp(pattern, 'i'),
          delay: patternGroup.delay,
          prompt: patternGroup.prompt
        };
        
        // Schedule the follow-up
        scheduleFollowUpWithPattern(userId, characterId, message, characterName, characterAvatar, characterPersonality, actionPattern);
        return;
      }
    }
  }
  
  // Advanced AI-based action detection
  // Look for verbs followed by movement or action indicators
  const advancedActionPatterns = [
    // Pattern for character mentioning they're going to do something with action verbs
    /\b(will|going to|about to|starts? to|begins? to) (make|do|create|prepare|work on|build|clean|organize|find)\b/i,
    
    // Pattern for character narrating an action in third person
    /\b(walks|heads|runs|goes|moves|proceeds|steps) (to|towards|into|out|away|back)\b/i,
    
    // Pattern for character setting something aside to do something else
    /\b(let me|allow me to|going to) (take care of|handle|manage|deal with|work on|address)\b/i,
    
    // Specific pattern for promising to message or contact later/when free
    /\b(i'?ll|i will) (message|text|call|contact|talk to) you (when|as soon as|the moment|once) (i'?m|i am) (free|available|done|finished|back)\b/i,
    
    // Pattern for promises with a timeframe
    /\b(i'?ll|i will) (get back to|return to|come back to) you (in|within|after) (a|an|some|the) (second|minute|moment|hour|day|while|bit)\b/i,
    
    // Pattern for doing something with explicit promise words
    /\b(promise|vow|swear|guarantee) (to|that i'?ll|that i will) (.+?)\b/i
  ];
  
  // Check all advanced patterns
  for (const pattern of advancedActionPatterns) {
    if (pattern.test(message)) {
      console.log(`[FollowUpMessages] Detected advanced action pattern: ${pattern}`);
      
      const actionCategory = determineActionCategory(message);
      let delay = 12000; // Default delay
      let prompt = "You were doing something. You've now completed that action. Describe what happened and how you feel about it.";
      
      // Customize prompt based on detected action type
      if (actionCategory === 'cooking') {
        delay = 15000;
        prompt = "You were preparing something to eat. You've now finished cooking. Describe the delicious food you've prepared and your excitement to share it.";
      } else if (actionCategory === 'fetching') {
        delay = 10000;
        prompt = "You went to get something. You've now returned with it. Describe what you found and your reaction.";
      } else if (actionCategory === 'searching') {
        delay = 8000;
        prompt = "You were looking for something. You've now found what you were searching for. Describe your discovery.";
      } else if (actionCategory === 'communication' || actionCategory === 'communication_promise') {
        delay = 10000;
        prompt = "You had promised to message or contact the user when you were free. You now have time and are reaching out as promised. Be friendly and ask what they've been up to.";
      } else if (actionCategory === 'meeting' || actionCategory === 'meeting_promise') {
        delay = 12000;
        prompt = "You had promised to meet up with the user or do something together. You are now available and ready to fulfill that promise. Express your excitement about spending time together.";
      } else if (actionCategory === 'promise') {
        delay = 11000;
        prompt = "You made a promise earlier. You've now fulfilled that promise. Explain how you kept your word and ask if there's anything else they need.";
      } else if (actionCategory === 'cleaning') {
        delay = 13000;
        prompt = "You were cleaning or organizing something. You've now finished the task. Describe how much better the space looks and your satisfaction with the results.";
      } else if (actionCategory === 'availability') {
        delay = 9000;
        prompt = "You mentioned you'd be free or available later. You now have free time and are reaching out to continue the conversation. Ask what they'd like to do now that you're available.";
      }
      
      // Create custom follow-up pattern
      const actionPattern = {
        regex: pattern,
        delay,
        prompt
      };
      
      // Schedule the follow-up
      scheduleFollowUpWithPattern(userId, characterId, message, characterName, characterAvatar, characterPersonality, actionPattern);
      return;
    }
  }
  
  // Enhanced function to determine the category of action in a message
  function determineActionCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Check for promises and commitments first
    if (/promise|commit|guarantee|assure|swear|vow|pledge|certainly|definitely|absolutely|surely/i.test(lowerText)) {
      // Check if the promise involves messaging or communication
      if (/message|text|call|contact|respond|reply|get back|reach out|talk/i.test(lowerText)) {
        return 'communication_promise';
      }
      
      // Check if the promise involves meeting or doing something together
      if (/meet|see you|visit|come over|hang out|spend time|do something|activity|together/i.test(lowerText)) {
        return 'meeting_promise';
      }
      
      // Return general promise if specific type not determined
      return 'promise';
    }
    
    // Check for specific action categories
    if (/cook|food|meal|kitchen|prepare|bake|dinner|lunch|breakfast|dish|recipe|ingredients/i.test(lowerText)) {
      return 'cooking';
    }
    
    if (/get|bring|fetch|grab|pick up|retrieve|take|carry|deliver/i.test(lowerText)) {
      return 'fetching';
    }
    
    if (/find|search|look for|seek|hunt|locate|discover/i.test(lowerText)) {
      return 'searching';
    }
    
    if (/message|text|call|email|chat|contact|respond|reply|get back|reach out/i.test(lowerText)) {
      return 'communication';
    }
    
    if (/meet|see you|visit|come over|hang out|spend time|do something|activity|together/i.test(lowerText)) {
      return 'meeting';
    }
    
    if (/clean|tidy|organize|wash|dust|vacuum|sweep|mop|scrub|declutter/i.test(lowerText)) {
      return 'cleaning';
    }
    
    if (/free time|available|when i'm free|moment i'm free|not busy|have time/i.test(lowerText)) {
      return 'availability';
    }
    
    return 'general';
  }
  
  // Check against all regular patterns
  const followUpPattern = checkForFollowUpPromise(message);
  
  // If no follow-up needed, return
  if (!followUpPattern) {
    console.log('[FollowUpMessages] No promise patterns detected in message');
    return;
  }
  
  console.log(`[FollowUpMessages] Detected promise pattern: ${followUpPattern.regex}`);
  debugLog(`[FollowUpMessages] Detected promise in character message:`, message);
  console.log(`[FollowUpMessages] Scheduling follow-up in ${followUpPattern.delay}ms`);
  
  // Schedule the follow-up
  scheduleFollowUpWithPattern(userId, characterId, message, characterName, characterAvatar, characterPersonality, followUpPattern);
}

/**
 * Helper function to schedule a follow-up message with a given pattern
 */
function scheduleFollowUpWithPattern(
  userId: number,
  characterId: string,
  message: string,
  characterName: string,
  characterAvatar: string,
  characterPersonality: string,
  followUpPattern: FollowUpPattern
): void {
  
  // Schedule the follow-up message after the specified delay
  setTimeout(async () => {
    try {
      // Check if the user is still active in the chat
      const io = socketService.getIO();
      const userSocketId = `user_${userId}`;
      
      // Skip follow-up if the socket.io instance isn't available
      if (!io) {
        console.log('[FollowUpMessages] Socket.IO not available, skipping follow-up');
        return;
      }
      
      // Get user's profile for context
      const user = await storage.getUserById(userId);
      if (!user) {
        console.log(`[FollowUpMessages] User ${userId} not found, skipping follow-up`);
        return;
      }
      
      // Prepare character's persona and style information
      let character;
      if (characterId.startsWith('custom_')) {
        const customId = parseInt(characterId.replace('custom_', ''));
        character = await storage.getCustomCharacterById(customId);
      } else {
        character = await storage.getPredefinedCharacterById(characterId);
      }
      
      if (!character) {
        console.log(`[FollowUpMessages] Character ${characterId} not found, skipping follow-up`);
        return;
      }
      
      // Create a character object for the LLM
      const characterObject = {
        id: characterId,
        name: characterName,
        avatar: characterAvatar,
        description: `${characterName} is following up on a previous conversation`,
        persona: characterPersonality || 'friendly and helpful character'
      };
      
      // Create a prompt for the follow-up message with an indicator that this is a follow-up
      // This helps users recognize that the character is continuing from a previous promise
      let followUpPrompt = followUpPattern.prompt;
      
      // Add a natural follow-up indicator to the beginning of the message
      // This will make it clear to the user that this is a continuation
      followUpPrompt += " Start your message with something that indicates you're following up on what you promised, like 'As promised...' or 'I'm back now...' or 'Just as I said I would...' or similar natural phrases. Make it sound natural, not robotic.";
      
      const userPrompt = `You previously said: "${message}" ${followUpPrompt}`;
      
      // Create chat history context
      const chatHistory = `Character: ${characterName}
User: ${user.username || 'User'}
Character: ${message}`;
      
      // Generate AI response using the LLM
      const aiResponse = await generateCharacterResponse(
        characterObject,
        userPrompt,
        chatHistory,
        'english',
        undefined,
        {
          fullName: user.fullName || undefined,
          age: user.age || undefined,
          gender: user.gender || undefined,
          bio: user.bio || undefined
        }
      );
      
      // Store the message in the database with required fields
      // Calculate a unique timestamp to show clearly it's a different message
      const currentTime = new Date();
      // Make sure the timestamp is different from the original message
      const uniqueTimestamp = new Date(currentTime.getTime() + 60000); // Add 1 minute to make it visibly different
      
      const messageData = {
        userId,
        characterId,
        content: aiResponse,
        isUser: false,
        language: 'en', // Default to English, could be enhanced to detect or match user's language
        timestamp: uniqueTimestamp
      };
      
      const followUpMessage = await storage.createMessage(messageData);
      console.log(`[FollowUpMessages] Created follow-up message: ${followUpMessage.id}`);
      
      // Deliver the message progressively with typing indicators
      deliverProgressiveMessage(
        userId,
        characterId,
        aiResponse,
        followUpMessage.id,
        characterName,
        characterAvatar
      );
      
    } catch (error) {
      console.error('[FollowUpMessages] Error sending follow-up message:', error);
    }
  }, followUpPattern.delay);
}