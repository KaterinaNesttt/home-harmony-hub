import { useState, useCallback, useEffect } from 'react';
import {
  cfTasks,
  cfLists,
  cfWardrobe,
  type CFTask,
  type CFList,
  type CFWardrobeItem,
  type CFWardrobeSuggestion,
} from '@/integrations/cloudflare/client';
import type { Task, ShoppingList, ShoppingItem, WardrobeItem, WardrobeSuggestion, WardrobeSeason } from '@/types';

function cfTaskToTask(task: CFTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
    assignee: task.assignee,
    assigneeName: task.assignee_name,
    category: task.category as Task['category'],
    access: task.access,
    pinned: task.pinned,
    createdById: task.user_id,
    createdByName: task.user_display_name,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

function cfListToList(list: CFList): ShoppingList {
  return {
    id: list.id,
    title: list.title,
    type: list.type,
    category: list.category as ShoppingList['category'],
    access: list.access,
    pinned: list.pinned,
    createdById: list.user_id,
    createdByName: list.user_display_name,
    createdAt: list.created_at,
    items: list.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      bought: item.bought,
      note: item.note,
      url: item.url,
      addedById: item.added_by_user_id,
      addedByName: item.added_by_name,
    })),
  };
}

function cfWardrobeToWardrobe(item: CFWardrobeItem): WardrobeItem {
  return {
    id: item.id,
    userId: item.user_id,
    name: item.name,
    category: item.category as WardrobeItem['category'],
    seasons: item.seasons as WardrobeSeason[],
    colors: item.colors,
    tempMin: item.temp_min,
    tempMax: item.temp_max,
    description: item.description,
    photoKey: item.photo_key,
    photoUrl: item.photo_url,
    createdAt: item.created_at,
  };
}

function cfSuggestionToSuggestion(suggestion: CFWardrobeSuggestion): WardrobeSuggestion {
  return {
    source: suggestion.source,
    outfit: suggestion.outfit,
    items: suggestion.items.map(cfWardrobeToWardrobe),
    explanation: suggestion.explanation,
    availableCount: suggestion.available_count,
  };
}

const generateId = () => crypto.randomUUID();

export function useTaskStore(authenticated: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      setTasks([]);
      setSynced(false);
      return;
    }
    cfTasks.list().then(({ data }) => {
      if (data) {
        setTasks(data.map(cfTaskToTask));
        setSynced(true);
      }
    });
  }, [authenticated]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const tempId = generateId();
    const optimistic: Task = { ...task, id: tempId, createdAt: now, updatedAt: now };
    setTasks((prev) => [optimistic, ...prev]);
    const { data } = await cfTasks.create({
      ...task,
      status: task.status as CFTask['status'],
      priority: task.priority as CFTask['priority'],
      assignee: task.assignee as CFTask['assignee'],
      access: task.access as CFTask['access'],
    });
    if (data) setTasks((prev) => prev.map((item) => (item.id === tempId ? cfTaskToTask(data) : item)));
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task)));
    await cfTasks.update(id, updates as Partial<CFTask>);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    await cfTasks.remove(id);
  }, []);

  return { tasks, synced, addTask, updateTask, deleteTask };
}

export function useShoppingStore(authenticated: boolean) {
  const [lists, setLists] = useState<ShoppingList[]>([]);

  useEffect(() => {
    if (!authenticated) {
      setLists([]);
      return;
    }
    cfLists.list().then(({ data }) => {
      if (data) setLists(data.map(cfListToList));
    });
  }, [authenticated]);

  const addList = useCallback(async (list: Omit<ShoppingList, 'id' | 'createdAt' | 'items'>) => {
    const tempId = generateId();
    const optimistic: ShoppingList = { ...list, id: tempId, createdAt: new Date().toISOString(), items: [] };
    setLists((prev) => [optimistic, ...prev]);
    const { data } = await cfLists.create({
      ...list,
      type: list.type as CFList['type'],
      access: list.access as CFList['access'],
    });
    if (data) setLists((prev) => prev.map((item) => (item.id === tempId ? cfListToList(data) : item)));
  }, []);

  const deleteList = useCallback(async (id: string) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
    await cfLists.remove(id);
  }, []);

  const addItem = useCallback(async (listId: string, item: Omit<ShoppingItem, 'id'>) => {
    const tempId = generateId();
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, items: [...list.items, { ...item, id: tempId }] }
          : list,
      ),
    );
    const { data } = await cfLists.addItem(listId, item);
    if (data) {
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                items: list.items.map((entry) =>
                  entry.id === tempId
                    ? {
                        id: data.id,
                        name: data.name,
                        quantity: data.quantity,
                        bought: data.bought,
                        note: data.note,
                        url: data.url,
                        addedById: data.added_by_user_id,
                        addedByName: data.added_by_name,
                      }
                    : entry,
                ),
              }
            : list,
        ),
      );
    }
  }, []);

  const toggleItem = useCallback(async (listId: string, itemId: string) => {
    let nextBought = false;
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) => {
                if (item.id !== itemId) return item;
                nextBought = !item.bought;
                return { ...item, bought: nextBought };
              }),
            }
          : list,
      ),
    );
    await cfLists.toggleItem(listId, itemId, nextBought);
  }, []);

  const deleteItem = useCallback(async (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, items: list.items.filter((item) => item.id !== itemId) } : list,
      ),
    );
    await cfLists.deleteItem(listId, itemId);
  }, []);

  return { lists, addList, deleteList, addItem, toggleItem, deleteItem };
}

export function useWardrobeStore(authenticated: boolean) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSuggestion, setLastSuggestion] = useState<WardrobeSuggestion | null>(null);

  useEffect(() => {
    if (!authenticated) {
      setItems([]);
      setLastSuggestion(null);
      return;
    }
    setLoading(true);
    cfWardrobe.list()
      .then(({ data }) => {
        if (data) setItems(data.map(cfWardrobeToWardrobe));
      })
      .finally(() => setLoading(false));
  }, [authenticated]);

  const addItem = useCallback(async (item: Omit<WardrobeItem, 'id' | 'userId' | 'createdAt' | 'photoUrl'>) => {
    const { data } = await cfWardrobe.create({
      name: item.name,
      category: item.category,
      seasons: item.seasons,
      colors: item.colors,
      temp_min: item.tempMin,
      temp_max: item.tempMax,
      description: item.description,
      photo_key: item.photoKey,
    });
    if (data) setItems((prev) => [cfWardrobeToWardrobe(data), ...prev]);
    return data ? cfWardrobeToWardrobe(data) : null;
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<WardrobeItem>) => {
    const { data } = await cfWardrobe.update(id, {
      name: updates.name,
      category: updates.category,
      seasons: updates.seasons,
      colors: updates.colors,
      temp_min: updates.tempMin,
      temp_max: updates.tempMax,
      description: updates.description,
      photo_key: updates.photoKey,
    });
    if (data) {
      const mapped = cfWardrobeToWardrobe(data);
      setItems((prev) => prev.map((item) => (item.id === id ? mapped : item)));
      return mapped;
    }
    return null;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await cfWardrobe.remove(id);
  }, []);

  const uploadPhoto = useCallback(async (file: File | Blob) => {
    return cfWardrobe.uploadPhoto(file);
  }, []);

  const suggestOutfit = useCallback(async (params: {
    temp: number;
    tempMin: number;
    tempMax: number;
    precip: number;
    windSpeed: number;
    weatherDesc: string;
    season: string;
  }) => {
    const { data } = await cfWardrobe.suggest(params);
    const mapped = data ? cfSuggestionToSuggestion(data) : null;
    setLastSuggestion(mapped);
    return mapped;
  }, []);

  const saveOutfit = useCallback(async (itemIds: string[], weatherTemp: number) => {
    return cfWardrobe.saveOutfit(itemIds, weatherTemp);
  }, []);

  return {
    items,
    loading,
    lastSuggestion,
    addItem,
    updateItem,
    deleteItem,
    uploadPhoto,
    suggestOutfit,
    saveOutfit,
  };
}
