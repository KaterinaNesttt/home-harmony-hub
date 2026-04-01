import { useState, useCallback, useEffect } from 'react';
import { cfTasks, cfLists, type CFTask, type CFList, type CFItem } from '@/integrations/cloudflare/client';
import type { Task, ShoppingList, ShoppingItem } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────
function cfTaskToTask(t: CFTask): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    deadline: t.deadline,
    assignee: t.assignee,
    assigneeName: t.assignee_name,
    category: t.category as Task['category'],
    access: t.access,
    pinned: t.pinned,
    createdById: t.user_id,
    createdByName: t.user_display_name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

function cfListToList(l: CFList): ShoppingList {
  return {
    id: l.id,
    title: l.title,
    type: l.type,
    category: l.category as ShoppingList['category'],
    access: l.access,
    pinned: l.pinned,
    createdById: l.user_id,
    createdByName: l.user_display_name,
    createdAt: l.created_at,
    items: l.items.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      bought: i.bought,
      note: i.note,
      url: i.url,
      addedById: i.added_by_user_id,
      addedByName: i.added_by_name,
    })),
  };
}

const generateId = () => crypto.randomUUID();

// ── Task store ────────────────────────────────────────────────────────────────
export function useTaskStore(authenticated: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!authenticated) { setTasks([]); setSynced(false); return; }
    cfTasks.list().then(({ data }) => {
      if (data) { setTasks(data.map(cfTaskToTask)); setSynced(true); }
    });
  }, [authenticated]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const tempId = generateId();
    const optimistic: Task = { ...task, id: tempId, createdAt: now, updatedAt: now };
    setTasks(prev => [optimistic, ...prev]);
    const { data } = await cfTasks.create({ ...task, status: task.status as CFTask['status'], priority: task.priority as CFTask['priority'], assignee: task.assignee as CFTask['assignee'], access: task.access as CFTask['access'] });
    if (data) setTasks(prev => prev.map(t => t.id === tempId ? cfTaskToTask(data) : t));
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    await cfTasks.update(id, updates as Partial<CFTask>);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await cfTasks.remove(id);
  }, []);

  return { tasks, synced, addTask, updateTask, deleteTask };
}

// ── Shopping store ────────────────────────────────────────────────────────────
export function useShoppingStore(authenticated: boolean) {
  const [lists, setLists] = useState<ShoppingList[]>([]);

  useEffect(() => {
    if (!authenticated) { setLists([]); return; }
    cfLists.list().then(({ data }) => { if (data) setLists(data.map(cfListToList)); });
  }, [authenticated]);

  const addList = useCallback(async (list: Omit<ShoppingList, 'id' | 'createdAt' | 'items'>) => {
    const tempId = generateId();
    const optimistic: ShoppingList = { ...list, id: tempId, createdAt: new Date().toISOString(), items: [] };
    setLists(prev => [optimistic, ...prev]);
    const { data } = await cfLists.create({ ...list, type: list.type as CFList['type'], access: list.access as CFList['access'] });
    if (data) setLists(prev => prev.map(l => l.id === tempId ? cfListToList(data) : l));
  }, []);

  const deleteList = useCallback(async (id: string) => {
    setLists(prev => prev.filter(l => l.id !== id));
    await cfLists.remove(id);
  }, []);

  const addItem = useCallback(async (listId: string, item: Omit<ShoppingItem, 'id'>) => {
    const tempId = generateId();
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...l.items, { ...item, id: tempId }] } : l));
    const { data } = await cfLists.addItem(listId, item);
    if (data) {
      setLists(prev => prev.map(l => l.id === listId ? {
        ...l, items: l.items.map(i => i.id === tempId ? { id: data.id, name: data.name, quantity: data.quantity, bought: data.bought, note: data.note, url: data.url } : i)
      } : l));
    }
  }, []);

  const toggleItem = useCallback(async (listId: string, itemId: string) => {
    let newBought = false;
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l, items: l.items.map(i => {
        if (i.id === itemId) { newBought = !i.bought; return { ...i, bought: !i.bought }; }
        return i;
      })
    } : l));
    await cfLists.toggleItem(listId, itemId, newBought);
  }, []);

  const deleteItem = useCallback(async (listId: string, itemId: string) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l));
    await cfLists.deleteItem(listId, itemId);
  }, []);

  return { lists, addList, deleteList, addItem, toggleItem, deleteItem };
}
