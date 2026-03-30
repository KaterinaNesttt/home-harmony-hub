import { useState } from 'react';
import { Check, Trash2, ExternalLink, Plus, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ShoppingList, ShoppingItem } from '@/types';

const typeEmoji: Record<string, string> = {
  daily: '📅',
  global: '📦',
  wishlist: '💫',
};

interface ShoppingListCardProps {
  list: ShoppingList;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (item: Omit<ShoppingItem, 'id'>) => void;
}

export function ShoppingListCard({ list, onToggleItem, onDeleteItem, onAddItem }: ShoppingListCardProps) {
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const boughtCount = list.items.filter(i => i.bought).length;
  const progress = list.items.length ? (boughtCount / list.items.length) * 100 : 0;

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAddItem({ name: newItem.trim(), quantity: newQty.trim() || '1', bought: false });
    setNewItem(''); setNewQty('');
  };

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in card-hover">
      {/* Header */}
      <button
        className="w-full p-4 text-left tap-scale"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{typeEmoji[list.type] || '📋'}</span>
            {list.pinned && <Pin className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
            <h3 className="font-bold text-base text-foreground">{list.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {boughtCount}/{list.items.length}
            </span>
            {collapsed
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronUp className="w-4 h-4 text-muted-foreground" />
            }
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted/60 rounded-full h-1.5 mt-3 overflow-hidden">
          <div className="progress-gold h-1.5" style={{ width: `${progress}%` }} />
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Items */}
          {list.items.length > 0 && (
            <div className="border-t border-border/40 divide-y divide-border/30">
              {list.items.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 group transition-all duration-200",
                    item.bought && "opacity-45"
                  )}
                >
                  <button
                    onClick={() => onToggleItem(item.id)}
                    className={cn(
                      "w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all tap-scale",
                      item.bought
                        ? "bg-green-500 border-green-500 shadow-[0_0_8px_hsla(142,60%,50%,0.4)]"
                        : "border-muted-foreground/30 hover:border-primary hover:bg-primary/10"
                    )}
                  >
                    {item.bought && <Check className="w-3.5 h-3.5 text-white check-anim" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-sm font-medium",
                      item.bought && "line-through text-muted-foreground"
                    )}>
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">× {item.quantity}</span>
                    {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer"
                        className="text-accent hover:text-accent/80 tap-scale"
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => onDeleteItem(item.id)}
                      className="text-destructive/50 hover:text-destructive tap-scale">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add item */}
          <div className="flex items-center gap-2 p-3 border-t border-border/40 bg-muted/20">
            <Input
              placeholder="Додати товар..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="h-10 text-sm bg-transparent border-border/40 focus:border-primary/50"
            />
            <Input
              placeholder="Кіл."
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="h-10 text-sm w-16 bg-transparent border-border/40 focus:border-primary/50"
            />
            <button
              onClick={handleAdd}
              className="w-10 h-10 rounded-xl bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-primary tap-scale transition-all flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
