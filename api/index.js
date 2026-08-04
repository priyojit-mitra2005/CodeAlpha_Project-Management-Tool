import app from '../server/index.js';
import { initDb } from '../server/db.js';

export default async function handler(req, res) {
  try {
    await initDb();
  } catch (err) {
    console.error('Vercel serverless DB initialization error:', err);
  }
  return app(req, res);
}
