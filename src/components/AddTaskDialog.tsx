import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task, TaskPriority, Assignee, Category, AccessType } from '@/types';
import { CATEGORIES } from '@/types';

interface AddTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function AddTaskDialog({ open, onClose, onAdd }: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignee, setAssignee] = useState<Assignee>('me');
  const [category, setCategory] = useState<Category>('Дім');
  const [access, setAccess] = useState<AccessType>('shared');
  const [deadline, setDeadline] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      status: 'unseen',
      priority,
      assignee,
      category,
      access,
      pinned: false,
      deadline: deadline || undefined,
    });
    setTitle(''); setDescription(''); setDeadline('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 animate-fade-in" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Нова задача</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <Input placeholder="Назва задачі" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <Textarea placeholder="Опис (опціонально)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
              <SelectTrigger><SelectValue placeholder="Пріоритет" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Низький</SelectItem>
                <SelectItem value="medium">🟡 Середній</SelectItem>
                <SelectItem value="high">🔴 Високий</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assignee} onValueChange={v => setAssignee(v as Assignee)}>
              <SelectTrigger><SelectValue placeholder="Виконавець" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Я</SelectItem>
                <SelectItem value="partner">Партнер</SelectItem>
                <SelectItem value="both">Обидва</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={v => setCategory(v as Category)}>
              <SelectTrigger><SelectValue placeholder="Категорія" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={access} onValueChange={v => setAccess(v as AccessType)}>
              <SelectTrigger><SelectValue placeholder="Доступ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">🤝 Спільна</SelectItem>
                <SelectItem value="private">🔒 Приватна</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!title.trim()}>
            Створити задачу
          </Button>
        </div>
      </div>
    </div>
  );
}
