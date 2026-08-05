import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine safe database path
// Vercel serverless: use /tmp (writable). Local: use project root.
let dbPath = path.resolve(process.cwd(), 'database.sqlite');

if (process.env.VERCEL) {
  dbPath = path.join(os.tmpdir(), 'database.sqlite');
}

// Open the database (better-sqlite3 is synchronous — no callback needed)
let db;
try {
  db = new Database(dbPath, { verbose: null });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log('Connected to SQLite database at:', dbPath);
} catch (err) {
  console.error('Failed to open database:', err.message);
  // Fallback to in-memory database if file open fails
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.warn('Falling back to in-memory SQLite database');
}

// -------------------------------------------------------------------
// Promisified-compatible helpers (keep same API as before)
// better-sqlite3 is sync, but we wrap in Promise for drop-in compat
// -------------------------------------------------------------------

export const query = (sql, params = []) => {
  try {
    const rows = db.prepare(sql).all(params);
    return Promise.resolve(rows);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getOne = (sql, params = []) => {
  try {
    const row = db.prepare(sql).get(params);
    return Promise.resolve(row);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const run = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(params);
    return Promise.resolve({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    return Promise.reject(err);
  }
};

let dbInitialized = false;
let dbInitPromise = null;

export const initDb = async () => {
  if (dbInitialized) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          avatar TEXT,
          role TEXT DEFAULT 'Product Manager',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#4F46E5',
          icon TEXT DEFAULT 'layout-kanban',
          owner_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS project_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'member',
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, user_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS project_invitations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          email TEXT NOT NULL,
          role TEXT DEFAULT 'member',
          invited_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, email),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS columns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          color TEXT DEFAULT '#64748B',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          column_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          priority TEXT DEFAULT 'medium',
          due_date DATE,
          position INTEGER DEFAULT 0,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS task_assignees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          UNIQUE(task_id, user_id),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS checklists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          sender_id INTEGER,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          task_id INTEGER,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Seed default data if database is fresh
      const userCount = await getOne('SELECT COUNT(*) as count FROM users');
      if (userCount.count === 0) {
        console.log('Seeding initial database data...');
        const hashedPass = await bcrypt.hash('password123', 10);

        const user1 = await run(
          'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
          ['Alex Rivera', 'alex@example.com', hashedPass, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Product Lead']
        );
        const user2 = await run(
          'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
          ['Sarah Connor', 'sarah@example.com', hashedPass, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 'Senior Fullstack Dev']
        );
        const user3 = await run(
          'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
          ['Michael Chen', 'michael@example.com', hashedPass, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'UI/UX Designer']
        );

        const proj = await run(
          'INSERT INTO projects (name, description, color, icon, owner_id) VALUES (?, ?, ?, ?, ?)',
          [
            'Rocket Launch App v2',
            'Collaborative task board for launching the next-generation web client and mobile dashboard.',
            '#6366F1',
            'rocket',
            user1.id
          ]
        );

        await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj.id, user1.id, 'owner']);
        await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj.id, user2.id, 'admin']);
        await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj.id, user3.id, 'member']);

        const col1 = await run('INSERT INTO columns (project_id, title, position, color) VALUES (?, ?, ?, ?)', [proj.id, 'Backlog', 0, '#64748B']);
        const col2 = await run('INSERT INTO columns (project_id, title, position, color) VALUES (?, ?, ?, ?)', [proj.id, 'In Progress', 1, '#3B82F6']);
        const col3 = await run('INSERT INTO columns (project_id, title, position, color) VALUES (?, ?, ?, ?)', [proj.id, 'Review & QA', 2, '#F59E0B']);
        const col4 = await run('INSERT INTO columns (project_id, title, position, color) VALUES (?, ?, ?, ?)', [proj.id, 'Done', 3, '#10B981']);

        const task1 = await run(
          'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [col2.id, proj.id, 'Implement WebSocket Real-Time Sync', 'Connect Socket.IO rooms to broadcast drag-and-drop actions and new task cards across connected browsers instantly.', 'urgent', '2026-07-30', 0, user1.id]
        );
        const task2 = await run(
          'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [col2.id, proj.id, 'Design Glassmorphism Dashboard UI', 'Craft a sleek dark theme with vibrant accents, responsive cards, and smooth micro-animations.', 'high', '2026-07-28', 1, user3.id]
        );
        const task3 = await run(
          'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [col1.id, proj.id, 'Setup OAuth 2.0 & Social Logins', 'Integrate GitHub and Google sign-in options alongside standard JWT auth.', 'medium', '2026-08-05', 0, user2.id]
        );
        const task4 = await run(
          'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [col3.id, proj.id, 'Audit Database Queries & Indexes', 'Optimize SQLite queries and ensure foreign key cascade constraints function properly.', 'high', '2026-07-27', 0, user2.id]
        );
        const task5 = await run(
          'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [col4.id, proj.id, 'Initialize Monorepo Structure', 'Configure Express server, Vite React frontend, and concurrently script runner.', 'low', '2026-07-26', 0, user1.id]
        );

        await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [task1.id, user2.id]);
        await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [task1.id, user1.id]);
        await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [task2.id, user3.id]);
        await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [task4.id, user2.id]);

        await run('INSERT INTO checklists (task_id, title, completed) VALUES (?, ?, ?)', [task1.id, 'Setup Socket.IO server room handler', 1]);
        await run('INSERT INTO checklists (task_id, title, completed) VALUES (?, ?, ?)', [task1.id, 'Emit task_moved events on drag finish', 1]);
        await run('INSERT INTO checklists (task_id, title, completed) VALUES (?, ?, ?)', [task1.id, 'Handle user presence and online indicators', 0]);
        await run('INSERT INTO checklists (task_id, title, completed) VALUES (?, ?, ?)', [task2.id, 'Color tokens & Tailwind theme config', 1]);
        await run('INSERT INTO checklists (task_id, title, completed) VALUES (?, ?, ?)', [task2.id, 'Modal animations & slide-in drawers', 0]);

        await run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', [
          task1.id, user2.id, 'Socket server room handlers are ready! Broadcast testing looks ultra-fast.'
        ]);
        await run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', [
          task1.id, user1.id, 'Awesome work Sarah! Make sure to notify assignees when someone comments.'
        ]);

        await run('INSERT INTO notifications (user_id, sender_id, type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          user2.id, user1.id, 'task_assigned', 'Assigned to Task',
          'Alex Rivera assigned you to "Implement WebSocket Real-Time Sync"', 'task', task1.id
        ]);

        console.log('Database seeded successfully!');
      }

      dbInitialized = true;
    } catch (err) {
      dbInitialized = false;
      console.error('Database initialization error:', err);
      throw err;
    } finally {
      dbInitPromise = null;
    }
  })();

  return dbInitPromise;
};

export default db;
