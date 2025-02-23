import { type Sticker as StickerType, stickers } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface StickerPickerProps {
  onStickerSelect: (sticker: StickerType) => void;
}

export function StickerPicker({ onStickerSelect }: StickerPickerProps) {
  return (
    <Tabs defaultValue={stickers.categories[0].id} className="w-80">
      <TabsList className="grid grid-cols-2">
        {stickers.categories.map((category) => (
          <TabsTrigger 
            key={category.id} 
            value={category.id}
            className="text-sm"
          >
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {stickers.categories.map((category) => (
        <TabsContent 
          key={category.id} 
          value={category.id} 
          className="mt-2"
        >
          <ScrollArea className="h-[300px] p-2">
            <div className="grid grid-cols-4 gap-2">
              {category.stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => onStickerSelect({
                    id: sticker.id,
                    url: sticker.url,
                    category: sticker.category,
                    keywords: [...sticker.keywords]
                  })}
                  className={cn(
                    "p-2 rounded-lg hover:bg-accent transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                >
                  <img 
                    src={sticker.url} 
                    alt={sticker.keywords.join(', ')}
                    className="w-full aspect-square object-contain"
                  />
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  );
}