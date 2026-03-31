import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return { dark: true, toggle: () => {} };
}
