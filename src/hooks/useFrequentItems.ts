/**
 * useFrequentItems — зберігає і повертає найчастіші товари по списках покупок.
 * Зберігається в localStorage під ключем 'hhh_frequent_items'.
 * Структура: { [normalizedName]: { name: string, count: number, lastUsed: number } }
 */

import { useCallback } from 'react';

const KEY = 'hhh_frequent_items';
const MAX_SUGGESTIONS = 8;
const MAX_STORED = 100;

interface FrequentItem {
  name: string;
  count: number;
  lastUsed: number;
}

function load(): Record<string, FrequentItem> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function save(data: Record<string, FrequentItem>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export function useFrequentItems() {
  // Record a used item (call after successful add)
  const recordItem = useCallback((name: string) => {
    if (!name.trim()) return;
    const data = load();
    const key = normalize(name);
    data[key] = {
      name: name.trim(), // keep original casing of most recent use
      count: (data[key]?.count || 0) + 1,
      lastUsed: Date.now(),
    };
    // Trim to MAX_STORED by removing least used + oldest
    const entries = Object.entries(data);
    if (entries.length > MAX_STORED) {
      entries.sort((a, b) => {
        const scoreDiff = a[1].count - b[1].count;
        return scoreDiff !== 0 ? scoreDiff : a[1].lastUsed - b[1].lastUsed;
      });
      const trimmed = Object.fromEntries(entries.slice(entries.length - MAX_STORED));
      save(trimmed);
    } else {
      save(data);
    }
  }, []);

  // Get suggestions filtered by query (empty query → top items)
  const getSuggestions = useCallback((query: string): string[] => {
    const data = load();
    const q = normalize(query);
    const entries = Object.values(data);

    const filtered = q
      ? entries.filter(e => normalize(e.name).includes(q) && normalize(e.name) !== q)
      : entries;

    // Score = count * 1.0 + recency bonus (items used in last 7 days get +2)
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    filtered.sort((a, b) => {
      const scoreA = a.count + (now - a.lastUsed < week ? 2 : 0);
      const scoreB = b.count + (now - b.lastUsed < week ? 2 : 0);
      return scoreB - scoreA;
    });

    return filtered.slice(0, MAX_SUGGESTIONS).map(e => e.name);
  }, []);

  return { recordItem, getSuggestions };
}
