import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 animate-fade-in" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Новий список</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <Input placeholder="Назва списку" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Select value={type} onValueChange={v => setType(v as ShoppingListType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">📅 На день</SelectItem>
                <SelectItem value="global">🌐 Глобальний</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={v => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Select value={access} onValueChange={v => setAccess(v as AccessType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="shared">🤝 Спільний</SelectItem>
              <SelectItem value="private">🔒 Приватний</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSubmit} className="w-full" disabled={!title.trim()}>Створити список</Button>
        </div>
      </div>
    </div>
  );
}
