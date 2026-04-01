import { Pin, Clock, User, Users, ChevronRight, AlertCircle } from 'lucide-react';
import type { CFHouseholdUser } from '@/integrations/cloudflare/client';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

const statusLabels: Record<Task['status'], string> = {
  unseen: 'Не бачила',
  seen: 'Побачила',
  in_progress: 'У процесі',
  done: 'Виконано',
};

const priorityConfig: Record<Task['priority'], { label: string; bg: string; text: string }> = {
  low: { label: 'Низький', bg: 'bg-green-500/15', text: 'text-green-500' },
  medium: { label: 'Середній', bg: 'bg-gold/15', text: 'text-gold' },
  high: { label: 'Високий', bg: 'bg-destructive/15', text: 'text-destructive' },
};

const statusDot: Record<Task['status'], string> = {
  unseen: 'bg-muted-foreground',
  seen: 'bg-accent',
  in_progress: 'bg-gold animate-pulse',
  done: 'bg-green-500',
};

interface TaskCardProps {
  task: Task;
  currentUserId?: string;
  householdUsers?: CFHouseholdUser[];
  onToggleDone?: () => void;
  onClick?: () => void;
}

function getAssigneeLabel(task: Task, currentUserId?: string, householdUsers: CFHouseholdUser[] = []) {
  if (task.assignee === 'both') return 'Обоє';
  if (task.assigneeName) return task.assigneeName;
  if (task.assignee === currentUserId || task.assignee === 'me') return 'Я';
  if (task.assignee === 'partner') return 'Партнер';
  return householdUsers.find(person => person.id === task.assignee)?.display_name || 'Виконавець';
}

export function TaskCard({ task, currentUserId, householdUsers = [], onToggleDone, onClick }: TaskCardProps) {
  const isDone = task.status === 'done';
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadline && deadline < new Date() && !isDone;
  const pc = priorityConfig[task.priority];
  const assigneeLabel = getAssigneeLabel(task, currentUserId, householdUsers);

  return (
    <div
      onClick={onClick}
      className={cn('group relative glass rounded-2xl p-4 card-hover tap-scale animate-fade-in cursor-pointer', isDone && 'opacity-50')}
    >
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all',
          task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-gold' : 'bg-green-500',
          isDone && 'opacity-30'
        )}
      />

      <div className="flex items-start gap-3 pl-2">
        <button
          onClick={e => { e.stopPropagation(); onToggleDone?.(); }}
          className={cn(
            'mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center tap-scale',
            isDone ? 'bg-green-500 border-green-500 shadow-[0_0_10px_hsla(142,60%,50%,0.5)]' : 'border-muted-foreground/40 hover:border-primary hover:bg-primary/10'
          )}
        >
          {isDone && (
            <svg className="w-3.5 h-3.5 text-white check-anim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {task.pinned && <Pin className="w-3 h-3 text-gold flex-shrink-0" />}
            <h3 className={cn('font-semibold text-base leading-tight', isDone ? 'line-through text-muted-foreground' : 'text-foreground')}>
              {task.title}
            </h3>
          </div>

          {task.description && <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{task.description}</p>}

          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full', pc.bg, pc.text)}>
              {pc.label}
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot[task.status])} />
              {statusLabels[task.status]}
            </span>

            {deadline && (
              <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', isOverdue ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground')}>
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {deadline.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {task.assignee === 'both' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {assigneeLabel}
            </span>

            {task.createdByName && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80">
                <User className="w-3 h-3" />
                {`Додала: ${task.createdByName}`}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground mt-1 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}
