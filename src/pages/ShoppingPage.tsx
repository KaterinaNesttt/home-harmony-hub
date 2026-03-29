import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ShoppingListCard } from '@/components/ShoppingListCard';
import type { ShoppingList, ShoppingItem } from '@/types';

type ListFilter = 'all' | 'daily' | 'global' | 'wishlist';

interface ShoppingPageProps {
  lists: ShoppingList[];
  onAddList: () => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onAddItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => void;
}

export function ShoppingPage({ lists, onAddList, onToggleItem, onDeleteItem, onAddItem }: ShoppingPageProps) {
  const [filter, setFilter] = useState<ListFilter>('daily');

  const filtered = filter === 'all' ? lists : lists.filter(l => l.type === filter);
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const filters: { id: ListFilter; label: string }[] = [
    { id: 'all', label: 'Всі' },
    { id: 'daily', label: 'Сьогодні' },
    { id: 'global', label: 'Майбутні' },
    { id: 'wishlist', label: 'Хотєлки' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Покупки</h1>
        <button onClick={onAddList} className="bg-accent text-accent-foreground rounded-full p-2 hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
              filter === f.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}>{f.label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Немає списків</p>
          </div>
        ) : (
          sorted.map(list => (
            <ShoppingListCard key={list.id} list={list}
              onToggleItem={itemId => onToggleItem(list.id, itemId)}
              onDeleteItem={itemId => onDeleteItem(list.id, itemId)}
              onAddItem={item => onAddItem(list.id, item)} />
          ))
        )}
      </div>
    </div>
  );
}
