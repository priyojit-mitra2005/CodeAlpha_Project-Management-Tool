import React, { useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit3, AlertCircle } from 'lucide-react';
import TaskCard from './TaskCard';
import { useSocket } from '../context/SocketContext';

export default function KanbanBoard({
  columns = [],
  projectId,
  onTaskSelect,
  onTaskMoved,
  onTaskCreated,
  onAddColumn
}) {
  const { emitTaskMoved, emitTaskCreated } = useSocket();
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [addingTaskColId, setAddingTaskColId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumnId(null);

    if (!draggedTask) return;

    const sourceColumnId = draggedTask.column_id;
    if (sourceColumnId === targetColumnId) {
      setDraggedTask(null);
      return;
    }

    // Move task locally & emit socket broadcast
    const targetCol = columns.find(c => c.id === targetColumnId);
    const newPosition = targetCol ? targetCol.tasks.length : 0;

    if (onTaskMoved) {
      onTaskMoved(draggedTask.id, sourceColumnId, targetColumnId, newPosition);
    }

    emitTaskMoved({
      projectId,
      taskId: draggedTask.id,
      sourceColumnId,
      targetColumnId,
      newPosition,
      task: { ...draggedTask, column_id: targetColumnId }
    });

    setDraggedTask(null);
  };

  const handleCreateTask = async (e, columnId) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle;
    setNewTaskTitle('');
    setAddingTaskColId(null);

    if (onTaskCreated) {
      const created = await onTaskCreated(columnId, title);
      if (created) {
        emitTaskCreated({ projectId, columnId, task: created });
      }
    }
  };

  return (
    <div className="flex-1 flex gap-5 overflow-x-auto pb-6 pt-2 items-start min-h-[calc(100vh-140px)]">
      {columns.map((column) => {
        const isDragOver = dragOverColumnId === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={(e) => handleDragLeave(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`w-80 shrink-0 glass-panel rounded-3xl p-4 flex flex-col max-h-[calc(100vh-160px)] transition-all duration-200 ${
              isDragOver ? 'drag-over-column scale-[1.01]' : ''
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color || '#64748B' }}
                />
                <h3 className="text-sm font-bold text-slate-100">{column.title}</h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
                  {column.tasks ? column.tasks.length : 0}
                </span>
              </div>

              <button
                onClick={() => setAddingTaskColId(column.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Add task to column"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Column Tasks List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[100px]">
              {column.tasks && column.tasks.length > 0 ? (
                column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskSelect && onTaskSelect(task.id)}
                    onDragStart={handleDragStart}
                  />
                ))
              ) : (
                <div className="h-28 rounded-2xl border-2 border-dashed border-slate-800/80 flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                  <span>No tasks in {column.title}</span>
                  <span className="text-[10px]">Drag card here</span>
                </div>
              )}
            </div>

            {/* Quick Add Task Input Form */}
            {addingTaskColId === column.id ? (
              <form onSubmit={(e) => handleCreateTask(e, column.id)} className="mt-3 space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setAddingTaskColId(null)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingTaskColId(column.id)}
                className="mt-3 w-full py-2 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            )}
          </div>
        );
      })}

      {/* Add New Column Button */}
      <button
        onClick={onAddColumn}
        className="w-72 shrink-0 h-14 rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 glass-panel"
      >
        <Plus className="w-4 h-4" /> Add New Column
      </button>
    </div>
  );
}
