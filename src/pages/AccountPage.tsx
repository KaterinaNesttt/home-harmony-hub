import { useState, useRef } from 'react';
import {
  Camera, LogOut, Download, Moon, Sun, User, CheckSquare,
  ShoppingCart, Star, Shield, Bell, Palette, ChevronRight,
  Smartphone, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface AccountPageProps {
  profile: { display_name: string; avatar_url: string | null } | null;
  email: string;
  onUpdateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<{ error: unknown }>;
  onUploadAvatar: (file: File | Blob) => Promise<{ error: unknown; url: string | null }>;
  onSignOut: () => void;
  taskCount: number;
  doneCount: number;
  listCount: number;
}

export function AccountPage({ profile, email, onUpdateProfile, onUploadAvatar, onSignOut, taskCount, doneCount, listCount }: AccountPageProps) {
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { dark, toggle } = useTheme();

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await onUpdateProfile({ display_name: name.trim() });
    if (error) toast.error('Помилка збереження');
    else toast.success('✨ Ім\'я оновлено');
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
    else toast.success('🎉 Аватар оновлено');
    setUploadingAvatar(false);
    setAvatarPreview(null);
  };

  const initials = (profile?.display_name || email || '?').slice(0, 2).toUpperCase();

  const stats = [
    { label: 'Активних задач', value: taskCount, icon: <CheckSquare className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/15' },
    { label: 'Виконано', value: doneCount, icon: <Check className="w-5 h-5" />, color: 'text-green-500', bg: 'bg-green-500/15' },
    { label: 'Списків', value: listCount, icon: <ShoppingCart className="w-5 h-5" />, color: 'text-accent', bg: 'bg-accent/15' },
  ];

  const iosSteps = [
    { emoji: '1️⃣', text: 'Відкрийте сайт у Safari' },
    { emoji: '2️⃣', text: 'Натисніть кнопку «Поділитися» (квадрат зі стрілкою)' },
    { emoji: '3️⃣', text: 'Прокрутіть і оберіть «На Початковий екран»' },
    { emoji: '4️⃣', text: 'Натисніть «Додати»' },
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Профіль</h1>
        <button
          onClick={toggle}
          className={cn(
            "w-12 h-12 rounded-2xl glass flex items-center justify-center tap-scale transition-all",
            dark ? "text-yellow-400" : "text-slate-600"
          )}
        >
          {dark
            ? <Sun className="w-6 h-6 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
            : <Moon className="w-6 h-6" />
          }
        </button>
      </div>

      {/* Avatar + name card */}
      <div className="glass-strong rounded-3xl p-6 text-center animate-scale-in">
        <div className="relative inline-block mb-4">
          <Avatar className="w-24 h-24 ring-4 ring-primary/30 ring-offset-4 ring-offset-card shadow-gold">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
            <AvatarFallback className="bg-gradient-to-br from-gold to-yellow-600 text-background font-bold text-3xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-9 h-9 btn-gold rounded-full flex items-center justify-center shadow-gold tap-scale"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        <h2 className="text-xl font-bold font-display text-gold">{profile?.display_name || 'Користувач'}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{email}</p>

        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">Онлайн</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 stagger">
        {stats.map((s, i) => (
          <div key={i} className="glass rounded-2xl p-3 text-center animate-fade-in card-hover">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2", s.bg, s.color)}>
              {s.icon}
            </div>
            <p className={cn("text-2xl font-bold font-display", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit name */}
      <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold">Ваше ім'я</h3>
        </div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            placeholder="Введіть ім'я"
            className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary/50 rounded-xl"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || !name.trim()}
            className="btn-gold h-12 px-5 rounded-xl font-bold tap-scale disabled:opacity-50"
          >
            {saving ? '...' : 'OK'}
          </button>
        </div>
      </div>

      {/* Settings sections */}
      <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="px-4 py-3 border-b border-border/40">
          <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Налаштування</h3>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors tap-scale"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <Palette className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Тема оформлення</p>
              <p className="text-xs text-muted-foreground">{dark ? 'Темна тема' : 'Світла тема'}</p>
            </div>
          </div>
          <div className={cn(
            "w-12 h-6 rounded-full transition-all relative",
            dark ? "bg-primary" : "bg-muted"
          )}>
            <span className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
              dark ? "left-6" : "left-0.5"
            )} />
          </div>
        </button>

        <div className="border-t border-border/30">
          <button
            onClick={() => setShowInstall(true)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors tap-scale"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Встановити додаток</p>
                <p className="text-xs text-muted-foreground">PWA на головний екран</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-3 text-destructive border-destructive/20 hover:bg-destructive/10 tap-scale transition-all font-bold text-base animate-slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        <LogOut className="w-5 h-5" />
        Вийти з акаунту
      </button>

      {/* Avatar crop dialog */}
      <AvatarCropDialog
        open={!!avatarPreview}
        imageSrc={avatarPreview}
        onConfirm={handleCropConfirm}
        onCancel={() => setAvatarPreview(null)}
        uploading={uploadingAvatar}
      />

      {/* Install dialog */}
      {showInstall && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 animate-fade-in p-4"
          onClick={() => setShowInstall(false)}
        >
          <div
            className="glass-strong w-full max-w-md rounded-3xl p-6 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 btn-gold rounded-2xl flex items-center justify-center text-2xl shadow-gold">
                🏠
              </div>
              <div>
                <h3 className="font-bold text-lg font-display">Встановити HomeHub</h3>
                <p className="text-sm text-muted-foreground">Інструкція для iOS</p>
              </div>
            </div>

            <div className="space-y-3">
              {iosSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 glass rounded-xl p-3 animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
                  <span className="text-xl">{step.emoji}</span>
                  <p className="text-sm font-medium">{step.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowInstall(false)}
              className="btn-gold w-full mt-5 py-3.5 rounded-2xl font-bold text-base tap-scale"
            >
              Зрозуміло!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
