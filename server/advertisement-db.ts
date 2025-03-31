import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { 
  advertisements,
  advertisementMetrics,
  type Advertisement,
  type InsertAdvertisement,
  type AdvertisementMetric,
  type InsertAdvertisementMetric
} from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const advertisementSqlite = new Database(path.join(dataDir, 'advertisement.db'));
export const advertisementDb = drizzle(advertisementSqlite);

// Initialize the advertisement database schema
export async function initializeAdvertisementDb(): Promise<void> {
  console.log("Initializing advertisement database...");
  
  // Create advertisements table
  advertisementSqlite.exec(`
    CREATE TABLE IF NOT EXISTS advertisements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      button_text TEXT DEFAULT 'Learn More',
      button_link TEXT NOT NULL,
      button_style TEXT DEFAULT 'primary',
      background_color TEXT DEFAULT '#8B5CF6',
      text_color TEXT DEFAULT '#FFFFFF',
      position INTEGER DEFAULT 0,
      animation_type TEXT DEFAULT 'fade',
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0
    )
  `);
  
  // Create advertisement metrics table
  advertisementSqlite.exec(`
    CREATE TABLE IF NOT EXISTS advertisement_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      advertisement_id INTEGER NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      device_type TEXT,
      browser_info TEXT,
      FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE
    )
  `);
  
  // Create indices for better performance
  advertisementSqlite.exec('CREATE INDEX IF NOT EXISTS idx_advertisements_is_active ON advertisements(is_active)');
  advertisementSqlite.exec('CREATE INDEX IF NOT EXISTS idx_advertisements_start_date ON advertisements(start_date)');
  advertisementSqlite.exec('CREATE INDEX IF NOT EXISTS idx_advertisements_end_date ON advertisements(end_date)');
  advertisementSqlite.exec('CREATE INDEX IF NOT EXISTS idx_advertisements_position ON advertisements(position)');
  advertisementSqlite.exec('CREATE INDEX IF NOT EXISTS idx_advertisement_metrics_advertisement_id ON advertisement_metrics(advertisement_id)');
  
  console.log("Advertisement database initialized successfully");
}

// Advertisement CRUD Operations
export async function createAdvertisementInDb(data: InsertAdvertisement): Promise<Advertisement> {
  // Ensure dates are properly converted
  const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
  const endDate = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
  
  const [advertisement] = await advertisementDb
    .insert(advertisements)
    .values({
      ...data,
      startDate,
      endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  
  return advertisement;
}

export async function getAllAdvertisementsFromDb(): Promise<Advertisement[]> {
  return await advertisementDb
    .select()
    .from(advertisements)
    .orderBy(advertisements.position, advertisements.createdAt);
}

export async function getActiveAdvertisementsFromDb(): Promise<Advertisement[]> {
  // Convert the current date to a timestamp string to avoid binding Date objects
  const now = new Date();
  const nowTimestamp = now.toISOString();
  
  console.log("Fetching active advertisements with timestamp:", nowTimestamp);
  
  return await advertisementDb
    .select()
    .from(advertisements)
    .where(
      sql`${advertisements.isActive} = 1 AND 
          ${advertisements.startDate} <= ${nowTimestamp} AND 
          ${advertisements.endDate} >= ${nowTimestamp}`
    )
    .orderBy(advertisements.position);
}

export async function getAdvertisementByIdFromDb(id: number): Promise<Advertisement | undefined> {
  const [advertisement] = await advertisementDb
    .select()
    .from(advertisements)
    .where(sql`${advertisements.id} = ${id}`);
  
  return advertisement;
}

export async function updateAdvertisementInDb(id: number, data: Partial<InsertAdvertisement>): Promise<Advertisement> {
  // Handle date fields if provided
  const updateData: any = { ...data, updatedAt: new Date() };
  
  if (data.startDate) {
    updateData.startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
  }
  
  if (data.endDate) {
    updateData.endDate = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
  }
  
  const [advertisement] = await advertisementDb
    .update(advertisements)
    .set(updateData)
    .where(sql`${advertisements.id} = ${id}`)
    .returning();
  
  return advertisement;
}

export async function deleteAdvertisementFromDb(id: number): Promise<void> {
  await advertisementDb
    .delete(advertisements)
    .where(sql`${advertisements.id} = ${id}`);
}

export async function recordAdvertisementMetricInDb(data: InsertAdvertisementMetric): Promise<AdvertisementMetric> {
  const [metric] = await advertisementDb
    .insert(advertisementMetrics)
    .values(data)
    .returning();
  
  return metric;
}

export async function getAdvertisementMetricsFromDb(advertisementId: number): Promise<AdvertisementMetric[]> {
  return await advertisementDb
    .select()
    .from(advertisementMetrics)
    .where(sql`${advertisementMetrics.advertisementId} = ${advertisementId}`)
    .orderBy(sql`${advertisementMetrics.timestamp} DESC`);
}

export async function incrementAdvertisementStatInDb(advertisementId: number, stat: 'impressions' | 'clicks'): Promise<void> {
  if (stat === 'impressions') {
    await advertisementDb
      .update(advertisements)
      .set({
        impressions: sql`${advertisements.impressions} + 1`,
      })
      .where(sql`${advertisements.id} = ${advertisementId}`);
  } else if (stat === 'clicks') {
    await advertisementDb
      .update(advertisements)
      .set({
        clicks: sql`${advertisements.clicks} + 1`,
      })
      .where(sql`${advertisements.id} = ${advertisementId}`);
  }
}

export async function getAdvertisementPerformanceFromDb(advertisementId?: number): Promise<{
  impressions: number;
  clicks: number;
  ctr: number;
  advertisementId?: number;
}> {
  if (advertisementId) {
    // Get performance for a specific advertisement
    const [ad] = await advertisementDb
      .select({
        impressions: advertisements.impressions,
        clicks: advertisements.clicks,
      })
      .from(advertisements)
      .where(sql`${advertisements.id} = ${advertisementId}`);
    
    if (!ad) {
      return { impressions: 0, clicks: 0, ctr: 0, advertisementId };
    }
    
    const impressions = Number(ad.impressions || 0);
    const clicks = Number(ad.clicks || 0);
    
    return {
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      advertisementId,
    };
  } else {
    // Get overall performance for all advertisements
    const result = await advertisementDb
      .select({
        totalImpressions: sql`SUM(${advertisements.impressions})`,
        totalClicks: sql`SUM(${advertisements.clicks})`,
      })
      .from(advertisements);
    
    const totalImpressions = Number(result[0]?.totalImpressions || 0);
    const totalClicks = Number(result[0]?.totalClicks || 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    return { impressions: totalImpressions, clicks: totalClicks, ctr };
  }
}