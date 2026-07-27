import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import ListView from './components/ListView';
import TimelineView from './components/TimelineView';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import AuthModal from './components/AuthModal';
import { Sparkles, Plus, Kanban } from 'lucide-react';

export default function App() {
  const { user, token } = useAuth();
  const { socket, joinProjectRoom, leaveProjectRoom } = useSocket();

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  const [activeView, setActiveView] = useState('board'); // 'board' | 'list' | 'timeline'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Fetch list of user projects
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !activeProjectId) {
          setActiveProjectId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch projects error:', err);
    }
  }, [token, activeProjectId]);

  // Fetch details for currently selected project
  const fetchProjectDetails = useCallback(async (projId) => {
    if (!token || !projId) return;
    try {
      const res = await fetch(`/api/projects/${projId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(data);
      }
    } catch (err) {
      console.error('Fetch project details error:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (activeProjectId) {
      fetchProjectDetails(activeProjectId);
      joinProjectRoom(activeProjectId);

      return () => {
        leaveProjectRoom(activeProjectId);
      };
    }
  }, [activeProjectId, token, fetchProjectDetails, joinProjectRoom, leaveProjectRoom]);

  // Real-Time Socket Event Listeners for Board Sync
  useEffect(() => {
    if (!socket || !activeProjectId) return;

    const handleTaskMoved = (data) => {
      if (data.projectId === activeProjectId) {
        fetchProjectDetails(activeProjectId);
      }
    };

    const handleTaskCreated = (data) => {
      if (data.projectId === activeProjectId) {
        fetchProjectDetails(activeProjectId);
      }
    };

    const handleTaskUpdated = (data) => {
      if (data.projectId === activeProjectId) {
        fetchProjectDetails(activeProjectId);
      }
    };

    const handleTaskDeleted = (data) => {
      if (data.projectId === activeProjectId) {
        fetchProjectDetails(activeProjectId);
      }
    };

    const handleCommentAdded = (data) => {
      if (data.projectId === activeProjectId) {
        fetchProjectDetails(activeProjectId);
      }
    };

    socket.on('board_task_moved', handleTaskMoved);
    socket.on('board_task_created', handleTaskCreated);
    socket.on('board_task_updated', handleTaskUpdated);
    socket.on('board_task_deleted', handleTaskDeleted);
    socket.on('board_comment_added', handleCommentAdded);

    return () => {
      socket.off('board_task_moved', handleTaskMoved);
      socket.off('board_task_created', handleTaskCreated);
      socket.off('board_task_updated', handleTaskUpdated);
      socket.off('board_task_deleted', handleTaskDeleted);
      socket.off('board_comment_added', handleCommentAdded);
    };
  }, [socket, activeProjectId, fetchProjectDetails]);

  // Handle task drag and drop move
  const handleTaskMoved = async (taskId, sourceColId, targetColId, newPosition) => {
    if (!currentProject) return;

    // Optimistic UI update
    setCurrentProject(prev => {
      if (!prev) return prev;
      const updatedCols = prev.columns.map(col => {
        let colTasks = [...col.tasks];
        if (col.id === sourceColId) {
          colTasks = colTasks.filter(t => t.id !== taskId);
        }
        if (col.id === targetColId) {
          const movedTask = prev.columns.flatMap(c => c.tasks).find(t => t.id === taskId);
          if (movedTask) {
            colTasks.push({ ...movedTask, column_id: targetColId });
          }
        }
        return { ...col, tasks: colTasks };
      });
      return { ...prev, columns: updatedCols };
    });

    try {
      await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ column_id: targetColId, position: newPosition })
      });
      fetchProjectDetails(activeProjectId);
    } catch (err) {
      console.error('Failed to persist task move:', err);
    }
  };

  // Handle task creation
  const handleTaskCreated = async (columnId, title) => {
    if (!activeProjectId || !token) return null;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          column_id: columnId,
          project_id: activeProjectId,
          title,
          priority: 'medium'
        })
      });
      if (res.ok) {
        const createdTask = await res.json();
        fetchProjectDetails(activeProjectId);
        fetchProjects();
        return createdTask;
      }
    } catch (err) {
      console.error('Create task error:', err);
    }
    return null;
  };

  // Handle adding column
  const handleAddColumn = async () => {
    const title = window.prompt('Enter new column title:');
    if (!title || !activeProjectId) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, color: '#6366F1' })
      });
      if (res.ok) {
        fetchProjectDetails(activeProjectId);
      }
    } catch (err) {
      console.error('Add column error:', err);
    }
  };

  // Filter tasks based on searchQuery
  const filteredColumns = currentProject?.columns?.map(col => ({
    ...col,
    tasks: col.tasks?.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || []
  })) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => setActiveProjectId(id)}
        onOpenCreateProject={() => setIsProjectModalOpen(true)}
        currentProjectMembers={currentProject?.members || []}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentProject={currentProject}
          activeView={activeView}
          onViewChange={(v) => setActiveView(v)}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenCreateProject={() => setIsProjectModalOpen(true)}
          onOpenEditProject={() => setIsProjectModalOpen(true)}
          onSelectTask={(tid) => setSelectedTaskId(tid)}
        />

        <main className="flex-1 px-4 sm:px-6 overflow-x-auto flex flex-col">
          {!user ? (
            /* Unauthenticated Banner */
            <div className="my-auto max-w-lg mx-auto text-center glass-panel p-8 rounded-3xl border border-slate-800 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <Kanban className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Collaborative Project Workspace</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign in or click a demo account to manage projects, drag & drop Kanban task cards, collaborate via real-time comments, and receive live WebSocket updates.
              </p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Enter Workspace / Demo
              </button>
            </div>
          ) : currentProject ? (
            /* Active Project Views */
            activeView === 'board' ? (
              <KanbanBoard
                columns={filteredColumns}
                projectId={activeProjectId}
                onTaskSelect={(tid) => setSelectedTaskId(tid)}
                onTaskMoved={handleTaskMoved}
                onTaskCreated={handleTaskCreated}
                onAddColumn={handleAddColumn}
              />
            ) : activeView === 'list' ? (
              <ListView
                columns={filteredColumns}
                onTaskSelect={(tid) => setSelectedTaskId(tid)}
              />
            ) : (
              <TimelineView
                columns={filteredColumns}
                onTaskSelect={(tid) => setSelectedTaskId(tid)}
              />
            )
          ) : (
            /* Loading / No Project selected */
            <div className="my-auto text-center text-slate-400 py-12">
              <p className="text-sm font-semibold mb-2">No projects found</p>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Create your first project
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={currentProject}
        onProjectSaved={() => {
          fetchProjects();
          if (activeProjectId) fetchProjectDetails(activeProjectId);
        }}
      />

      <TaskModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => {
          if (activeProjectId) fetchProjectDetails(activeProjectId);
        }}
        onTaskDeleted={() => {
          if (activeProjectId) fetchProjectDetails(activeProjectId);
        }}
        projectMembers={currentProject?.members || []}
      />
    </div>
  );
}
