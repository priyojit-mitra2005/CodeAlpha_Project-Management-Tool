import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, getOne, query } from '../db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    const result = await run(
      'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, avatar, role || 'Member']
    );

    const user = { id: result.id, name, email, avatar, role: role || 'Member' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userDB = await getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!userDB) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, userDB.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = {
      id: userDB.id,
      name: userDB.name,
      email: userDB.email,
      avatar: userDB.avatar,
      role: userDB.role
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userDB = await getOne('SELECT id, name, email, avatar, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!userDB) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userDB);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// List all users (for project member invitation and task assignment)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const search = req.query.search || '';
    const users = await query(
      'SELECT id, name, email, avatar, role FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY name ASC',
      [`%${search}%`, `%${search}%`]
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;
