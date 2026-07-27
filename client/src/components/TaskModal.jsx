import React, { useState, useEffect } from 'react';
import { X, Calendar, UserPlus, CheckSquare, MessageSquare, Trash2, Send, Clock, AlertCircle, Plus, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function TaskModal({ taskId, isOpen, onClose, onTaskUpdated, onTaskDeleted, projectMembers = [] }) {
  const { token, user } = useAuth();
  const { emitCommentAdded, emitTaskUpdated } = useSocket();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  // Checklist & Comment states
  const [newChecklist, setNewChecklist] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  const fetchTaskDetails = async () => {
    if (!taskId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setPriority(data.priority || 'medium');
        setDueDate(data.due_date || '');
      }
    } catch (err) {
      console.error('Fetch task error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId, token]);

  if (!isOpen || !taskId) return null;

  const handleUpdateTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, priority, due_date: dueDate })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchTaskDetails();
        if (onTaskUpdated) onTaskUpdated();
        emitTaskUpdated({ projectId: task?.project_id, taskId });
      }
    } catch (err) {
      console.error('Update task error:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task card?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (onTaskDeleted) onTaskDeleted(taskId, task?.column_id);
        onClose();
      }
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const handleToggleAssignee = async (memberId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: memberId })
      });
      if (res.ok) {
        fetchTaskDetails();
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err) {
      console.error('Assignee toggle error:', err);
    }
  };

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklist.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newChecklist })
      });
      if (res.ok) {
        setNewChecklist('');
        fetchTaskDetails();
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err) {
      console.error('Add checklist error:', err);
    }
  };

  const handleToggleChecklist = async (checkId, currentStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklists/${checkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: !currentStatus })
      });
      if (res.ok) {
        fetchTaskDetails();
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err) {
      console.error('Toggle checklist error:', err);
    }
  };

  const handleDeleteChecklist = async (checkId) => {
    try {
      await fetch(`/api/tasks/${taskId}/checklists/${checkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      console.error('Delete checklist error:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        const commentData = await res.json();
        setNewComment('');
        fetchTaskDetails();
        emitCommentAdded({ projectId: task?.project_id, taskId, comment: commentData });
      }
    } catch (err) {
      console.error('Add comment error:', err);
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTaskDetails();
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/60 max-h-[90vh] overflow-y-auto relative flex flex-col gap-6">
        
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {task?.column_title || 'Task'}
              </span>
              <span className="text-xs text-slate-400">in {task?.project_name}</span>
            </div>

            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-bold px-3 py-1 rounded-xl glass-input"
              />
            ) : (
              <h2 className="text-xl font-bold text-white tracking-tight">{task?.title}</h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Delete task card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading task details...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Main Column: Description, Checklists, Comments */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add detailed task instructions..."
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateTask}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                    {task?.description || <span className="italic text-slate-500">No description provided yet.</span>}
                  </p>
                )}
              </div>

              {/* Subtask Checklists */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-indigo-400" /> Checklist Items
                  </h3>
                  {task?.checklists?.length > 0 && (
                    <span className="text-xs text-indigo-300 font-semibold">
                      {Math.round((task.checklists.filter(c => c.completed).length / task.checklists.length) * 100)}% done
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  {task?.checklists?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!item.completed}
                          onChange={() => handleToggleChecklist(item.id, item.completed)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                        />
                        <span className={`text-xs ${item.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {item.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 opacity-0 hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddChecklist} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a new subtask item..."
                    value={newChecklist}
                    onChange={(e) => setNewChecklist(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl glass-input text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!newChecklist.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </form>
              </div>

              {/* Real-time Comment Stream */}
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" /> Activity & Comments ({task?.comments?.length || 0})
                </h3>

                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                  {task?.comments?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">No comments yet. Start the conversation!</p>
                  ) : (
                    task?.comments?.map((c) => (
                      <div key={c.id} className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-start gap-3">
                        <img src={c.user_avatar} alt={c.user_name} className="w-7 h-7 rounded-full object-cover mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-slate-200">{c.user_name}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        </div>
                        {c.user_id === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                  <button
                    type="submit"
                    disabled={commenting || !newComment.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Post
                  </button>
                </form>
              </div>

            </div>

            {/* Right Sidebar: Attributes (Priority, Due Date, Assignees) */}
            <div className="space-y-5 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
              
              {/* Priority Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setIsEditing(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900 text-slate-200 capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Due Date Picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setIsEditing(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-200"
                />
              </div>

              {/* Assignees Toggle */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-400" /> Assigned Team
                </label>

                <div className="space-y-1.5">
                  {projectMembers.map((m) => {
                    const isAssigned = task?.assignees?.some(a => a.id === m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleToggleAssignee(m.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                          isAssigned
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className="text-xs font-medium truncate">{m.name}</span>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isEditing && (
                <button
                  onClick={handleUpdateTask}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow"
                >
                  Save Attribute Changes
                </button>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
