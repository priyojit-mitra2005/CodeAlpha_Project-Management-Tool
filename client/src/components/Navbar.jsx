import React, { useState } from 'react';
import {
  Kanban,
  ListFilter,
  Calendar,
  Search,
  Plus,
  LogIn,
  LogOut,
  FolderEdit,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationsPopover from './NotificationsPopover';

export default function Navbar({
  currentProject,
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onOpenAuth,
  onOpenCreateProject,
  onOpenEditProject,
  onSelectTask
}) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: Current Project Title & View Switcher */}
      <div className="flex items-center gap-6 min-w-0">
        {currentProject && (
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-4 h-4 rounded-xl shrink-0 shadow-sm"
              style={{ backgroundColor: currentProject.color || '#6366F1' }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-white tracking-tight truncate">
                  {currentProject.name}
                </h2>
                {user && (
                  <button
                    onClick={onOpenEditProject}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Edit project details"
                  >
                    <FolderEdit className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                {currentProject.description || 'Group Task Board'}
              </p>
            </div>
          </div>
        )}

        {/* View Switcher Pills */}
        <div className="hidden sm:flex items-center p-1 rounded-2xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => onViewChange('board')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'board'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" /> Board
          </button>

          <button
            onClick={() => onViewChange('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'list'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" /> List
          </button>

          <button
            onClick={() => onViewChange('timeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'timeline'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Timeline
          </button>
        </div>
      </div>

      {/* Right: Search, Notifications & Auth */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden lg:block w-56">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl glass-input text-xs"
          />
        </div>

        {user ? (
          <>
            <NotificationsPopover onSelectTask={onSelectTask} />

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-800/80 transition-colors border border-slate-800"
              >
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline">{user.name}</span>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 z-50 glass-panel rounded-2xl p-2 shadow-2xl border border-slate-700/60 animate-in fade-in duration-150">
                    <div className="p-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white">{user.name}</p>
                      <p className="text-[10px] text-slate-400">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full mt-1 p-2 rounded-xl text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In / Demo
          </button>
        )}
      </div>
    </header>
  );
}
