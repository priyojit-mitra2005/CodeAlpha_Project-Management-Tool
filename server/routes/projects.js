import express from 'express';
import { run, getOne, query } from '../db.js';
import { authenticateToken, isProjectMember } from '../middleware/auth.js';
import { sendProjectInvitationEmail } from '../services/email.js';

const router = express.Router();

// Get all projects where user is owner or member
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await query(
      `SELECT DISTINCT p.*, u.name as owner_name, u.avatar as owner_avatar,
              (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
              (SELECT COUNT(*) FROM tasks t JOIN columns c ON t.column_id = c.id WHERE t.project_id = p.id AND c.title = 'Done') as completed_tasks
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner_id = ? OR pm.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId, userId]
    );

    res.json(projects);
  } catch (err) {
    console.error('Fetch projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projResult = await run(
      'INSERT INTO projects (name, description, color, icon, owner_id) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', color || '#6366F1', icon || 'layout-kanban', userId]
    );
    const projectId = projResult.id;

    // Add owner to project_members
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [projectId, userId, 'owner']);

    // Create default columns
    const defaultCols = [
      { title: 'Backlog', color: '#64748B' },
      { title: 'To Do', color: '#3B82F6' },
      { title: 'In Progress', color: '#8B5CF6' },
      { title: 'In Review', color: '#F59E0B' },
      { title: 'Done', color: '#10B981' }
    ];

    for (let i = 0; i < defaultCols.length; i++) {
      await run('INSERT INTO columns (project_id, title, position, color) VALUES (?, ?, ?, ?)', [
        projectId,
        defaultCols[i].title,
        i,
        defaultCols[i].color
      ]);
    }

    // Log activity
    await run('INSERT INTO activity_log (project_id, user_id, action, details) VALUES (?, ?, ?, ?)', [
      projectId,
      userId,
      'created_project',
      `Created project "${name}"`
    ]);

    const createdProject = await getOne('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?', [projectId]);
    res.status(201).json(createdProject);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get full project details including columns, tasks, members, assignees
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    // Check membership
    const memberCheck = await getOne(
      'SELECT id, role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    const project = await getOne(
      'SELECT p.*, u.name as owner_name, u.avatar as owner_avatar FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?',
      [projectId]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.owner_id !== userId && !memberCheck) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Fetch members
    const members = await query(
      `SELECT u.id, u.name, u.email, u.avatar, u.role as user_role, pm.role as project_role, pm.joined_at, 0 as is_pending
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?
       ORDER BY pm.joined_at ASC`,
      [projectId]
    );

    // Fetch pending email invitations
    const pendingInvites = await query(
      `SELECT id, email as name, email, role as project_role, created_at as joined_at, 1 as is_pending
       FROM project_invitations
       WHERE project_id = ?`,
      [projectId]
    );

    const allMembers = [
      ...members,
      ...pendingInvites.map(inv => ({
        ...inv,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inv.email)}`
      }))
    ];

    // Fetch columns
    const columns = await query(
      'SELECT * FROM columns WHERE project_id = ? ORDER BY position ASC',
      [projectId]
    );

    // Fetch all tasks for this project
    const tasks = await query(
      `SELECT t.*, u.name as creator_name, u.avatar as creator_avatar
       FROM tasks t
       JOIN users u ON t.created_by = u.id
       WHERE t.project_id = ?
       ORDER BY t.position ASC`,
      [projectId]
    );

    // Fetch task assignees, checklists, and comment counts for each task
    for (let task of tasks) {
      task.assignees = await query(
        `SELECT u.id, u.name, u.avatar, u.email
         FROM task_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = ?`,
        [task.id]
      );

      task.checklists = await query(
        'SELECT * FROM checklists WHERE task_id = ? ORDER BY id ASC',
        [task.id]
      );

      const commentCount = await getOne(
        'SELECT COUNT(*) as count FROM comments WHERE task_id = ?',
        [task.id]
      );
      task.comment_count = commentCount ? commentCount.count : 0;
    }

    // Attach tasks to their respective columns
    const columnsWithTasks = columns.map(col => ({
      ...col,
      tasks: tasks.filter(t => t.column_id === col.id)
    }));

    // Fetch recent activity
    const activities = await query(
      `SELECT a.*, u.name as user_name, u.avatar as user_avatar
       FROM activity_log a
       JOIN users u ON a.user_id = u.id
       WHERE a.project_id = ?
       ORDER BY a.created_at DESC LIMIT 20`,
      [projectId]
    );

    res.json({
      ...project,
      members: allMembers,
      columns: columnsWithTasks,
      activities
    });
  } catch (err) {
    console.error('Fetch project details error:', err);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

// Update project details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const { name, description, color, icon } = req.body;

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    await run(
      'UPDATE projects SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?',
      [name, description, color, icon, projectId]
    );

    res.json({ message: 'Project updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    const project = await getOne('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.owner_id !== userId) return res.status(403).json({ error: 'Only project owner can delete' });

    await run('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add member or invite email to project
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const { userId: targetUserId, email, role } = req.body;

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Access denied: Only project members can invite users' });
    }

    if (!targetUserId && !email) {
      return res.status(400).json({ error: 'User ID or Email is required' });
    }

    const project = await getOne('SELECT id, name, description FROM projects WHERE id = ?', [projectId]);

    let user = null;
    if (targetUserId) {
      user = await getOne('SELECT id, name, email, avatar, role FROM users WHERE id = ?', [targetUserId]);
    } else if (email) {
      user = await getOne('SELECT id, name, email, avatar, role FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    }

    const recipientEmail = user ? user.email : email.trim().toLowerCase();
    const assignedRole = role || 'member';

    // Dispatch real invitation email
    const mailResult = await sendProjectInvitationEmail({
      toEmail: recipientEmail,
      inviterName: req.user.name,
      inviterEmail: req.user.email,
      projectName: project ? project.name : 'Project',
      projectDescription: project ? project.description : '',
      projectRole: assignedRole,
      isExistingUser: !!user
    });

    if (user) {
      await run(
        'INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
        [projectId, user.id, assignedRole]
      );
      await run(
        'INSERT INTO notifications (user_id, sender_id, type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, userId, 'project_invite', 'Project Invitation', `${req.user.name} added you to project "${project?.name || ''}"`, 'project', projectId]
      );
      return res.status(201).json({
        ...user,
        project_role: assignedRole,
        is_pending: 0,
        emailSent: mailResult.success,
        emailPreviewUrl: mailResult.previewUrl
      });
    } else {
      // Create pending invitation for non-registered email
      const targetEmail = email.trim().toLowerCase();
      await run(
        'INSERT OR REPLACE INTO project_invitations (project_id, email, role, invited_by) VALUES (?, ?, ?, ?)',
        [projectId, targetEmail, assignedRole, userId]
      );
      return res.status(201).json({
        id: targetEmail,
        name: targetEmail,
        email: targetEmail,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetEmail)}`,
        project_role: assignedRole,
        is_pending: 1,
        emailSent: mailResult.success,
        emailPreviewUrl: mailResult.previewUrl
      });
    }
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add project member' });
  }
});

// Remove member or cancel invitation from project
router.delete('/:id/members/:target', authenticateToken, async (req, res) => {
  try {
    const { id: projectId, target } = req.params;
    const userId = req.user.id;

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Access denied: Only project members can remove users' });
    }

    if (target.includes('@')) {
      await run('DELETE FROM project_invitations WHERE project_id = ? AND LOWER(email) = LOWER(?)', [projectId, decodeURIComponent(target)]);
    } else {
      await run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, target]);
    }
    res.json({ message: 'Member or invitation removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Add new column to project
router.post('/:id/columns', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const { title, color } = req.body;

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    if (!title) return res.status(400).json({ error: 'Column title required' });

    const maxPosRow = await getOne('SELECT MAX(position) as maxPos FROM columns WHERE project_id = ?', [projectId]);
    const nextPos = (maxPosRow && maxPosRow.maxPos !== null) ? maxPosRow.maxPos + 1 : 0;

    const result = await run(
      'INSERT INTO columns (project_id, title, position, color) VALUES (?, ?, ?, ?)',
      [projectId, title, nextPos, color || '#64748B']
    );

    const newColumn = { id: result.id, project_id: parseInt(projectId), title, position: nextPos, color: color || '#64748B', tasks: [] };
    res.status(201).json(newColumn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add column' });
  }
});

// Update column
router.put('/:id/columns/:colId', authenticateToken, async (req, res) => {
  try {
    const { id: projectId, colId } = req.params;
    const userId = req.user.id;
    const { title, color } = req.body;

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    await run('UPDATE columns SET title = ?, color = ? WHERE id = ? AND project_id = ?', [title, color, colId, projectId]);
    res.json({ message: 'Column updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// Delete column
router.delete('/:id/columns/:colId', authenticateToken, async (req, res) => {
  try {
    const { id: projectId, colId } = req.params;
    const userId = req.user.id;

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    await run('DELETE FROM columns WHERE id = ? AND project_id = ?', [colId, projectId]);
    res.json({ message: 'Column deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

export default router;
