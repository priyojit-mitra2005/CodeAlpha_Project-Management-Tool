import React from 'react';
import { Calendar, MessageSquare, CheckSquare, ChevronRight } from 'lucide-react';

export default function ListView({ columns = [], onTaskSelect, onMoveTask }) {
  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      {columns.map((column) => (
        <div key={column.id} className="glass-panel rounded-3xl p-5 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color || '#64748B' }} />
            <h3 className="font-bold text-slate-100 text-sm">{column.title}</h3>
            <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full">
              {column.tasks ? column.tasks.length : 0}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {column.tasks && column.tasks.length > 0 ? (
              column.tasks.map((task) => {
                const priorityClass = {
                  urgent: 'priority-urgent',
                  high: 'priority-high',
                  medium: 'priority-medium',
                  low: 'priority-low'
                }[task.priority || 'medium'];

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskSelect && onTaskSelect(task.id)}
                    className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-slate-800/40 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shrink-0 ${priorityClass}`}>
                        {task.priority || 'Medium'}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-slate-400 shrink-0">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}

                      {task.comment_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {task.comment_count}
                        </span>
                      )}

                      {task.assignees && task.assignees.length > 0 && (
                        <div className="flex items-center -space-x-1">
                          {task.assignees.map((u) => (
                            <img
                              key={u.id}
                              src={u.avatar}
                              alt={u.name}
                              title={u.name}
                              className="w-5 h-5 rounded-full border border-slate-900 object-cover"
                            />
                          ))}
                        </div>
                      )}

                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-xs text-slate-500 italic">No tasks in this list</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
