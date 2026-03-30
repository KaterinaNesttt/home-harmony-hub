import { useState, useEffect, useCallback } from 'react';
import { cfAuth, type CFUser } from '@/integrations/cloudflare/client';

export function useAuth() {
  const [user, setUser] = useState<CFUser | null>(() => cfAuth.getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = cfAuth.getStoredUser();
    if (stored) {
      setUser(stored);
      // silently refresh profile
      cfAuth.refreshProfile().then(u => { if (u) setUser(u); });
    }
    setLoading(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { user: u, error } = await cfAuth.signUp(email, password, displayName);
    if (u) setUser(u);
    return { error: error ? new Error(error) : null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u, error } = await cfAuth.signIn(email, password);
    if (u) setUser(u);
    return { error: error ? new Error(error) : null };
  }, []);

  const signOut = useCallback(() => {
    cfAuth.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: { display_name?: string; avatar_url?: string }) => {
    const { data, error } = await cfAuth.updateProfile(updates);
    if (data) setUser(data);
    return { error: error ? new Error(error) : null };
  }, []);

  // Avatar: convert to base64 data URL and store in profile (no separate storage)
  const uploadAvatar = useCallback(async (file: File | Blob): Promise<{ error: Error | null; url: string | null }> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = async () => {
        const url = reader.result as string;
        const { error } = await cfAuth.updateProfile({ avatar_url: url });
        if (error) resolve({ error: new Error(error), url: null });
        else {
          const updated = cfAuth.getStoredUser();
          if (updated) setUser(updated);
          resolve({ error: null, url });
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // profile shape for compatibility with existing components
  const profile = user ? { display_name: user.display_name, avatar_url: user.avatar_url } : null;

  return { user, profile, loading, signUp, signIn, signOut, updateProfile, uploadAvatar };
}
