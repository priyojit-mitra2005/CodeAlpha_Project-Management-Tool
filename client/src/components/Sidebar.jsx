import React from 'react';
import {
  Kanban,
  FolderPlus,
  Users,
  Settings,
  Plus,
  Sparkles,
  Rocket,
  Zap,
  Shield,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function Sidebar({
  projects = [],
  activeProjectId,
  onSelectProject,
  onOpenCreateProject,
  currentProjectMembers = []
}) {
  const { onlinePresence } = useSocket();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/80 p-4 flex flex-col justify-between hidden md:flex z-30">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
              TaskSphere
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Collaborative Workspace</p>
          </div>
        </div>

        {/* Projects List Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Group Projects</span>
            <button
              onClick={onOpenCreateProject}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Create new project"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((proj) => {
              const isActive = activeProjectId === proj.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 shadow-md shadow-indigo-950/30'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || '#6366F1' }}
                    />
                    <span className="text-xs font-semibold truncate">{proj.name}</span>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                    {proj.completed_tasks || 0}/{proj.total_tasks || 0}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onOpenCreateProject}
            className="mt-3 w-full py-2 px-3 rounded-2xl border border-dashed border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New Group Project
          </button>
        </div>

        {/* Real-time Team Members & Online Status */}
        <div className="pt-4 border-t border-slate-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
            <span>Project Team</span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </span>

          <div className="space-y-1.5 mt-2">
            {currentProjectMembers.map((m) => {
              const isOnline = onlinePresence.some(op => op.userId === m.id);
              return (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.user_role || 'Developer'}</p>
                    </div>
                  </div>
                  {isOnline && (
                    <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      Online
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        TaskSphere v1.0 • WebSockets Enabled
      </div>
    </aside>
  );
}
