import { useState } from 'react';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ShoppingList, Category, AccessType, ShoppingListType } from '@/types';
import { CATEGORIES } from '@/types';

interface AddListDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (list: Omit<ShoppingList, 'id' | 'createdAt' | 'items'>) => void;
}

export function AddListDialog({ open, onClose, onAdd }: AddListDialogProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ShoppingListType>('daily');
  const [category, setCategory] = useState<Category>('Дім');
  const [access, setAccess] = useState<AccessType>('shared');

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), type, category, access, pinned: false });
    setTitle('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-foreground/50 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + env(keyboard-inset-height, 0px))',
      }}
    >
      <div
        className="glass-strong w-full max-w-md rounded-3xl p-6 animate-slide-up max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(keyboard-inset-height, 0px) - 16px)' }}
      >

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 border border-accent/30 rounded-2xl flex items-center justify-center text-xl">
              🛒
            </div>
            <h2 className="text-xl font-bold font-display">Новий список</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 glass rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            placeholder="Назва списку"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full h-14 px-4 glass rounded-2xl text-base font-semibold placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all border border-border/50"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Тип</label>
              <Select value={type} onValueChange={v => setType(v as ShoppingListType)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📅 Сьогодні</SelectItem>
                  <SelectItem value="global">📦 Майбутні</SelectItem>
                  <SelectItem value="wishlist">💫 Хотєлки</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Категорія</label>
              <Select value={category} onValueChange={v => setCategory(v as Category)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Доступ</label>
            <Select value={access} onValueChange={v => setAccess(v as AccessType)}>
              <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">🤝 Спільний</SelectItem>
                <SelectItem value="private">🔒 Приватний</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full h-14 rounded-2xl font-bold text-base tap-scale disabled:opacity-50 bg-accent text-accent-foreground shadow-[0_4px_20px_hsla(217,80%,60%,0.35)] hover:opacity-90 transition-all"
          >
            🛒 Створити список
          </button>
        </div>
      </div>
    </div>
  );
}
