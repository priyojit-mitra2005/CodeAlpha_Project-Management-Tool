import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  const activeUsers = new Map(); // socketId -> { userId, userName, avatar, currentProject }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Invalid socket token'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`⚡ Socket connected: ${user.name} (${user.id})`);

    activeUsers.set(socket.id, {
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      currentProject: null
    });

    // Join a specific project workspace room
    socket.on('join_project', (projectId) => {
      const room = `project_${projectId}`;
      socket.join(room);

      const userInfo = activeUsers.get(socket.id);
      if (userInfo) userInfo.currentProject = projectId;

      console.log(`User ${user.name} joined room ${room}`);

      // Broadcast list of online members in this project room
      const roomSockets = io.sockets.adapter.rooms.get(room);
      const onlineMembers = [];
      if (roomSockets) {
        for (let sId of roomSockets) {
          const u = activeUsers.get(sId);
          if (u && !onlineMembers.some(m => m.userId === u.userId)) {
            onlineMembers.push(u);
          }
        }
      }

      io.to(room).emit('online_presence', onlineMembers);
    });

    // Leave project room
    socket.on('leave_project', (projectId) => {
      const room = `project_${projectId}`;
      socket.leave(room);

      const userInfo = activeUsers.get(socket.id);
      if (userInfo) userInfo.currentProject = null;

      const roomSockets = io.sockets.adapter.rooms.get(room);
      const onlineMembers = [];
      if (roomSockets) {
        for (let sId of roomSockets) {
          const u = activeUsers.get(sId);
          if (u && !onlineMembers.some(m => m.userId === u.userId)) {
            onlineMembers.push(u);
          }
        }
      }
      io.to(room).emit('online_presence', onlineMembers);
    });

    // Real-Time Board Actions Broadcasting
    socket.on('board_task_moved', (data) => {
      // data: { projectId, taskId, sourceColumnId, targetColumnId, newPosition, task }
      socket.to(`project_${data.projectId}`).emit('board_task_moved', data);
    });

    socket.on('board_task_created', (data) => {
      // data: { projectId, columnId, task }
      socket.to(`project_${data.projectId}`).emit('board_task_created', data);
    });

    socket.on('board_task_updated', (data) => {
      // data: { projectId, task }
      socket.to(`project_${data.projectId}`).emit('board_task_updated', data);
    });

    socket.on('board_task_deleted', (data) => {
      // data: { projectId, taskId, columnId }
      socket.to(`project_${data.projectId}`).emit('board_task_deleted', data);
    });

    socket.on('board_comment_added', (data) => {
      // data: { projectId, taskId, comment }
      socket.to(`project_${data.projectId}`).emit('board_comment_added', data);
    });

    socket.on('board_column_updated', (data) => {
      // data: { projectId, column }
      socket.to(`project_${data.projectId}`).emit('board_column_updated', data);
    });

    socket.on('user_typing_comment', (data) => {
      socket.to(`project_${data.projectId}`).emit('user_typing_comment', {
        taskId: data.taskId,
        user: { name: user.name, avatar: user.avatar }
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${user.name}`);
      const userInfo = activeUsers.get(socket.id);
      activeUsers.delete(socket.id);

      if (userInfo && userInfo.currentProject) {
        const room = `project_${userInfo.currentProject}`;
        const roomSockets = io.sockets.adapter.rooms.get(room);
        const onlineMembers = [];
        if (roomSockets) {
          for (let sId of roomSockets) {
            const u = activeUsers.get(sId);
            if (u && !onlineMembers.some(m => m.userId === u.userId)) {
              onlineMembers.push(u);
            }
          }
        }
        io.to(room).emit('online_presence', onlineMembers);
      }
    });
  });

  return io;
};
