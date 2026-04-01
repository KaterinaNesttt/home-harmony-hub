import { useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { TaskCard } from '@/components/TaskCard';
import type { CFHouseholdUser } from '@/integrations/cloudflare/client';
import type { Task, ShoppingList } from '@/types';

interface SearchPageProps {
  tasks: Task[];
  lists: ShoppingList[];
  currentUserId: string;
  householdUsers: CFHouseholdUser[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export function SearchPage({ tasks, lists, currentUserId, householdUsers, onUpdateTask }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const q = query.toLowerCase().trim();

  const matchedTasks = q ? tasks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.description?.toLowerCase().includes(q) ||
    t.category.toLowerCase().includes(q)
  ) : [];

  const matchedLists = q ? lists.filter(l =>
    l.title.toLowerCase().includes(q) ||
    l.items.some(i => i.name.toLowerCase().includes(q))
  ) : [];

  const total = matchedTasks.length + matchedLists.length;

  const suggestions = ['Дім', 'Фінанси', 'Їжа', 'Робота', 'Здоров\'я'];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold font-display">Пошук</h1>

      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          placeholder="Задачі, списки, товари..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          className="w-full h-14 pl-12 pr-12 glass rounded-2xl text-base font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all border border-border/50"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suggestions (empty state) */}
      {!q && (
        <div className="animate-slide-up">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Категорії</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="glass px-4 py-2 rounded-xl text-sm font-semibold tap-scale hover:border-primary/30 transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl p-10 text-center mt-6 animate-scale-in">
            <div className="text-4xl mb-3 animate-float">🔍</div>
            <p className="font-bold text-foreground">Введіть текст для пошуку</p>
            <p className="text-sm text-muted-foreground mt-1">Шукаємо по задачах, списках та товарах</p>
          </div>
        </div>
      )}

      {/* No results */}
      {q && total === 0 && (
        <div className="glass rounded-2xl p-12 text-center animate-scale-in">
          <div className="text-4xl mb-3">😕</div>
          <p className="font-bold text-foreground">Нічого не знайдено</p>
          <p className="text-sm text-muted-foreground mt-1">Спробуйте інший запит</p>
        </div>
      )}

      {/* Results */}
      {q && total > 0 && (
        <p className="text-sm text-muted-foreground">
          Знайдено: <span className="font-bold text-gold">{total}</span>
        </p>
      )}

      {matchedTasks.length > 0 && (
        <section className="animate-slide-up">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">
            Задачі ({matchedTasks.length})
          </h2>
          <div className="space-y-2.5 stagger">
            {matchedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                householdUsers={householdUsers}
                onToggleDone={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'unseen' : 'done' })}
              />
            ))}
          </div>
        </section>
      )}

      {matchedLists.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">
            Списки ({matchedLists.length})
          </h2>
          <div className="space-y-2.5 stagger">
            {matchedLists.map(list => (
              <div key={list.id} className="glass rounded-2xl p-4 card-hover tap-scale animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{list.title}</h3>
                  <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-semibold text-muted-foreground">
                    {list.items.filter(i => i.bought).length}/{list.items.length}
                  </span>
                </div>
                {list.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {list.items.slice(0, 4).map(item => (
                      <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full ${item.bought ? 'bg-green-500/15 text-green-500 line-through' : 'bg-muted text-muted-foreground'}`}>
                        {item.name}
                      </span>
                    ))}
                    {list.items.length > 4 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        +{list.items.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
