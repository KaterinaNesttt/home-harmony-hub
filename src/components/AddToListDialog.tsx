import { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ShoppingList, ShoppingItem, ShoppingListType, Category } from '@/types';
import { CATEGORIES } from '@/types';
import { useFrequentItems } from '@/hooks/useFrequentItems';

interface AddToListDialogProps {
  open: boolean;
  onClose: () => void;
  lists: ShoppingList[];
  onAddItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => void;
  onAddList: (list: Omit<ShoppingList, 'id' | 'createdAt' | 'items'>) => Promise<string>;
}

type Mode = 'existing' | 'new';

export function AddToListDialog({ open, onClose, lists, onAddItem, onAddList }: AddToListDialogProps) {
  const [mode, setMode] = useState<Mode>('existing');
  const [listId, setListId] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [showExtra, setShowExtra] = useState(false);

  // New list fields
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ShoppingListType>('daily');
  const [newCategory, setNewCategory] = useState<Category>('Дім');

  // Suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { recordItem, getSuggestions } = useFrequentItems();

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode('existing');
      setListId(lists[0]?.id || '');
      setName(''); setQuantity('1'); setUrl(''); setNote('');
      setShowExtra(false); setNewTitle('');
      setShowSuggestions(false);
      setSuggestions(getSuggestions(''));
      pendingItem.current = null;
      pendingListTitle.current = '';
    }
  }, [open]);

  // Update suggestions as user types
  useEffect(() => {
    setSuggestions(getSuggestions(name));
  }, [name]);

  if (!open) return null;

  const selectedList = lists.find(l => l.id === listId);
  const isWishlist = selectedList?.type === 'wishlist' || newType === 'wishlist';

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (mode === 'existing') {
      if (!listId) return;
      onAddItem(listId, {
        name: name.trim(),
        quantity: quantity.trim() || '1',
        bought: false,
        url: url.trim() || undefined,
        note: note.trim() || undefined,
      });
      recordItem(name.trim());
      onClose();
    } else {
      // New list mode — create list, get real id, then add item
      if (!newTitle.trim()) return;
      const item = {
        name: name.trim(),
        quantity: quantity.trim() || '1',
        bought: false as const,
        url: url.trim() || undefined,
        note: note.trim() || undefined,
      };
      onAddList({ title: newTitle.trim(), type: newType, category: newCategory, access: 'shared', pinned: false })
        .then(realId => {
          onAddItem(realId, item);
          recordItem(item.name);
          onClose();
        });
    }
  };

  const pickSuggestion = (s: string) => {
    setName(s);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/50 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 border border-accent/30 rounded-2xl flex items-center justify-center text-xl">➕</div>
            <h2 className="text-xl font-bold font-display">Додати в список</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 glass rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex glass rounded-2xl p-1 mb-4">
          {(['existing', 'new'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all tap-scale ${
                mode === m
                  ? 'bg-accent text-accent-foreground shadow-[0_2px_12px_hsla(217,80%,60%,0.3)]'
                  : 'text-muted-foreground'
              }`}
            >
              {m === 'existing' ? 'Існуючий' : '+ Новий список'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Existing list */}
          {mode === 'existing' && (
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
          )}

          {/* New list fields */}
          {mode === 'new' && (
            <div className="space-y-3 animate-scale-in">
              <input
                placeholder="Назва нового списку"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full h-12 px-4 glass rounded-xl text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={newType} onValueChange={v => setNewType(v as ShoppingListType)}>
                  <SelectTrigger className="h-11 rounded-xl glass border-border/50 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 Сьогодні</SelectItem>
                    <SelectItem value="global">📦 Майбутні</SelectItem>
                    <SelectItem value="wishlist">💫 Хотєлки</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newCategory} onValueChange={v => setNewCategory(v as Category)}>
                  <SelectTrigger className="h-11 rounded-xl glass border-border/50 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-xs text-muted-foreground font-medium px-1">Товар</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {/* Item name + qty */}
          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                placeholder="Назва товару"
                value={name}
                onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { setShowSuggestions(true); setSuggestions(getSuggestions(name)); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus={mode === 'existing'}
                className="w-full h-12 px-4 glass rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50"
              />

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 glass-strong rounded-xl border border-border/50 overflow-hidden z-20 animate-slide-down shadow-glass">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Часті товари</span>
                  </div>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => pickSuggestion(s)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors tap-scale text-left border-t border-border/20 first:border-t-0"
                    >
                      <span className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              placeholder="Кіл."
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-20 h-12 px-3 glass rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50 flex-shrink-0"
            />
          </div>

          {/* Extra fields */}
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

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || (mode === 'existing' ? !listId : !newTitle.trim())}
            className="w-full h-14 rounded-2xl font-bold text-base tap-scale disabled:opacity-50 bg-accent text-accent-foreground shadow-[0_4px_20px_hsla(217,80%,60%,0.35)] hover:opacity-90 transition-all mt-1"
          >
            <Plus className="w-5 h-5 inline-block mr-2" />
            {mode === 'new' ? 'Створити список і додати' : 'Додати товар'}
          </button>
        </div>
      </div>
    </div>
  );
}
