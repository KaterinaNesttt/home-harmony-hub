import { useMemo, useRef, useState } from 'react';
import { Camera, Check, CheckSquare, LogOut, ShoppingCart, Shirt, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WardrobeItem, WardrobeSeason } from '@/types';
import { WARDROBE_CATEGORIES, WARDROBE_SEASONS } from '@/types';

interface AccountPageProps {
  profile: { display_name: string; avatar_url: string | null } | null;
  email: string;
  onUpdateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<{ error: unknown }>;
  onUploadAvatar: (file: File | Blob) => Promise<{ error: unknown; url: string | null }>;
  onSignOut: () => void;
  taskCount: number;
  doneCount: number;
  listCount: number;
  wardrobeItems: WardrobeItem[];
  wardrobeLoading: boolean;
  onAddWardrobeItem: (item: Omit<WardrobeItem, 'id' | 'userId' | 'createdAt' | 'photoUrl'>) => Promise<WardrobeItem | null>;
  onUpdateWardrobeItem: (id: string, updates: Partial<WardrobeItem>) => Promise<WardrobeItem | null>;
  onDeleteWardrobeItem: (id: string) => Promise<void>;
  onUploadWardrobePhoto: (file: File | Blob) => Promise<{ data: { photo_key: string } | null; error: string | null }>;
}

type WardrobeFormState = {
  id?: string;
  name: string;
  category: (typeof WARDROBE_CATEGORIES)[number];
  seasons: WardrobeSeason[];
  colors: string;
  tempMin: string;
  tempMax: string;
  description: string;
  photoKey?: string | null;
  photoPreview?: string | null;
};

const EMPTY_WARDROBE_FORM: WardrobeFormState = {
  name: '',
  category: 'Верхній одяг',
  seasons: ['Весна'],
  colors: '',
  tempMin: '',
  tempMax: '',
  description: '',
  photoKey: null,
  photoPreview: null,
};

export function AccountPage({
  profile,
  email,
  onUpdateProfile,
  onUploadAvatar,
  onSignOut,
  taskCount,
  doneCount,
  listCount,
  wardrobeItems,
  wardrobeLoading,
  onAddWardrobeItem,
  onUpdateWardrobeItem,
  onDeleteWardrobeItem,
  onUploadWardrobePhoto,
}: AccountPageProps) {
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wardrobeForm, setWardrobeForm] = useState<WardrobeFormState>(EMPTY_WARDROBE_FORM);
  const [savingWardrobe, setSavingWardrobe] = useState(false);
  const [deletingWardrobeId, setDeletingWardrobeId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wardrobeFileRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => (profile?.display_name || email || '?').slice(0, 2).toUpperCase(), [email, profile?.display_name]);

  const stats = [
    { label: 'Активних задач', value: taskCount, icon: <CheckSquare className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/15' },
    { label: 'Виконано', value: doneCount, icon: <Check className="w-5 h-5" />, color: 'text-green-500', bg: 'bg-green-500/15' },
    { label: 'Списків', value: listCount, icon: <ShoppingCart className="w-5 h-5" />, color: 'text-accent', bg: 'bg-accent/15' },
  ];

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await onUpdateProfile({ display_name: name.trim() });
    setSaving(false);
    if (error) toast.error('Не вдалося зберегти ім’я');
    else toast.success("Ім'я оновлено");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    setUploadingAvatar(true);
    const { error } = await onUploadAvatar(blob);
    setUploadingAvatar(false);
    setAvatarPreview(null);
    if (error) toast.error('Не вдалося завантажити аватар');
    else toast.success('Аватар оновлено');
  };

  const openCreateDrawer = () => {
    setWardrobeForm(EMPTY_WARDROBE_FORM);
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: WardrobeItem) => {
    setWardrobeForm({
      id: item.id,
      name: item.name,
      category: item.category,
      seasons: item.seasons,
      colors: item.colors || '',
      tempMin: item.tempMin?.toString() || '',
      tempMax: item.tempMax?.toString() || '',
      description: item.description || '',
      photoKey: item.photoKey || null,
      photoPreview: item.photoUrl || null,
    });
    setDrawerOpen(true);
  };

  const handleWardrobePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setWardrobeForm((prev) => ({ ...prev, photoPreview: reader.result as string }));
    };
    reader.readAsDataURL(file);
    const upload = await onUploadWardrobePhoto(file);
    if (upload.error || !upload.data) {
      toast.error('Не вдалося завантажити фото речі');
    } else {
      setWardrobeForm((prev) => ({ ...prev, photoKey: upload.data?.photo_key || null }));
      toast.success('Фото речі завантажено');
    }
    event.target.value = '';
  };

  const toggleSeason = (season: WardrobeSeason) => {
    setWardrobeForm((prev) => ({
      ...prev,
      seasons: prev.seasons.includes(season)
        ? prev.seasons.filter((item) => item !== season)
        : [...prev.seasons, season],
    }));
  };

  const saveWardrobeItem = async () => {
    if (!wardrobeForm.name.trim()) {
      toast.error('Вкажи назву речі');
      return;
    }
    setSavingWardrobe(true);
    const payload = {
      name: wardrobeForm.name.trim(),
      category: wardrobeForm.category,
      seasons: wardrobeForm.seasons,
      colors: wardrobeForm.colors.trim() || null,
      tempMin: wardrobeForm.tempMin ? Number(wardrobeForm.tempMin) : null,
      tempMax: wardrobeForm.tempMax ? Number(wardrobeForm.tempMax) : null,
      description: wardrobeForm.description.trim() || null,
      photoKey: wardrobeForm.photoKey || null,
    };

    const saved = wardrobeForm.id
      ? await onUpdateWardrobeItem(wardrobeForm.id, payload)
      : await onAddWardrobeItem(payload);

    setSavingWardrobe(false);
    if (!saved) {
      toast.error('Не вдалося зберегти річ');
      return;
    }

    toast.success(wardrobeForm.id ? 'Річ оновлено' : 'Річ додано');
    setDrawerOpen(false);
    setWardrobeForm(EMPTY_WARDROBE_FORM);
  };

  const deleteWardrobeItem = async (id: string) => {
    setDeletingWardrobeId(id);
    await onDeleteWardrobeItem(id);
    setDeletingWardrobeId(null);
    toast.success('Річ видалено');
  };

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      <h1 className="text-2xl font-bold font-display">Профіль</h1>

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
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((item, index) => (
          <div key={index} className="glass rounded-2xl p-3 text-center">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', item.bg, item.color)}>
              {item.icon}
            </div>
            <p className={cn('text-2xl font-bold font-display', item.color)}>{item.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold">Ваше ім’я</h3>
        </div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleSaveName()}
            placeholder="Введіть ім’я"
            className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary/50 rounded-xl"
          />
          <button
            onClick={() => void handleSaveName()}
            disabled={saving || !name.trim()}
            className="btn-gold h-12 px-5 rounded-xl font-bold tap-scale disabled:opacity-50"
          >
            {saving ? '...' : 'OK'}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Shirt className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="font-bold">Мій гардероб</h3>
              <p className="text-xs text-muted-foreground">Особисті речі для погодних рекомендацій</p>
            </div>
          </div>
          <button onClick={openCreateDrawer} className="btn-gold px-4 py-2 rounded-xl text-sm font-bold">
            + Додати одяг
          </button>
        </div>

        {wardrobeLoading ? (
          <p className="text-sm text-muted-foreground">Завантажуємо гардероб...</p>
        ) : wardrobeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Поки що тут порожньо. Додай базові речі, щоб сторінка погоди могла підбирати образ.</p>
        ) : (
          <div className="space-y-3">
            {wardrobeItems.map((item) => (
              <div key={item.id} className="glass rounded-2xl p-3 flex gap-3">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">🧥</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditDrawer(item)} className="text-xs font-semibold text-primary">
                        Редагувати
                      </button>
                      <button
                        onClick={() => void deleteWardrobeItem(item.id)}
                        disabled={deletingWardrobeId === item.id}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.seasons.map((season) => (
                      <span key={season} className="px-2 py-1 rounded-full bg-muted text-[11px]">
                        {season}
                      </span>
                    ))}
                    {(item.tempMin !== null || item.tempMax !== null) && (
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-[11px] text-primary">
                        {item.tempMin ?? '…'}° .. {item.tempMax ?? '…'}°
                      </span>
                    )}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-2">{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onSignOut}
        className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-3 text-destructive border-destructive/20 hover:bg-destructive/10 tap-scale transition-all font-bold text-base"
      >
        <LogOut className="w-5 h-5" />
        Вийти з акаунту
      </button>

      <AvatarCropDialog
        open={!!avatarPreview}
        imageSrc={avatarPreview}
        onConfirm={handleCropConfirm}
        onCancel={() => setAvatarPreview(null)}
        uploading={uploadingAvatar}
      />

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>{wardrobeForm.id ? 'Редагувати річ' : 'Додати одяг'}</DrawerTitle>
            <DrawerDescription>Заповни базові параметри, щоб погода могла підбирати образ точніше.</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 overflow-y-auto space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Фото</p>
              <div className="flex items-center gap-3">
                {wardrobeForm.photoPreview ? (
                  <img src={wardrobeForm.photoPreview} alt="Wardrobe preview" className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-3xl">🧥</div>
                )}
                <div>
                  <button onClick={() => wardrobeFileRef.current?.click()} className="glass px-4 py-2 rounded-xl text-sm font-semibold">
                    Завантажити фото
                  </button>
                  <input ref={wardrobeFileRef} type="file" accept="image/*" className="hidden" onChange={handleWardrobePhotoSelect} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Назва</p>
              <Input value={wardrobeForm.name} onChange={(event) => setWardrobeForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Категорія</p>
              <select
                value={wardrobeForm.category}
                onChange={(event) => setWardrobeForm((prev) => ({ ...prev, category: event.target.value as WardrobeFormState['category'] }))}
                className="w-full h-12 rounded-xl border border-border bg-background px-3 text-sm"
              >
                {WARDROBE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Сезони</p>
              <div className="grid grid-cols-2 gap-2">
                {WARDROBE_SEASONS.map((season) => (
                  <button
                    key={season}
                    type="button"
                    onClick={() => toggleSeason(season)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-medium',
                      wardrobeForm.seasons.includes(season) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background',
                    )}
                  >
                    {season}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Колір</p>
                <Input value={wardrobeForm.colors} onChange={(event) => setWardrobeForm((prev) => ({ ...prev, colors: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Темп. від / до</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={wardrobeForm.tempMin} onChange={(event) => setWardrobeForm((prev) => ({ ...prev, tempMin: event.target.value }))} />
                  <Input type="number" value={wardrobeForm.tempMax} onChange={(event) => setWardrobeForm((prev) => ({ ...prev, tempMax: event.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Короткий опис</p>
              <Textarea value={wardrobeForm.description} onChange={(event) => setWardrobeForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={() => void saveWardrobeItem()} disabled={savingWardrobe}>
              {savingWardrobe ? 'Зберігаю...' : 'Зберегти'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
