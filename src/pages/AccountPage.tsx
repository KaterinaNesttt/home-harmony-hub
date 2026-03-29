import { useState, useRef, useCallback } from 'react';
import { Camera, LogOut, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [showInstall, setShowInstall] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleConfirmAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    const { error } = await onUploadAvatar(avatarFile);
    if (error) toast.error('Помилка завантаження');
    else toast.success('Аватар оновлено');
    setUploadingAvatar(false);
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const cancelAvatarPreview = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
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

      {/* Avatar preview dialog */}
      <Dialog open={!!avatarPreview} onOpenChange={(open) => !open && cancelAvatarPreview()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Попередній перегляд</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {avatarPreview && (
              <div className="relative">
                {/* Full image preview */}
                <div className="relative w-64 h-64 flex items-center justify-center overflow-hidden rounded-lg bg-muted">
                  <img src={avatarPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                  {/* Circle overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <svg width="100%" height="100%" viewBox="0 0 256 256">
                      <defs>
                        <mask id="circle-mask">
                          <rect width="256" height="256" fill="white" />
                          <circle cx="128" cy="128" r="96" fill="black" />
                        </mask>
                      </defs>
                      <rect width="256" height="256" fill="hsl(var(--background) / 0.6)" mask="url(#circle-mask)" />
                      <circle cx="128" cy="128" r="96" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 4" />
                    </svg>
                  </div>
                </div>
                {/* Mini circle preview */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                    <img src={avatarPreview} alt="Circle preview" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-muted-foreground">Так виглядатиме ваш аватар</p>
                </div>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={cancelAvatarPreview}>
                Скасувати
              </Button>
              <Button className="flex-1" onClick={handleConfirmAvatar} disabled={uploadingAvatar}>
                {uploadingAvatar ? 'Завантаження...' : 'Зберегти'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Install instructions dialog */}
      <Dialog open={showInstall} onOpenChange={setShowInstall}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Встановити на iOS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Інструкція:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Відкрийте цей сайт у <span className="font-medium text-foreground">Safari</span></li>
                <li>Натисніть кнопку <span className="font-medium text-foreground">«Поділитися»</span> (квадрат зі стрілкою внизу екрану)</li>
                <li>Прокрутіть вниз і оберіть <span className="font-medium text-foreground">«На Початковий екран»</span></li>
                <li>Натисніть <span className="font-medium text-foreground">«Додати»</span></li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">Додаток з'явиться на головному екрані як звичайний застосунок.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
