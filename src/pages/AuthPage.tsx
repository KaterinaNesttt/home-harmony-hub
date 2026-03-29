import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AuthPageProps {
  onAuth: (mode: 'login' | 'signup', email: string, password: string, name?: string) => Promise<{ error: any }>;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await onAuth(mode, email, password, name);
    if (error) toast.error(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">🏠 Домашній</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'login' ? 'Увійдіть у свій акаунт' : 'Створіть новий акаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input placeholder="Ваше ім'я" value={name} onChange={e => setName(e.target.value)} required />
          )}
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Увійти' : 'Зареєструватися'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? 'Немає акаунту?' : 'Вже є акаунт?'}{' '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-primary font-medium hover:underline">
            {mode === 'login' ? 'Зареєструватися' : 'Увійти'}
          </button>
        </p>
      </div>
    </div>
  );
}
