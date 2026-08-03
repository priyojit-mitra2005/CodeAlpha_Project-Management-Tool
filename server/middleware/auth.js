import jwt from 'jsonwebtoken';
import { getOne } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-secure-key-pm-tool-2026-v1';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err || !user || !user.id) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Check if a user is an owner or member of a given project
 */
export const isProjectMember = async (projectId, userId) => {
  if (!projectId || !userId) return false;
  const project = await getOne('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
  if (!project) return false;
  if (project.owner_id === userId) return true;

  const member = await getOne(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  return !!member;
};

/**
 * Check if a user is the owner of a given project
 */
export const isProjectOwner = async (projectId, userId) => {
  if (!projectId || !userId) return false;
  const project = await getOne('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
  return project && project.owner_id === userId;
};

