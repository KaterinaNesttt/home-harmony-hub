import { useEffect, useState } from 'react';
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
  const [category, setCategory] = useState<Category>('Р”С–Рј');
  const [access, setAccess] = useState<AccessType>('shared');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    setAssignee(currentUserId);
  }, [currentUserId, open]);

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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/50 animate-fade-in backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 btn-gold rounded-2xl flex items-center justify-center shadow-gold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-display">РќРѕРІР° Р·Р°РґР°С‡Р°</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 glass rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            placeholder="РќР°Р·РІР° Р·Р°РґР°С‡С–"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            className="w-full h-14 px-4 glass rounded-2xl text-base font-semibold placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all border border-border/50"
          />

          <textarea
            placeholder="РћРїРёСЃ (РѕРїС†С–РѕРЅР°Р»СЊРЅРѕ)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 glass rounded-2xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all border border-border/50 resize-none"
          />

          <div>
            <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Р”РµРґР»Р°Р№РЅ</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full h-12 px-4 glass rounded-2xl text-sm focus:outline-none focus:border-primary/50 transition-all border border-border/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">РџСЂС–РѕСЂРёС‚РµС‚</label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 РќРёР·СЊРєРёР№</SelectItem>
                  <SelectItem value="medium">🟡 РЎРµСЂРµРґРЅС–Р№</SelectItem>
                  <SelectItem value="high">🔴 Р’РёСЃРѕРєРёР№</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">РҐС‚Рѕ</label>
              <Select value={assignee} onValueChange={v => setAssignee(v as Assignee)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {householdUsers.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.id === currentUserId ? '👤 Я' : '👥'} {person.display_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="both">🤝 РћР±РѕС”</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">РљР°С‚РµРіРѕСЂС–СЏ</label>
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
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Р”РѕСЃС‚СѓРї</label>
              <Select value={access} onValueChange={v => setAccess(v as AccessType)}>
                <SelectTrigger className="h-12 rounded-xl glass border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">🤝 РЎРїС–Р»СЊРЅР°</SelectItem>
                  <SelectItem value="private">🔒 РџСЂРёРІР°С‚РЅР°</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="btn-gold w-full h-14 rounded-2xl font-bold text-base tap-scale disabled:opacity-50 mt-1"
          >
            ✨ РЎС‚РІРѕСЂРёС‚Рё Р·Р°РґР°С‡Сѓ
          </button>
        </div>
      </div>
    </div>
  );
}
