import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TaskCard } from '@/components/TaskCard';
import type { Task, ShoppingList } from '@/types';

interface SearchPageProps {
  tasks: Task[];
  lists: ShoppingList[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export function SearchPage({ tasks, lists, onUpdateTask }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const q = query.toLowerCase().trim();

  const matchedTasks = q ? tasks.filter(t =>
    t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
  ) : [];

  const matchedLists = q ? lists.filter(l =>
    l.title.toLowerCase().includes(q) || l.items.some(i => i.name.toLowerCase().includes(q))
  ) : [];

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold">Пошук</h1>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Задачі, списки, товари..." value={query} onChange={e => setQuery(e.target.value)}
          className="pl-10" autoFocus />
      </div>

      {q && matchedTasks.length === 0 && matchedLists.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">Нічого не знайдено</p>
      )}

      {matchedTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">ЗАДАЧІ ({matchedTasks.length})</h2>
          <div className="space-y-2">
            {matchedTasks.map(task => (
              <TaskCard key={task.id} task={task}
                onToggleDone={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'unseen' : 'done' })} />
            ))}
          </div>
        </section>
      )}

      {matchedLists.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">СПИСКИ ({matchedLists.length})</h2>
          <div className="space-y-2">
            {matchedLists.map(list => (
              <div key={list.id} className="bg-card rounded-xl p-4 border border-border">
                <h3 className="font-semibold text-sm">{list.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {list.items.length} товарів · {list.items.filter(i => i.bought).length} куплено
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!q && (
        <p className="text-center text-muted-foreground text-sm py-8">Введіть текст для пошуку</p>
      )}
    </div>
  );
}
