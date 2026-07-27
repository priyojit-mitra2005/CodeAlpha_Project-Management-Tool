import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlinePresence, setOnlinePresence] = useState([]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketInstance = io({
      auth: { token },
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to Socket.IO real-time engine');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.IO engine');
      setConnected(false);
    });

    socketInstance.on('online_presence', (users) => {
      setOnlinePresence(users || []);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  const joinProjectRoom = (projectId) => {
    if (socket && projectId) {
      socket.emit('join_project', projectId);
    }
  };

  const leaveProjectRoom = (projectId) => {
    if (socket && projectId) {
      socket.emit('leave_project', projectId);
    }
  };

  const emitTaskMoved = (data) => {
    if (socket) socket.emit('board_task_moved', data);
  };

  const emitTaskCreated = (data) => {
    if (socket) socket.emit('board_task_created', data);
  };

  const emitTaskUpdated = (data) => {
    if (socket) socket.emit('board_task_updated', data);
  };

  const emitTaskDeleted = (data) => {
    if (socket) socket.emit('board_task_deleted', data);
  };

  const emitCommentAdded = (data) => {
    if (socket) socket.emit('board_comment_added', data);
  };

  const emitColumnUpdated = (data) => {
    if (socket) socket.emit('board_column_updated', data);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        onlinePresence,
        joinProjectRoom,
        leaveProjectRoom,
        emitTaskMoved,
        emitTaskCreated,
        emitTaskUpdated,
        emitTaskDeleted,
        emitCommentAdded,
        emitColumnUpdated
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
