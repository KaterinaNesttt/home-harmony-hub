import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ShoppingList, ShoppingItem } from '@/types';

interface AddToListDialogProps {
  open: boolean;
  onClose: () => void;
  lists: ShoppingList[];
  onAddItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => void;
}

export function AddToListDialog({ open, onClose, lists, onAddItem }: AddToListDialogProps) {
  const [listId, setListId] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');

  if (!open) return null;

  const selectedList = lists.find(l => l.id === listId);
  const isWishlist = selectedList?.type === 'wishlist';

  const handleSubmit = () => {
    if (!listId || !name.trim()) return;
    onAddItem(listId, {
      name: name.trim(),
      quantity: quantity.trim() || '1',
      bought: false,
      url: url.trim() || undefined,
      note: note.trim() || undefined,
    });
    setName(''); setQuantity('1'); setUrl(''); setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 animate-fade-in" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Додати в список</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <Select value={listId} onValueChange={setListId}>
            <SelectTrigger><SelectValue placeholder="Оберіть список" /></SelectTrigger>
            <SelectContent>
              {lists.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.type === 'daily' ? '📅' : l.type === 'wishlist' ? '💫' : '📦'} {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input placeholder="Назва товару" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <Input placeholder="Кількість" value={quantity} onChange={e => setQuantity(e.target.value)} />

          {(isWishlist || url) && (
            <Input placeholder="Посилання (URL)" value={url} onChange={e => setUrl(e.target.value)} />
          )}
          {(isWishlist || note) && (
            <Input placeholder="Нотатка" value={note} onChange={e => setNote(e.target.value)} />
          )}

          {!isWishlist && !url && !note && (
            <button onClick={() => { setUrl(' '); setNote(' '); setTimeout(() => { setUrl(''); setNote(''); }, 0); }}
              className="text-xs text-primary hover:underline">+ Посилання / нотатка</button>
          )}

          <Button onClick={handleSubmit} className="w-full" disabled={!listId || !name.trim()}>
            Додати
          </Button>
        </div>
      </div>
    </div>
  );
}
