import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Palette, Users, UserPlus, Check, Trash2, Rocket, Zap, Shield, Code, LayoutGrid, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';

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
  const [inviteInput, setInviteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);
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
    setInviteStatus(null);
  }, [project, isOpen]);

  useEffect(() => {
    if (isOpen && token) {
      safeFetchJson('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(data => setAllUsers(data))
        .catch(err => console.error('Fetch users error:', err.message));
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

      const data = await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (onProjectSaved) onProjectSaved(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    if (e) e.preventDefault();
    if (!project || !inviteInput.trim()) return;
    setInviting(true);
    setInviteStatus(null);

    try {
      const payload = inviteInput.includes('@')
        ? { email: inviteInput.trim(), role: 'member' }
        : { userId: inviteInput, role: 'member' };

      const res = await safeFetchJson(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      setInviteInput('');
      setInviteStatus({
        type: 'success',
        message: `Invitation email ${res.emailSent ? 'sent' : 'queued'} to ${res.email || payload.email || 'user'}!`,
        previewUrl: res.emailPreviewUrl
      });
      if (onProjectSaved) onProjectSaved();
    } catch (err) {
      console.error('Add member error:', err.message);
      setInviteStatus({ type: 'error', message: err.message || 'Failed to send invitation email' });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (target) => {
    if (!project) return;
    try {
      await safeFetchJson(`/api/projects/${project.id}/members/${encodeURIComponent(target)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onProjectSaved) onProjectSaved();
    } catch (err) {
      console.error('Remove member error:', err.message);
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
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" /> Team Members & Invitations ({project.members?.length || 0})
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Type email or choose user</span>
              </label>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Enter email (e.g. colleague@company.com) or name..."
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-slate-200"
                    list="registered-users-list"
                  />
                  <datalist id="registered-users-list">
                    {allUsers
                      .filter(u => !project.members?.some(m => m.id === u.id || m.email === u.email))
                      .map(u => (
                        <option key={u.id} value={u.email}>
                          {u.name} ({u.role || u.email})
                        </option>
                      ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!inviteInput.trim() || inviting}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow shrink-0"
                >
                  {inviting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" /> Invite
                    </>
                  )}
                </button>
              </div>

              {inviteStatus && (
                <div className={`mb-3 p-2.5 rounded-xl text-xs flex flex-col gap-1 ${
                  inviteStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}>
                  <div className="flex items-center gap-1.5 font-medium">
                    {inviteStatus.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                    {inviteStatus.message}
                  </div>
                  {inviteStatus.previewUrl && (
                    <a
                      href={inviteStatus.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 font-mono mt-0.5"
                    >
                      <Mail className="w-3 h-3" /> View Sent Email Preview (Ethereal Dev Inbox) ↗
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {project.members?.map((m) => (
                  <div key={m.id || m.email} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      <div className="truncate min-w-0">
                        <span className="text-xs font-medium text-slate-200 truncate block">{m.name}</span>
                        {m.email && m.email !== m.name && <span className="text-[10px] text-slate-400 truncate block">{m.email}</span>}
                      </div>
                      {m.is_pending ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0 flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> Pending Invite
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold capitalize shrink-0">
                          {m.project_role || 'member'}
                        </span>
                      )}
                    </div>
                    {m.id !== user?.id && m.project_role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id || m.email)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                        title={m.is_pending ? 'Cancel invitation' : 'Remove member'}
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
