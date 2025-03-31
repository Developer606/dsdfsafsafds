import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';

// Create PostgreSQL connection using the DATABASE_URL environment variable
const sql = postgres(process.env.DATABASE_URL || '');
const pgDb = drizzle(sql);

/**
 * Ensure the PostgreSQL database has the necessary tables and indexes for characters
 */
export async function initializePostgresCharacterDb() {
  console.log('Initializing PostgreSQL character database...');
  try {
    // Create predefined_characters table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS predefined_characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        description TEXT NOT NULL,
        persona TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_predefined_chars_name 
      ON predefined_characters(name)
    `;

    console.log('PostgreSQL character database initialized successfully');
  } catch (error) {
    console.error('Error initializing PostgreSQL character database:', error);
    throw error;
  }
}

/**
 * Get all predefined characters from the PostgreSQL database
 */
export async function getAllPredefinedCharactersFromPg(): Promise<schema.PredefinedCharacter[]> {
  try {
    const characters = await sql<schema.PredefinedCharacter[]>`
      SELECT 
        id, 
        name, 
        avatar, 
        description, 
        persona, 
        created_at as "createdAt" 
      FROM predefined_characters
    `;
    
    // Ensure createdAt is a proper Date object
    return characters.map(char => ({
      ...char,
      createdAt: new Date(char.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching predefined characters from PostgreSQL:', error);
    return [];
  }
}

/**
 * Get a predefined character by ID from the PostgreSQL database
 */
export async function getPredefinedCharacterByIdFromPg(id: string): Promise<schema.PredefinedCharacter | undefined> {
  try {
    const characters = await sql<schema.PredefinedCharacter[]>`
      SELECT 
        id, 
        name, 
        avatar, 
        description, 
        persona, 
        created_at as "createdAt" 
      FROM predefined_characters
      WHERE id = ${id}
    `;
    
    if (characters.length === 0) {
      return undefined;
    }
    
    const character = characters[0];
    
    // Ensure createdAt is a proper Date object
    return {
      ...character,
      createdAt: new Date(character.createdAt)
    };
  } catch (error) {
    console.error(`Error fetching predefined character with ID ${id} from PostgreSQL:`, error);
    return undefined;
  }
}

/**
 * Create a new predefined character in the PostgreSQL database
 */
export async function createPredefinedCharacterInPg(
  character: schema.InsertPredefinedCharacter
): Promise<schema.PredefinedCharacter> {
  try {
    const now = new Date();
    const result = await sql<schema.PredefinedCharacter[]>`
      INSERT INTO predefined_characters (id, name, avatar, description, persona, created_at)
      VALUES (
        ${character.id},
        ${character.name},
        ${character.avatar},
        ${character.description},
        ${character.persona},
        ${now}
      )
      RETURNING id, name, avatar, description, persona, created_at as "createdAt"
    `;

    if (result.length === 0) {
      throw new Error('Failed to create predefined character in PostgreSQL');
    }

    return {
      ...result[0],
      createdAt: new Date(result[0].createdAt)
    };
  } catch (error) {
    console.error('Error creating predefined character in PostgreSQL:', error);
    throw error;
  }
}

/**
 * Update a predefined character in the PostgreSQL database
 */
export async function updatePredefinedCharacterInPg(
  id: string,
  character: Partial<schema.InsertPredefinedCharacter>
): Promise<schema.PredefinedCharacter> {
  try {
    // Get the current character to verify it exists
    const currentCharacter = await getPredefinedCharacterByIdFromPg(id);
    if (!currentCharacter) {
      throw new Error(`Character with ID ${id} not found in PostgreSQL`);
    }

    // Check which fields need to be updated
    const hasUpdates = 
      character.name !== undefined || 
      character.avatar !== undefined || 
      character.description !== undefined || 
      character.persona !== undefined;
    
    if (!hasUpdates) {
      return currentCharacter; // No updates to make
    }
    
    // Construct the SET clause for each field individually
    let result: schema.PredefinedCharacter[] = [];
    
    if (character.name !== undefined) {
      result = await sql<schema.PredefinedCharacter[]>`
        UPDATE predefined_characters
        SET name = ${character.name}
        WHERE id = ${id}
        RETURNING id, name, avatar, description, persona, created_at as "createdAt"
      `;
    }
    
    if (character.avatar !== undefined) {
      result = await sql<schema.PredefinedCharacter[]>`
        UPDATE predefined_characters
        SET avatar = ${character.avatar}
        WHERE id = ${id}
        RETURNING id, name, avatar, description, persona, created_at as "createdAt"
      `;
    }
    
    if (character.description !== undefined) {
      result = await sql<schema.PredefinedCharacter[]>`
        UPDATE predefined_characters
        SET description = ${character.description}
        WHERE id = ${id}
        RETURNING id, name, avatar, description, persona, created_at as "createdAt"
      `;
    }
    
    if (character.persona !== undefined) {
      result = await sql<schema.PredefinedCharacter[]>`
        UPDATE predefined_characters
        SET persona = ${character.persona}
        WHERE id = ${id}
        RETURNING id, name, avatar, description, persona, created_at as "createdAt"
      `;
    }

    if (result.length === 0) {
      throw new Error(`Failed to update character with ID ${id}`);
    }

    return {
      ...result[0],
      createdAt: new Date(result[0].createdAt)
    };
  } catch (error) {
    console.error(`Error updating predefined character with ID ${id} in PostgreSQL:`, error);
    throw error;
  }
}

/**
 * Delete a predefined character from the PostgreSQL database
 */
export async function deletePredefinedCharacterFromPg(id: string): Promise<void> {
  try {
    await sql`
      DELETE FROM predefined_characters
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error(`Error deleting predefined character with ID ${id} from PostgreSQL:`, error);
    throw error;
  }
}