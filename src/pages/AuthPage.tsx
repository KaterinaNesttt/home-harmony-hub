import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AuthPageProps {
  onAuth: (mode: 'login' | 'signup', email: string, password: string, name?: string) => Promise<{ error: unknown }>;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await onAuth(mode, email, password, name);
    if (error) {
      const msg = (error as Error).message || String(error);
      if (msg.includes('already')) toast.error('Цей email вже зареєстровано');
      else if (msg.includes('credentials') || msg.includes('Invalid')) toast.error('Невірний email або пароль');
      else toast.error(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-scale-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 btn-gold rounded-3xl flex items-center justify-center text-4xl shadow-gold-lg animate-float mx-auto">
              🏠
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-display text-gold-shimmer">HomeHub</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === 'login' ? 'З поверненням! 👋' : 'Створіть спільний дім 🏡'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-6 shadow-glass">

          {/* Mode switcher */}
          <div className="flex glass rounded-2xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all tap-scale ${
                  mode === m
                    ? 'btn-gold shadow-gold'
                    : 'text-muted-foreground'
                }`}
              >
                {m === 'login' ? 'Увійти' : 'Реєстрація'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative animate-slide-down">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ваше ім'я"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full h-14 pl-12 pr-4 bg-muted/40 border border-border/50 rounded-2xl text-base font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-muted/60 transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-14 pl-12 pr-4 bg-muted/40 border border-border/50 rounded-2xl text-base font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-muted/60 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full h-14 pl-12 pr-12 bg-muted/40 border border-border/50 rounded-2xl text-base font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-muted/60 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground tap-scale"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 tap-scale disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Увійти' : 'Створити акаунт'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === 'login' ? 'Немає акаунту?' : 'Вже є акаунт?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-primary font-bold hover:text-primary/80 transition-colors tap-scale"
          >
            {mode === 'login' ? 'Зареєструватися' : 'Увійти'}
          </button>
        </p>
      </div>
    </div>
  );
}
