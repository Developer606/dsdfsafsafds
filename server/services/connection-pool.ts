/**
 * Connection pool service for database connections
 * Provides optimized SQLite connections for high concurrency
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

// Pool configuration
const DEFAULT_POOL_SIZE = 8; // Number of connections in the pool
const MAX_POOL_SIZE = 32;    // Maximum pool size during high load
const MIN_IDLE = 2;          // Minimum number of idle connections
const POOL_TIMEOUT = 30000;  // Connection timeout (30 seconds)

// Type for the Database instance
type SqliteDatabase = ReturnType<typeof Database>;

// Monitor connection use
interface ConnectionStats {
  created: number;
  acquired: number;
  released: number;
  destroyed: number;
  idle: number;
  active: number;
}

class ConnectionPool {
  private pool: SqliteDatabase[] = [];
  private activeConnections: Map<SqliteDatabase, boolean> = new Map();
  private maxPoolSize: number;
  private stats: ConnectionStats = {
    created: 0,
    acquired: 0,
    released: 0,
    destroyed: 0,
    idle: 0,
    active: 0
  };

  constructor(maxPoolSize = DEFAULT_POOL_SIZE) {
    this.maxPoolSize = maxPoolSize;
    this.initializePool(MIN_IDLE);
  }

  private initializePool(size: number): void {
    for (let i = 0; i < size; i++) {
      this.createConnection();
    }
  }

  private createConnection(): SqliteDatabase {
    // Configure SQLite with WAL mode for better concurrency
    const sqlite = new Database("sqlite.db", {
      fileMustExist: false,
    });

    // Enable WAL mode and other optimizations
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    sqlite.pragma("cache_size = -64000"); // 64MB cache
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("temp_store = MEMORY"); // Store temp tables in memory
    
    // Add to pool
    this.pool.push(sqlite);
    this.activeConnections.set(sqlite, false);
    this.stats.created++;
    this.stats.idle++;
    
    return sqlite;
  }

  /**
   * Get a connection from the pool
   */
  public getConnection(): SqliteDatabase {
    // Check for available connections
    for (const conn of this.pool) {
      if (!this.activeConnections.get(conn)) {
        this.activeConnections.set(conn, true);
        this.stats.acquired++;
        this.stats.active++;
        this.stats.idle--;
        return conn;
      }
    }
    
    // If pool not maxed out, create new connection
    if (this.pool.length < this.maxPoolSize) {
      const conn = this.createConnection();
      this.activeConnections.set(conn, true);
      this.stats.acquired++;
      this.stats.active++;
      this.stats.idle--;
      return conn;
    }
    
    // Wait for a connection to become available
    console.warn("Connection pool exhausted, waiting for available connection");
    return this.pool[0]; // For now return the first connection as a fallback
  }

  /**
   * Release a connection back to the pool
   */
  public releaseConnection(conn: SqliteDatabase): void {
    if (this.activeConnections.has(conn)) {
      this.activeConnections.set(conn, false);
      this.stats.released++;
      this.stats.active--;
      this.stats.idle++;
    }
  }

  /**
   * Get a Drizzle ORM instance with a connection from the pool
   */
  public getDrizzleInstance() {
    const conn = this.getConnection();
    const drizzleInstance = drizzle(conn, { schema });
    
    // Return both the connection and instance for proper release
    return { 
      db: drizzleInstance, 
      release: () => this.releaseConnection(conn)
    };
  }

  /**
   * Close all connections in the pool
   */
  public closeAll(): void {
    for (const conn of this.pool) {
      try {
        conn.close();
        this.stats.destroyed++;
      } catch (error) {
        console.error("Error closing connection:", error);
      }
    }
    this.pool = [];
    this.activeConnections.clear();
    this.stats.active = 0;
    this.stats.idle = 0;
  }

  /**
   * Get pool statistics
   */
  public getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Resize the pool (for load adaptation)
   */
  public resize(newMaxSize: number): void {
    const constrainedSize = Math.min(Math.max(newMaxSize, MIN_IDLE), MAX_POOL_SIZE);
    this.maxPoolSize = constrainedSize;
    
    // If we need to grow the pool
    if (this.pool.length < MIN_IDLE) {
      this.initializePool(MIN_IDLE - this.pool.length);
    }
    
    // If we need to shrink the pool, we'll let it happen naturally
    // as connections are released
  }
}

// Export a singleton instance
export const connectionPool = new ConnectionPool();

/**
 * Execute a callback with a database connection that's automatically released
 */
export async function withConnection<T>(
  callback: (db: any) => Promise<T>
): Promise<T> {
  const { db, release } = connectionPool.getDrizzleInstance();
  
  try {
    return await callback(db);
  } finally {
    release();
  }
}