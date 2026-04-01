import { useEffect, useRef, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CFHouseholdUser } from '@/integrations/cloudflare/client';
import type { AccessType, Assignee, Category, Task, TaskPriority } from '@/types';
import { CATEGORIES } from '@/types';

interface AddTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  currentUserId: string;
  householdUsers: CFHouseholdUser[];
}

export function AddTaskDialog({ open, onClose, onAdd, currentUserId, householdUsers }: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignee, setAssignee] = useState<Assignee>(currentUserId);
  const [category, setCategory] = useState<Category>('Дім');
  const [access, setAccess] = useState<AccessType>('shared');
  const [deadline, setDeadline] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAssignee(currentUserId);
  }, [currentUserId, open]);

  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - window.visualViewport!.height);
      setKeyboardOffset(offset);
    };
    updateKeyboardOffset();
    window.visualViewport.addEventListener('resize', updateKeyboardOffset);
    return () => window.visualViewport?.removeEventListener('resize', updateKeyboardOffset);
  }, [open]);

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
    setTitle('');
    setDescription('');
    setDeadline('');
    setAssignee(currentUserId);
    setAssigneeQuery('');
    onClose();
  };

  const filteredUsers = householdUsers.filter((person) => {
    const query = assigneeQuery.trim().toLowerCase();
    if (!query) return true;
    return person.display_name.toLowerCase().includes(query) || person.email.toLowerCase().includes(query);
  });

  const scrollFocusedFieldIntoView = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || !modalRef.current?.contains(active)) return;
    window.setTimeout(() => {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 220);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-foreground/50 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardOffset}px)`,
      }}
    >
      <div
        ref={modalRef}
        className="glass-strong w-full max-w-md rounded-3xl p-6 animate-slide-up max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: `calc(100dvh - env(safe-area-inset-top, 0px) - ${keyboardOffset}px - 16px)` }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 btn-gold rounded-2xl flex items-center justify-center shadow-gold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-display">Нова задача</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 glass rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            placeholder="Назва задачі"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={scrollFocusedFieldIntoView}
            className="w-full h-14 px-4 glass rounded-2xl text-base font-semibold placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all border border-border/50"
          />

          <textarea
            placeholder="Опис (опціонально)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onFocus={scrollFocusedFieldIntoView}
            rows={2}
            className="w-full px-4 py-3 glass rounded-2xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all border border-border/50 resize-none"
          />

          <div>
            <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Дедлайн</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              onFocus={scrollFocusedFieldIntoView}
              className="w-full h-12 px-4 glass rounded-2xl text-sm focus:outline-none focus:border-primary/50 transition-all border border-border/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Пріоритет</label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Низький</SelectItem>
                  <SelectItem value="medium">🟡 Середній</SelectItem>
                  <SelectItem value="high">🔴 Високий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Хто</label>
              <Select value={assignee} onValueChange={v => setAssignee(v as Assignee)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2">
                    <input
                      value={assigneeQuery}
                      onChange={e => setAssigneeQuery(e.target.value)}
                      placeholder="Пошук по імені або email"
                      className="h-9 w-full rounded-md border border-border/60 bg-transparent px-2 text-sm"
                    />
                  </div>
                  {filteredUsers.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      <span className="inline-flex items-center gap-2">
                        <img
                          src={person.avatar_url || '/placeholder.svg'}
                          alt={person.display_name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span>{person.id === currentUserId ? '👤 Я' : person.display_name}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="both">🤝 Обоє</SelectItem>
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

            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Доступ</label>
              <Select value={access} onValueChange={v => setAccess(v as AccessType)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">🤝 Спільна</SelectItem>
                  <SelectItem value="private">🔒 Приватна</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="btn-gold w-full h-14 rounded-2xl font-bold text-base tap-scale disabled:opacity-50 mt-1"
          >
            ✨ Створити задачу
          </button>
        </div>
      </div>
    </div>
  );
}
