import React from 'react';
import { Calendar, User } from 'lucide-react';

export default function TimelineView({ columns = [], onTaskSelect }) {
  const allTasks = columns.flatMap(c => c.tasks || []);

  return (
    <div className="flex-1 pt-2 pb-8">
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-base">Project Timeline Schedule</h3>
          </div>
          <span className="text-xs text-slate-400">{allTasks.length} tasks scheduled</span>
        </div>

        <div className="space-y-3">
          {allTasks.map((task) => {
            const priorityColor = {
              urgent: 'bg-red-500/20 text-red-300 border-red-500/30',
              high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
              low: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
            }[task.priority || 'medium'];

            return (
              <div
                key={task.id}
                onClick={() => onTaskSelect && onTaskSelect(task.id)}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${priorityColor}`}>
                    {task.priority || 'medium'}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {task.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">Column: {task.column_title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date set'}</span>
                  </div>

                  {task.assignees && task.assignees.length > 0 && (
                    <div className="flex items-center -space-x-1.5">
                      {task.assignees.map((a) => (
                        <img key={a.id} src={a.avatar} alt={a.name} title={a.name} className="w-5 h-5 rounded-full border border-slate-900" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
