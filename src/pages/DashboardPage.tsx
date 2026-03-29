import { Plus, CheckSquare, ShoppingCart, Moon, Sun } from 'lucide-react';
import { TaskCard } from '@/components/TaskCard';
import { ShoppingListCard } from '@/components/ShoppingListCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from '@/hooks/useTheme';
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
}

export function DashboardPage({ tasks, lists, profile, onUpdateTask, onToggleItem, onDeleteItem, onAddItem, onAddTask, onAddToList, onGoToTasks, onGoToShopping }: DashboardPageProps) {
  const { dark, toggle } = useTheme();

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

  const initials = (profile?.display_name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
            <AvatarFallback className="text-sm font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-base">{profile?.display_name || 'Користувач'}</p>
            <p className="text-muted-foreground text-xs">
              {today.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Перемикач теми"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onGoToTasks}
          className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 transition-colors"
        >
          <CheckSquare className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{todayTasks.length}</p>
          <p className="text-[10px] text-muted-foreground">Сьогодні</p>
        </button>
        <button
          onClick={onGoToShopping}
          className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 transition-colors"
        >
          <ShoppingCart className="w-4 h-4 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold">{toBuyCount}</p>
          <p className="text-[10px] text-muted-foreground">Купити</p>
        </button>
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <button onClick={onAddTask} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl p-3 font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Задача
        </button>
        <button onClick={onAddToList} className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground rounded-xl p-3 font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> В список
        </button>
      </div>

      {/* Today's tasks */}
      {displayTasks.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground mb-3">ЗАДАЧІ НА СЬОГОДНІ</h2>
          <div className="space-y-2">
            {displayTasks.map(task => (
              <TaskCard key={task.id} task={task}
                onToggleDone={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'unseen' : 'done' })} />
            ))}
          </div>
        </section>
      )}

      {/* Active shopping */}
      {activeLists.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground mb-3">АКТИВНІ СПИСКИ</h2>
          <div className="space-y-3">
            {activeLists.map(list => (
              <ShoppingListCard key={list.id} list={list}
                onToggleItem={itemId => onToggleItem(list.id, itemId)}
                onDeleteItem={itemId => onDeleteItem(list.id, itemId)}
                onAddItem={item => onAddItem(list.id, item)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
