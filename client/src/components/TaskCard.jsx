import React from 'react';
import { Calendar, CheckSquare, MessageSquare, AlertCircle, GripVertical } from 'lucide-react';

export default function TaskCard({ task, onClick, onDragStart }) {
  const priorityClass = {
    urgent: 'priority-urgent',
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low'
  }[task.priority || 'medium'];

  const completedChecklists = task.checklists ? task.checklists.filter(c => c.completed).length : 0;
  const totalChecklists = task.checklists ? task.checklists.length : 0;

  // Check if due date is overdue or due soon
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.column_title !== 'Done';
  const formattedDueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task)}
      onClick={onClick}
      className="glass-card rounded-2xl p-4 cursor-pointer group relative flex flex-col gap-3 hover:border-indigo-500/50 transition-all select-none"
    >
      {/* Top Header: Priority Badge & Drag Handle */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${priorityClass}`}>
          {task.priority || 'Medium'}
        </span>
        <div className="text-slate-500 group-hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100 cursor-grab">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Task Title */}
      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
        {task.title}
      </h3>

      {/* Task Description Snippet */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Checklist Progress Bar */}
      {totalChecklists > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> Subtasks
            </span>
            <span>{completedChecklists}/{totalChecklists}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(completedChecklists / totalChecklists) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Footer: Due Date, Comments & Assignees */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1 text-slate-400">
        <div className="flex items-center gap-3 text-xs">
          {formattedDueDate && (
            <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
              <Calendar className="w-3.5 h-3.5" />
              {formattedDueDate}
            </span>
          )}

          {task.comment_count > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <MessageSquare className="w-3.5 h-3.5" />
              {task.comment_count}
            </span>
          )}
        </div>

        {/* Assignee Avatars */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center -space-x-2">
            {task.assignees.slice(0, 3).map((u) => (
              <img
                key={u.id}
                src={u.avatar}
                alt={u.name}
                title={u.name}
                className="w-6 h-6 rounded-full border-2 border-slate-900 object-cover"
              />
            ))}
            {task.assignees.length > 3 && (
              <span className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 text-[9px] font-bold text-slate-300 flex items-center justify-center">
                +{task.assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
