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
  onDeleteList: (listId: string) => void;
  onArchiveList: (listId: string) => void;
  onUnarchiveList: (listId: string) => void;
}

const filters: { id: ListFilter; label: string; emoji: string }[] = [
  { id: 'all',      label: 'Всі',      emoji: '📋' },
  { id: 'daily',    label: 'Сьогодні', emoji: '📅' },
  { id: 'global',   label: 'Майбутні', emoji: '📦' },
  { id: 'wishlist', label: 'Хотєлки',  emoji: '💫' },
];

export function ShoppingPage({ lists, onAddList, onToggleItem, onDeleteItem, onAddItem, onDeleteList, onArchiveList, onUnarchiveList }: ShoppingPageProps) {
  const [filter, setFilter] = useState<ListFilter>('daily');

  const filtered = (() => {
    if (filter === 'all') return lists; // show all, including archived
    return lists.filter(l => l.type === filter && !l.archived);
  })();

  const sorted = [...filtered].sort((a, b) => {
    // archived always at bottom
    if (a.archived && !b.archived) return 1;
    if (!a.archived && b.archived) return -1;
    return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  });

  const totalToBuy = lists
    .filter(l => !l.archived)
    .reduce((s, l) => s + l.items.filter(i => !i.bought).length, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Покупки</h1>
          <p className="text-sm text-muted-foreground">{totalToBuy} товарів до покупки</p>
        </div>
        <button
          onClick={onAddList}
          className="w-12 h-12 rounded-2xl glass border-accent/20 flex items-center justify-center text-accent tap-scale card-hover shadow-glass"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all tap-scale ${
              filter === f.id
                ? 'bg-accent text-accent-foreground shadow-[0_4px_16px_hsla(217,80%,60%,0.3)]'
                : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{f.emoji}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground/60 text-center -mt-1">
        ← свайп вліво — видалити · свайп вправо — архів
      </p>

      {/* Lists */}
      <div className="space-y-3 stagger">
        {sorted.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center animate-scale-in">
            <div className="text-4xl mb-3 animate-float">🛒</div>
            <p className="font-bold text-foreground">Немає списків</p>
            <p className="text-sm text-muted-foreground mt-1">Натисніть + щоб створити список</p>
          </div>
        ) : (
          sorted.map(list => (
            <ShoppingListCard
              key={list.id}
              list={list}
              onToggleItem={itemId => onToggleItem(list.id, itemId)}
              onDeleteItem={itemId => onDeleteItem(list.id, itemId)}
              onAddItem={item => onAddItem(list.id, item)}
              onDelete={() => onDeleteList(list.id)}
              onArchive={() => onArchiveList(list.id)}
              onUnarchive={() => onUnarchiveList(list.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
