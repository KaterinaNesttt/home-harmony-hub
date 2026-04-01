import { useState } from 'react';
import { Plus, Filter, SlidersHorizontal } from 'lucide-react';
import { TaskCard } from '@/components/TaskCard';
import type { CFHouseholdUser } from '@/integrations/cloudflare/client';
import type { Task } from '@/types';

type TaskView = 'all' | 'upcoming' | 'done';

interface TasksPageProps {
  tasks: Task[];
  currentUserId: string;
  householdUsers: CFHouseholdUser[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
}

export function TasksPage({ tasks, currentUserId, householdUsers, onUpdateTask, onDeleteTask, onAddTask }: TasksPageProps) {
  const [view, setView] = useState<TaskView>('all');

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

  const pinnedFirst = (arr: Task[]) => [...arr].sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));

  let displayed: Task[];
  switch (view) {
    case 'all':      displayed = pinnedFirst(tasks.filter(t => t.status !== 'done')); break;
    case 'upcoming': displayed = pinnedFirst(tasks.filter(t => {
      if (t.status==='done') return false;
      if (!t.deadline) return false;
      return new Date(t.deadline) > tomorrow;
    })); break;
    case 'done':     displayed = tasks.filter(t => t.status==='done').sort((a,b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); break;
  }

  const views: { id: TaskView; label: string; count?: number }[] = [
    { id: 'all',      label: 'Усі',       count: tasks.filter(t=>t.status!=='done').length },
    { id: 'upcoming', label: 'Майбутні' },
    { id: 'done',     label: 'Виконані',  count: tasks.filter(t=>t.status==='done').length },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Задачі</h1>
          <p className="text-sm text-muted-foreground">{tasks.filter(t=>t.status!=='done').length} активних</p>
        </div>
        <button
          onClick={onAddTask}
          className="btn-gold w-12 h-12 rounded-2xl flex items-center justify-center tap-scale shadow-gold"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1.5">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 px-2 rounded-xl transition-all duration-200 tap-scale ${
              view === v.id
                ? 'bg-primary text-primary-foreground shadow-gold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v.label}
            {v.count !== undefined && v.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${view === v.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {v.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3 stagger">
        {displayed.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center animate-scale-in">
            <div className="text-4xl mb-3 animate-float">{view === 'done' ? '🎉' : '✨'}</div>
            <p className="font-bold text-foreground">{view === 'done' ? 'Немає виконаних' : 'Задач немає'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {view === 'done' ? 'Виконайте щось і тут з\'явиться' : 'Натисніть + щоб додати задачу'}
            </p>
          </div>
        ) : (
          displayed.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              householdUsers={householdUsers}
              onToggleDone={() => onUpdateTask(task.id, { status: task.status==='done' ? 'unseen' : 'done' })}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
