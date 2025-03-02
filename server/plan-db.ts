import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// Configure SQLite with WAL mode for better concurrency
const sqlite = new Database('plans.db', {
  fileMustExist: false,
});

// Enable WAL mode and other optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000'); // 64MB cache
sqlite.pragma('foreign_keys = ON');

// Create connection
export const planDb = drizzle(sqlite, { schema });

// Function to initialize default plans if needed
export async function initializePlans() {
  console.log('Checking for existing plans...');
  try {
    // Create subscription plans table if it doesn't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        features TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    // Check if any plans exist
    const existingPlans = sqlite.prepare("SELECT COUNT(*) as count FROM subscription_plans").get();

    if (existingPlans.count === 0) {
      // Insert default plans with updated pricing and features
      const defaultPlans = [
        {
          id: 'basic',
          name: 'Basic Plan',
          price: '$2.99',
          features: JSON.stringify([
            'Create up to 5 characters',
            'Basic character customization',
            'Standard support',
          ])
        },
        {
          id: 'premium',
          name: 'Premium Plan',
          price: '$9.99',
          features: JSON.stringify([
            'Unlimited character creation',
            'Advanced character customization',
            'Priority support',
            'Early access to new features',
          ])
        },
        {
          id: 'pro',
          name: 'Pro Plan',
          price: '$19.99',
          features: JSON.stringify([
            'Everything in Premium',
            'Custom character API access',
            'Dedicated support',
            'White-label option',
            'Team collaboration features',
          ])
        }
      ];

      const insert = sqlite.prepare(
        'INSERT INTO subscription_plans (id, name, price, features) VALUES (@id, @name, @price, @features)'
      );

      const insertPlans = sqlite.transaction(() => {
        for (const plan of defaultPlans) {
          insert.run(plan);
        }
      });

      insertPlans();
      console.log('Default plans initialized');
    } else {
      console.log('Plans already exist in the database');
    }
  } catch (error) {
    console.error('Error initializing plans:', error);
    throw error;
  }
}