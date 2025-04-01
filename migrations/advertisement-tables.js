import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sqlite.db');

console.log('Running advertisement tables migrations...');

// Create advertisements table
db.run(`
  CREATE TABLE IF NOT EXISTS advertisements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    video_url TEXT,
    media_type TEXT DEFAULT 'image',
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
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0
  )
`, function(err) {
  if (err) {
    console.error('Error creating advertisements table:', err.message);
    return;
  }
  
  console.log('Advertisement table created successfully');
  
  // Create indices for advertisements table
  db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_is_active ON advertisements(is_active)', createMetricsTable);
  db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_start_date ON advertisements(start_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_end_date ON advertisements(end_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_advertisements_position ON advertisements(position)');
});

function createMetricsTable(err) {
  if (err) {
    console.error('Error creating advertisement indices:', err.message);
    return;
  }
  
  console.log('Advertisement indices created successfully');
  
  // Create advertisement metrics table
  db.run(`
    CREATE TABLE IF NOT EXISTS advertisement_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      advertisement_id INTEGER NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      device_type TEXT,
      browser_info TEXT,
      FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, createMetricsIndices);
}

function createMetricsIndices(err) {
  if (err) {
    console.error('Error creating advertisement_metrics table:', err.message);
    return;
  }
  
  console.log('Advertisement metrics table created successfully');
  
  // Create indices for advertisement_metrics table
  db.run('CREATE INDEX IF NOT EXISTS idx_advertisement_metrics_advertisement_id ON advertisement_metrics(advertisement_id)', finish);
  db.run('CREATE INDEX IF NOT EXISTS idx_advertisement_metrics_user_id ON advertisement_metrics(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_advertisement_metrics_action ON advertisement_metrics(action)');
}

function finish(err) {
  if (err) {
    console.error('Error creating advertisement_metrics indices:', err.message);
    return;
  }
  
  console.log('Advertisement metrics indices created successfully');
  console.log('Advertisement migrations completed successfully');
  
  // Close the database connection
  db.close();
}