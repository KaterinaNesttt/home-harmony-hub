import { useState, useRef } from 'react';
import { Camera, LogOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';
import { toast } from 'sonner';

interface AccountPageProps {
  profile: { display_name: string; avatar_url: string | null } | null;
  email: string;
  onUpdateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<{ error: any }>;
  onUploadAvatar: (file: File | Blob) => Promise<{ error: any; url: string | null }>;
  onSignOut: () => void;
}

export function AccountPage({ profile, email, onUpdateProfile, onUploadAvatar, onSignOut }: AccountPageProps) {
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await onUpdateProfile({ display_name: name.trim() });
    if (error) toast.error('Помилка збереження');
    else toast.success('Ім\'я оновлено');
    setSaving(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    setUploadingAvatar(true);
    const { error } = await onUploadAvatar(blob);
    if (error) toast.error('Помилка завантаження');
    else toast.success('Аватар оновлено');
    setUploadingAvatar(false);
    setAvatarPreview(null);
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
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

      <Button variant="outline" className="w-full" onClick={() => setShowInstall(true)}>
        <Download className="w-4 h-4 mr-2" /> Встановити додаток
      </Button>

      <Button variant="outline" className="w-full text-destructive" onClick={onSignOut}>
        <LogOut className="w-4 h-4 mr-2" /> Вийти
      </Button>

      <AvatarCropDialog
        open={!!avatarPreview}
        imageSrc={avatarPreview}
        onConfirm={handleCropConfirm}
        onCancel={() => setAvatarPreview(null)}
        uploading={uploadingAvatar}
      />

      <Dialog open={showInstall} onOpenChange={setShowInstall}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Встановити на iOS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="font-medium">Інструкція:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Відкрийте цей сайт у <span className="font-medium text-foreground">Safari</span></li>
              <li>Натисніть кнопку <span className="font-medium text-foreground">«Поділитися»</span> (квадрат зі стрілкою внизу екрану)</li>
              <li>Прокрутіть вниз і оберіть <span className="font-medium text-foreground">«На Початковий екран»</span></li>
              <li>Натисніть <span className="font-medium text-foreground">«Додати»</span></li>
            </ol>
            <p className="text-xs text-muted-foreground">Додаток з'явиться на головному екрані як звичайний застосунок.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
