import { Plus, CheckSquare, ShoppingCart, CloudSun, TrendingUp } from 'lucide-react';
import { TaskCard } from '@/components/TaskCard';
import { ShoppingListCard } from '@/components/ShoppingListCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Task, ShoppingList, ShoppingItem } from '@/types';

interface DashboardPageProps {
  tasks: Task[];
  lists: ShoppingList[];
  profile: { display_name: string; avatar_url: string | null } | null;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onAddItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => void;
  onAddTask: () => void;
  onAddToList: () => void;
  onGoToTasks: () => void;
  onGoToShopping: () => void;
  onGoToWeather: () => void;
}

export function DashboardPage({ tasks, lists, profile, onUpdateTask, onToggleItem, onDeleteItem, onAddItem, onAddTask, onAddToList, onGoToTasks, onGoToShopping, onGoToWeather }: DashboardPageProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = tasks.filter(t => {
    if (t.status === 'done') return false;
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d >= today && d < tomorrow;
  });

  const pinnedTasks = tasks.filter(t => t.pinned && t.status !== 'done');
  const displayTasks = [...new Map([...pinnedTasks, ...todayTasks].map(t => [t.id, t])).values()].slice(0, 5);
  const activeLists = lists.filter(l => l.type === 'daily' || l.pinned).slice(0, 2);
  const toBuyCount = lists.reduce((s, l) => s + l.items.filter(i => !i.bought).length, 0);
  const doneToday = tasks.filter(t => t.status === 'done').length;

  const initials = (profile?.display_name || '?').slice(0, 2).toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброго ранку' : hour < 17 ? 'Добрий день' : 'Добрий вечір';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-14 h-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-gold">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
              <AvatarFallback className="bg-gradient-to-br from-gold to-yellow-600 text-background font-bold text-lg">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">{greeting} 👋</p>
            <p className="font-bold text-xl font-display">{profile?.display_name || 'Користувач'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">
            {today.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {today.toLocaleDateString('uk-UA', { weekday: 'long' })}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 stagger">
        <button
          onClick={onGoToTasks}
          className="glass rounded-2xl p-4 text-center card-hover tap-scale animate-fade-in"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-2">
            <CheckSquare className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-gold">{todayTasks.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Сьогодні</p>
        </button>

        <button
          onClick={onGoToShopping}
          className="glass rounded-2xl p-4 text-center card-hover tap-scale animate-fade-in"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-2">
            <ShoppingCart className="w-5 h-5 text-accent" />
          </div>
          <p className="text-2xl font-bold font-display text-accent">{toBuyCount}</p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Купити</p>
        </button>

        <button
          onClick={onGoToWeather}
          className="glass rounded-2xl p-4 text-center card-hover tap-scale animate-fade-in"
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center mx-auto mb-2">
            <CloudSun className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold font-display text-green-500">{doneToday}</p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Виконано</p>
        </button>
      </div>

      {/* Quick add */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAddTask}
          className="btn-gold rounded-2xl p-4 flex items-center justify-center gap-2.5 font-bold text-base tap-scale"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          <span>Задача</span>
        </button>
        <button
          onClick={onAddToList}
          className="glass rounded-2xl p-4 flex items-center justify-center gap-2.5 font-bold text-base text-accent border-accent/20 tap-scale card-hover"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          <span>В список</span>
        </button>
      </div>

      {/* Today's tasks */}
      {displayTasks.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm tracking-widest text-muted-foreground uppercase">Задачі на сьогодні</h2>
            <button onClick={onGoToTasks} className="text-xs text-primary font-semibold tap-scale">Всі →</button>
          </div>
          <div className="space-y-2.5 stagger">
            {displayTasks.map(task => (
              <TaskCard key={task.id} task={task}
                onToggleDone={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'unseen' : 'done' })} />
            ))}
          </div>
        </section>
      )}

      {/* Active shopping */}
      {activeLists.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm tracking-widest text-muted-foreground uppercase">Активні списки</h2>
            <button onClick={onGoToShopping} className="text-xs text-accent font-semibold tap-scale">Всі →</button>
          </div>
          <div className="space-y-3 stagger">
            {activeLists.map(list => (
              <ShoppingListCard key={list.id} list={list}
                onToggleItem={itemId => onToggleItem(list.id, itemId)}
                onDeleteItem={itemId => onDeleteItem(list.id, itemId)}
                onAddItem={item => onAddItem(list.id, item)} />
            ))}
          </div>
        </section>
      )}

      {displayTasks.length === 0 && activeLists.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center animate-scale-in">
          <div className="text-5xl mb-4 animate-float">🏠</div>
          <p className="font-bold text-lg text-gold-shimmer font-display">Все чисто!</p>
          <p className="text-muted-foreground text-sm mt-1">Додайте задачу або список покупок</p>
        </div>
      )}
    </div>
  );
}
