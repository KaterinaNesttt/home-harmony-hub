import { useState } from 'react';
import { Check, Trash2, ExternalLink, Plus, Pin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ShoppingList, ShoppingItem } from '@/types';

interface ShoppingListCardProps {
  list: ShoppingList;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (item: Omit<ShoppingItem, 'id'>) => void;
}

export function ShoppingListCard({ list, onToggleItem, onDeleteItem, onAddItem }: ShoppingListCardProps) {
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');
  const boughtCount = list.items.filter(i => i.bought).length;

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAddItem({ name: newItem.trim(), quantity: newQty.trim() || '1', bought: false });
    setNewItem(''); setNewQty('');
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {list.pinned && <Pin className="w-3 h-3 text-accent" />}
            <h3 className="font-semibold text-sm">{list.title}</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {boughtCount}/{list.items.length}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1 mt-2">
          <div
            className="bg-primary h-1 rounded-full transition-all"
            style={{ width: list.items.length ? `${(boughtCount / list.items.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="divide-y divide-border">
        {list.items.map(item => (
          <div key={item.id} className={cn("flex items-center gap-3 px-4 py-3 group", item.bought && "opacity-50")}>
            <button onClick={() => onToggleItem(item.id)}
              className={cn("w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                item.bought ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
              )}
            >
              {item.bought && <Check className="w-3 h-3 text-primary-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <span className={cn("text-sm", item.bought && "line-through text-muted-foreground")}>{item.name}</span>
              <span className="text-xs text-muted-foreground ml-2">× {item.quantity}</span>
              {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
            </div>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80" onClick={e => e.stopPropagation()}>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button onClick={() => onDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-opacity">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-border">
        <Input placeholder="Додати..." value={newItem} onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} className="h-8 text-sm" />
        <Input placeholder="К-ть" value={newQty} onChange={e => setNewQty(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} className="h-8 text-sm w-16" />
        <button onClick={handleAdd} className="text-primary hover:text-primary/80 p-1">
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
