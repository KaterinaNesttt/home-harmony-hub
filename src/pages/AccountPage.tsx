import { useState, useRef } from 'react';
import { Camera, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface AccountPageProps {
  profile: { display_name: string; avatar_url: string | null } | null;
  email: string;
  onUpdateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<{ error: any }>;
  onUploadAvatar: (file: File) => Promise<{ error: any; url: string | null }>;
  onSignOut: () => void;
}

export function AccountPage({ profile, email, onUpdateProfile, onUploadAvatar, onSignOut }: AccountPageProps) {
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await onUpdateProfile({ display_name: name.trim() });
    if (error) toast.error('Помилка збереження');
    else toast.success('Ім\'я оновлено');
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { error } = await onUploadAvatar(file);
    if (error) toast.error('Помилка завантаження');
    else toast.success('Аватар оновлено');
  };

  const initials = (profile?.display_name || email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold">Акаунт</h1>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="w-24 h-24">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
            <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-md hover:opacity-90"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Ім'я</label>
        <div className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше ім'я" />
          <Button onClick={handleSaveName} disabled={saving || !name.trim()}>
            {saving ? '...' : 'Зберегти'}
          </Button>
        </div>
      </div>

      <Button variant="outline" className="w-full text-destructive" onClick={onSignOut}>
        <LogOut className="w-4 h-4 mr-2" /> Вийти
      </Button>
    </div>
  );
}
