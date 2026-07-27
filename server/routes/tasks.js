import express from 'express';
import { run, getOne, query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create new task card
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { column_id, project_id, title, description, priority, due_date, assignees } = req.body;
    const userId = req.user.id;

    if (!column_id || !project_id || !title) {
      return res.status(400).json({ error: 'Column ID, Project ID, and Title are required' });
    }

    const posRow = await getOne('SELECT MAX(position) as maxPos FROM tasks WHERE column_id = ?', [column_id]);
    const nextPos = (posRow && posRow.maxPos !== null) ? posRow.maxPos + 1 : 0;

    const taskResult = await run(
      'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [column_id, project_id, title, description || '', priority || 'medium', due_date || null, nextPos, userId]
    );

    const taskId = taskResult.id;

    // Add assignees if provided
    if (Array.isArray(assignees)) {
      for (let assignId of assignees) {
        await run('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, assignId]);
        if (assignId !== userId) {
          await run(
            'INSERT INTO notifications (user_id, sender_id, type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [assignId, userId, 'task_assigned', 'Assigned to Task', `${req.user.name} assigned you to task "${title}"`, 'task', taskId]
          );
        }
      }
    }

    // Log activity
    await run('INSERT INTO activity_log (project_id, task_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)', [
      project_id,
      taskId,
      userId,
      'created_task',
      `Created task "${title}"`
    ]);

    const createdTask = await getOne(
      'SELECT t.*, u.name as creator_name, u.avatar as creator_avatar FROM tasks t JOIN users u ON t.created_by = u.id WHERE t.id = ?',
      [taskId]
    );

    createdTask.assignees = await query(
      'SELECT u.id, u.name, u.avatar, u.email FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?',
      [taskId]
    );
    createdTask.checklists = [];
    createdTask.comment_count = 0;

    res.status(201).json(createdTask);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get task details with assignees, checklist items, and full comment stream
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await getOne(
      `SELECT t.*, u.name as creator_name, u.avatar as creator_avatar, c.title as column_title, p.name as project_name
       FROM tasks t
       JOIN users u ON t.created_by = u.id
       JOIN columns c ON t.column_id = c.id
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.assignees = await query(
      'SELECT u.id, u.name, u.avatar, u.email FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?',
      [taskId]
    );

    task.checklists = await query(
      'SELECT * FROM checklists WHERE task_id = ? ORDER BY id ASC',
      [taskId]
    );

    task.comments = await query(
      'SELECT cm.*, u.name as user_name, u.avatar as user_avatar FROM comments cm JOIN users u ON cm.user_id = u.id WHERE cm.task_id = ? ORDER BY cm.created_at ASC',
      [taskId]
    );

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

// Update task details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, priority, due_date } = req.body;
    const userId = req.user.id;

    const task = await getOne('SELECT project_id, title FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await run(
      'UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ? WHERE id = ?',
      [title, description, priority, due_date, taskId]
    );

    await run('INSERT INTO activity_log (project_id, task_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)', [
      task.project_id,
      taskId,
      userId,
      'updated_task',
      `Updated details for "${title}"`
    ]);

    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Move task to new column or update position (Drag & Drop)
router.put('/:id/move', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { column_id, position } = req.body;
    const userId = req.user.id;

    const task = await getOne('SELECT t.*, c.title as old_column_title FROM tasks t JOIN columns c ON t.column_id = c.id WHERE t.id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await run('UPDATE tasks SET column_id = ?, position = ? WHERE id = ?', [column_id, position, taskId]);

    const newColumn = await getOne('SELECT title FROM columns WHERE id = ?', [column_id]);

    if (task.column_id !== column_id) {
      await run('INSERT INTO activity_log (project_id, task_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)', [
        task.project_id,
        taskId,
        userId,
        'moved_task',
        `Moved "${task.title}" to ${newColumn ? newColumn.title : 'new column'}`
      ]);
    }

    res.json({ message: 'Task moved successfully', task_id: taskId, column_id, position });
  } catch (err) {
    console.error('Move task error:', err);
    res.status(500).json({ error: 'Failed to move task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const task = await getOne('SELECT project_id, title FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await run('DELETE FROM tasks WHERE id = ?', [taskId]);

    await run('INSERT INTO activity_log (project_id, user_id, action, details) VALUES (?, ?, ?, ?)', [
      task.project_id,
      userId,
      'deleted_task',
      `Deleted task "${task.title}"`
    ]);

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Toggle / Assign user to task
router.post('/:id/assignees', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { userId } = req.body;

    const existing = await getOne('SELECT id FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, userId]);
    if (existing) {
      await run('DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, userId]);
      res.json({ action: 'removed' });
    } else {
      await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
      const task = await getOne('SELECT title, project_id FROM tasks WHERE id = ?', [taskId]);
      if (userId !== req.user.id) {
        await run(
          'INSERT INTO notifications (user_id, sender_id, type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, req.user.id, 'task_assigned', 'Assigned to Task', `${req.user.name} assigned you to "${task.title}"`, 'task', taskId]
        );
      }
      res.json({ action: 'added' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task assignees' });
  }
});

// Add subtask checklist item
router.post('/:id/checklists', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Checklist title is required' });

    const result = await run('INSERT INTO checklists (task_id, title, completed) VALUES (?, ?, ?)', [taskId, title, 0]);
    res.status(201).json({ id: result.id, task_id: parseInt(taskId), title, completed: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add checklist item' });
  }
});

// Toggle checklist completed state
router.put('/:id/checklists/:checkId', authenticateToken, async (req, res) => {
  try {
    const { checkId } = req.params;
    const { completed } = req.body;

    await run('UPDATE checklists SET completed = ? WHERE id = ?', [completed ? 1 : 0, checkId]);
    res.json({ message: 'Checklist updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle checklist' });
  }
});

// Delete checklist item
router.delete('/:id/checklists/:checkId', authenticateToken, async (req, res) => {
  try {
    const { checkId } = req.params;
    await run('DELETE FROM checklists WHERE id = ?', [checkId]);
    res.json({ message: 'Checklist item removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
});

// Add comment to task
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const commentRes = await run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', [taskId, userId, content]);
    const newComment = await getOne(
      'SELECT cm.*, u.name as user_name, u.avatar as user_avatar FROM comments cm JOIN users u ON cm.user_id = u.id WHERE cm.id = ?',
      [commentRes.id]
    );

    // Notify assignees of this task about the new comment
    const task = await getOne('SELECT title, project_id FROM tasks WHERE id = ?', [taskId]);
    const assignees = await query('SELECT user_id FROM task_assignees WHERE task_id = ? AND user_id != ?', [taskId, userId]);

    for (let assign of assignees) {
      await run(
        'INSERT INTO notifications (user_id, sender_id, type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [assign.user_id, userId, 'comment_added', 'New Comment', `${req.user.name} commented on "${task.title}"`, 'task', taskId]
      );
    }

    // Log activity
    await run('INSERT INTO activity_log (project_id, task_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)', [
      task.project_id,
      taskId,
      userId,
      'commented',
      `Commented on "${task.title}"`
    ]);

    res.status(201).json(newComment);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete comment
router.delete('/:id/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await getOne('SELECT user_id FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== userId) return res.status(403).json({ error: 'Can only delete own comments' });

    await run('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
