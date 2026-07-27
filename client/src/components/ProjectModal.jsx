import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Palette, Users, UserPlus, Check, Trash2, Rocket, Zap, Shield, Code, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COLOR_OPTIONS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];
const ICONS = ['layout-kanban', 'rocket', 'zap', 'shield', 'code', 'palette'];

export default function ProjectModal({ isOpen, onClose, project = null, onProjectSaved }) {
  const { token, user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    icon: 'layout-kanban'
  });
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#6366F1',
        icon: project.icon || 'layout-kanban'
      });
    } else {
      setFormData({ name: '', description: '', color: '#6366F1', icon: 'layout-kanban' });
    }
  }, [project, isOpen]);

  useEffect(() => {
    if (isOpen && token) {
      fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setAllUsers(data))
        .catch(err => console.error('Fetch users error:', err));
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = project ? `/api/projects/${project.id}` : '/api/projects';
      const method = project ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save project');

      if (onProjectSaved) onProjectSaved(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!project || !selectedUserToAdd) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: selectedUserToAdd, role: 'member' })
      });
      if (res.ok) {
        setSelectedUserToAdd('');
        if (onProjectSaved) onProjectSaved();
      }
    } catch (err) {
      console.error('Add member error:', err);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && onProjectSaved) onProjectSaved();
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/60 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{project ? 'Edit Project Settings' : 'Create Group Project'}</h2>
            <p className="text-xs text-slate-400">Organize tasks, assign team members & collaborate in real-time</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Mobile App Redesign"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe goals, scope, or milestones..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Project Color Theme</label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: hex })}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: hex }}
                >
                  {formData.color === hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Members Management (When editing existing project) */}
          {project && (
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" /> Project Members ({project.members?.length || 0})
              </label>

              <div className="flex items-center gap-2 mb-3">
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl glass-input text-xs bg-slate-900 text-slate-200"
                >
                  <option value="">Select team member to invite...</option>
                  {allUsers
                    .filter(u => !project.members?.some(m => m.id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role || u.email})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!selectedUserToAdd}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {project.members?.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-medium text-slate-200">{m.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold capitalize">
                        {m.project_role || 'member'}
                      </span>
                    </div>
                    {m.id !== user?.id && m.project_role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
