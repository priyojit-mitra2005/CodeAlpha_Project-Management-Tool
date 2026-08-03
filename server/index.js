import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { initSocket } from './socket.js';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import notificationRoutes from './routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// Initialize Database helper
export const initApp = async () => {
  await initDb();
};

// Auto initialize for standalone server
if (!process.env.VERCEL) {
  await initApp();
}

// Initialize WebSockets
initSocket(server);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
});

// Global JSON Error Handler (Prevents HTML stack traces from breaking res.json() on client)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Only start listener if running standalone (not on Vercel)
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Project Management Tool server running on http://localhost:${PORT}`);
  });
}

export default app;

