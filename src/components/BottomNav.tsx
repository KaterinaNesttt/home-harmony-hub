import { Home, CheckSquare, ShoppingCart, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'tasks' | 'shopping' | 'search';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Головна', icon: Home },
  { id: 'tasks', label: 'Задачі', icon: CheckSquare },
  { id: 'shopping', label: 'Покупки', icon: ShoppingCart },
  { id: 'search', label: 'Пошук', icon: Search },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[64px]",
              active === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
