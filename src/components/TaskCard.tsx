import { Pin, Clock, User, Users, ChevronRight } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

const statusLabels: Record<Task['status'], string> = {
  unseen: 'Не бачив',
  seen: 'Побачив',
  in_progress: 'В процесі',
  done: 'Виконано',
};

const priorityConfig: Record<Task['priority'], { label: string; class: string }> = {
  low: { label: 'Низький', class: 'bg-priority-low/15 text-priority-low' },
  medium: { label: 'Середній', class: 'bg-priority-medium/15 text-priority-medium' },
  high: { label: 'Високий', class: 'bg-priority-high/15 text-priority-high' },
};

const statusDot: Record<Task['status'], string> = {
  unseen: 'bg-status-unseen',
  seen: 'bg-status-seen',
  in_progress: 'bg-status-progress',
  done: 'bg-status-done',
};

interface TaskCardProps {
  task: Task;
  onStatusChange?: (status: Task['status']) => void;
  onToggleDone?: () => void;
  onClick?: () => void;
}

export function TaskCard({ task, onToggleDone, onClick }: TaskCardProps) {
  const isDone = task.status === 'done';
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadline && deadline < new Date() && !isDone;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card rounded-xl p-4 border border-border transition-all animate-fade-in cursor-pointer",
        "hover:shadow-md hover:border-primary/20",
        isDone && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone?.(); }}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center",
            isDone ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {isDone && (
            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {task.pinned && <Pin className="w-3 h-3 text-accent flex-shrink-0" />}
            <h3 className={cn("font-semibold text-sm truncate", isDone && "line-through text-muted-foreground")}>
              {task.title}
            </h3>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", priorityConfig[task.priority].class)}>
              {priorityConfig[task.priority].label}
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={cn("w-1.5 h-1.5 rounded-full", statusDot[task.status])} />
              {statusLabels[task.status]}
            </span>

            {deadline && (
              <span className={cn("inline-flex items-center gap-1 text-[10px]", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                <Clock className="w-3 h-3" />
                {deadline.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              {task.assignee === 'both' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {task.assignee === 'me' ? 'Я' : task.assignee === 'partner' ? 'Партнер' : 'Обидва'}
            </span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground mt-1 flex-shrink-0" />
      </div>
    </div>
  );
}
