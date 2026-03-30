import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ShoppingList, ShoppingItem } from '@/types';

interface AddToListDialogProps {
  open: boolean;
  onClose: () => void;
  lists: ShoppingList[];
  onAddItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => void;
}

export function AddToListDialog({ open, onClose, lists, onAddItem }: AddToListDialogProps) {
  const [listId, setListId] = useState(lists[0]?.id || '');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [showExtra, setShowExtra] = useState(false);

  if (!open) return null;
  const selectedList = lists.find(l => l.id === listId);
  const isWishlist = selectedList?.type === 'wishlist';

  const handleSubmit = () => {
    if (!listId || !name.trim()) return;
    onAddItem(listId, { name: name.trim(), quantity: quantity.trim() || '1', bought: false, url: url.trim() || undefined, note: note.trim() || undefined });
    setName(''); setQuantity('1'); setUrl(''); setNote(''); setShowExtra(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/50 animate-fade-in backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 border border-accent/30 rounded-2xl flex items-center justify-center text-xl">➕</div>
            <h2 className="text-xl font-bold font-display">Додати в список</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 glass rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* List selector */}
          <Select value={listId} onValueChange={setListId}>
            <SelectTrigger className="h-12 rounded-xl glass border-border/50">
              <SelectValue placeholder="Оберіть список" />
            </SelectTrigger>
            <SelectContent>
              {lists.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.type === 'daily' ? '📅' : l.type === 'wishlist' ? '💫' : '📦'} {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <input
              placeholder="Назва товару"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
              className="flex-1 h-12 px-4 glass rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50"
            />
            <input
              placeholder="Кіл."
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-20 h-12 px-3 glass rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50"
            />
          </div>

          {(isWishlist || showExtra) && (
            <div className="space-y-2 animate-slide-down">
              <input
                placeholder="🔗 Посилання (URL)"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full h-12 px-4 glass rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50"
              />
              <input
                placeholder="📝 Нотатка"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full h-12 px-4 glass rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50"
              />
            </div>
          )}

          {!isWishlist && !showExtra && (
            <button onClick={() => setShowExtra(true)} className="text-xs text-accent font-semibold hover:text-accent/80 tap-scale">
              + Посилання і нотатка
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={!listId || !name.trim()}
            className="w-full h-14 rounded-2xl font-bold text-base tap-scale disabled:opacity-50 bg-accent text-accent-foreground shadow-[0_4px_20px_hsla(217,80%,60%,0.35)] hover:opacity-90 transition-all mt-1"
          >
            <Plus className="w-5 h-5 inline-block mr-2" />
            Додати товар
          </button>
        </div>
      </div>
    </div>
  );
}
