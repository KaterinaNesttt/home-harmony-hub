import { Home, CheckSquare, ShoppingCart, Search, UserCircle, CloudSun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tab } from '@/pages/Index';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Home; emoji: string }[] = [
  { id: 'dashboard', label: 'Дім',     icon: Home,         emoji: '🏠' },
  { id: 'tasks',     label: 'Задачі',  icon: CheckSquare,  emoji: '✅' },
  { id: 'shopping',  label: 'Покупки', icon: ShoppingCart, emoji: '🛒' },
  { id: 'weather',   label: 'Погода',  icon: CloudSun,     emoji: '🌤' },
  { id: 'account',   label: 'Акаунт',  icon: UserCircle,   emoji: '👤' },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="max-w-lg mx-auto px-3 pb-3">
        <div className="glass-strong rounded-2xl shadow-glass border border-border/60">
          <div className="flex items-center justify-around h-18 px-2 py-2">
            {tabs.map(({ id, label, icon: Icon, emoji }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => onChange(id)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[58px] tap-scale",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Active pill background */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-primary/12 animate-scale-in" />
                  )}

                  {/* Icon with 3D-like transform */}
                  <span className={cn(
                    "relative transition-all duration-200",
                    isActive ? "scale-110 drop-shadow-[0_2px_8px_hsla(42,85%,58%,0.6)]" : ""
                  )}>
                    <Icon className={cn("transition-all duration-200", isActive ? "w-7 h-7" : "w-6 h-6")} strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>

                  <span className={cn(
                    "text-[10px] font-semibold tracking-wide transition-all duration-200 relative",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>

                  {/* Active dot */}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-bounce-in" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
