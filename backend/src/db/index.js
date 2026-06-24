import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let database;

function getDb() {
  if (!database) throw new Error('Database not initialized. Call initDb() first.');
  return database;
}

function saveDb() {
  const data = getDb().export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function migrateUsersUsername() {
  const db = getDb();
  let hasUsername = false;
  try {
    const info = db.exec('PRAGMA table_info(users)');
    if (info.length > 0) {
      const nameIndex = info[0].columns.indexOf('name');
      hasUsername = info[0].values.some(row => row[nameIndex] === 'username');
    }
  } catch {
    return;
  }

  if (hasUsername) return;

  db.run('ALTER TABLE users ADD COLUMN username TEXT');

  const stmt = db.prepare('SELECT id, email, display_name FROM users WHERE username IS NULL OR username = ?');
  stmt.bind(['']);
  const users = [];
  while (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    const row = {};
    for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
    users.push(row);
  }
  stmt.free();

  const taken = new Set(
    users
      .map(u => u.username)
      .filter(Boolean)
      .map(u => String(u).toLowerCase()),
  );

  const slugify = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_|_$/g, '') || 'user';

  const reserveUsername = (base) => {
    let candidate = base;
    let n = 1;
    while (taken.has(candidate.toLowerCase())) {
      candidate = `${base}${n}`;
      n += 1;
    }
    taken.add(candidate.toLowerCase());
    return candidate;
  };

  for (const user of users) {
    const base = slugify(user.display_name) || slugify(user.email?.split('@')[0]) || `user${user.id}`;
    const username = reserveUsername(base);
    db.run('UPDATE users SET username = ? WHERE id = ?', [username, user.id]);
  }

  try {
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  } catch (err) {
    console.warn('Database migration (users.username index) failed:', err.message);
  }
}

function migrateDb() {
  const db = getDb();
  migrateUsersUsername();
  let hasTmdbColumn = false;
  try {
    const info = db.exec('PRAGMA table_info(shows)');
    if (info.length > 0) {
      const nameIndex = info[0].columns.indexOf('name');
      hasTmdbColumn = info[0].values.some(row => row[nameIndex] === 'tmdb_id');
    }
  } catch {
    return;
  }

  if (!hasTmdbColumn) return;

  try {
    db.run('DROP INDEX IF EXISTS idx_shows_tmdb_type');
    db.run('ALTER TABLE shows DROP COLUMN tmdb_id');
  } catch (err) {
    console.warn('Database migration (drop tmdb_id) failed:', err.message);
  }
}

export async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    database = new SQL.Database(buf);
  } else {
    database = new SQL.Database();
  }

  database.run('PRAGMA journal_mode = WAL');
  database.run('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  database.run(schema);
  migrateDb();
  saveDb();

  setInterval(saveDb, 5000);

  return database;
}

class PreparedStatement {
  constructor(sql) {
    this.sql = sql;
  }

  get(...params) {
    const db = getDb();
    const stmt = db.prepare(this.sql);
    const bound = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    stmt.bind(bound);
    let row = null;
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      row = {};
      for (let i = 0; i < cols.length; i++) {
        row[cols[i]] = vals[i];
      }
    }
    stmt.free();
    return row;
  }

  all(...params) {
    const db = getDb();
    const stmt = db.prepare(this.sql);
    const bound = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    stmt.bind(bound);
    const rows = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
      const vals = stmt.get();
      const row = {};
      for (let i = 0; i < cols.length; i++) {
        row[cols[i]] = vals[i];
      }
      rows.push(row);
    }
    stmt.free();
    return rows;
  }

  run(...params) {
    const db = getDb();
    const bound = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    db.run(this.sql, bound);
    const changes = db.getRowsModified();
    const lastRow = db.exec('SELECT last_insert_rowid() AS id');
    const lastInsertRowid = lastRow.length > 0 ? lastRow[0].values[0][0] : 0;
    saveDb();
    return { changes, lastInsertRowid };
  }
}

const db = {
  prepare(sql) {
    return new PreparedStatement(sql);
  },
  exec(sql) {
    getDb().run(sql);
    saveDb();
  },
  pragma(str) {
    getDb().run(`PRAGMA ${str}`);
  },
};

export default db;
