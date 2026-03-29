import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { TaskCard } from '@/components/TaskCard';
import type { Task } from '@/types';
import { CATEGORIES } from '@/types';

type TaskView = 'all' | 'upcoming' | 'done';

interface TasksPageProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
}

export function TasksPage({ tasks, onUpdateTask, onDeleteTask, onAddTask }: TasksPageProps) {
  const [view, setView] = useState<TaskView>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const pinnedFirst = (arr: Task[]) => [...arr].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  let displayed: Task[];
  switch (view) {
    case 'all':
      displayed = pinnedFirst(tasks.filter(t => t.status !== 'done'));
      break;
    case 'upcoming':
      displayed = pinnedFirst(tasks.filter(t => {
        if (t.status === 'done') return false;
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        return d > tomorrow;
      }));
      break;
    case 'done':
      displayed = tasks.filter(t => t.status === 'done').sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      break;
  }

  const views: { id: TaskView; label: string }[] = [
    { id: 'all', label: 'Усі' },
    { id: 'upcoming', label: 'Найближчі' },
    { id: 'done', label: 'Виконані' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Задачі</h1>
        <button onClick={onAddTask} className="bg-primary text-primary-foreground rounded-full p-2 hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {views.map(v => (
          <button key={v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
              view === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>


      {/* Task list */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Немає задач</p>
          </div>
        ) : (
          displayed.map(task => (
            <TaskCard key={task.id} task={task}
              onToggleDone={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'unseen' : 'done' })} />
          ))
        )}
      </div>
    </div>
  );
}
