import { useState, useCallback } from 'react';
import type { Task, ShoppingList, ShoppingItem, Category, TaskStatus, TaskPriority, Assignee, AccessType, ShoppingListType } from '@/types';

const generateId = () => crypto.randomUUID();

const SAMPLE_TASKS: Task[] = [
  {
    id: generateId(), title: 'Прибрати кухню', description: 'Помити посуд, протерти стіл', status: 'unseen',
    priority: 'medium', deadline: new Date().toISOString(), assignee: 'me', category: 'Дім',
    access: 'shared', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(), title: 'Купити продукти', status: 'seen', priority: 'high',
    deadline: new Date().toISOString(), assignee: 'partner', category: 'Дім',
    access: 'shared', pinned: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(), title: 'Оплатити комунальні', status: 'in_progress', priority: 'high',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(), assignee: 'me', category: 'Фінанси',
    access: 'shared', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const SAMPLE_LISTS: ShoppingList[] = [
  {
    id: generateId(), title: 'Продукти на сьогодні', type: 'daily', category: 'Дім', access: 'shared', pinned: true,
    createdAt: new Date().toISOString(),
    items: [
      { id: generateId(), name: 'Молоко', quantity: '1 л', bought: false },
      { id: generateId(), name: 'Хліб', quantity: '1 шт', bought: true },
      { id: generateId(), name: 'Яйця', quantity: '10 шт', bought: false },
    ],
  },
  {
    id: generateId(), title: 'Побутова хімія', type: 'global', category: 'Дім', access: 'shared', pinned: false,
    createdAt: new Date().toISOString(),
    items: [
      { id: generateId(), name: 'Засіб для посуду', quantity: '1', bought: false },
      { id: generateId(), name: 'Порошок для прання', quantity: '1', bought: false, url: 'https://example.com', note: 'Бренд X' },
    ],
  },
  {
    id: generateId(), title: 'Хотєлки', type: 'wishlist' as const, category: 'Особисте', access: 'shared', pinned: false,
    createdAt: new Date().toISOString(),
    items: [
      { id: generateId(), name: 'Бездротові навушники', quantity: '1', bought: false, url: 'https://example.com/headphones', note: 'Sony WH-1000XM5' },
    ],
  },
];

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setTasks(prev => [{ ...task, id: generateId(), createdAt: now, updatedAt: now }, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return { tasks, addTask, updateTask, deleteTask };
}

export function useShoppingStore() {
  const [lists, setLists] = useState<ShoppingList[]>(SAMPLE_LISTS);

  const addList = useCallback((list: Omit<ShoppingList, 'id' | 'createdAt' | 'items'>) => {
    setLists(prev => [{ ...list, id: generateId(), createdAt: new Date().toISOString(), items: [] }, ...prev]);
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists(prev => prev.filter(l => l.id !== id));
  }, []);

  const addItem = useCallback((listId: string, item: Omit<ShoppingItem, 'id'>) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...l.items, { ...item, id: generateId() }] } : l));
  }, []);

  const toggleItem = useCallback((listId: string, itemId: string) => {
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l, items: l.items.map(i => i.id === itemId ? { ...i, bought: !i.bought } : i)
    } : l));
  }, []);

  const deleteItem = useCallback((listId: string, itemId: string) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l));
  }, []);

  return { lists, addList, deleteList, addItem, toggleItem, deleteItem };
}
