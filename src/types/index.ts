export type TaskStatus = 'unseen' | 'seen' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type Assignee = 'me' | 'partner' | 'both';
export type AccessType = 'shared' | 'private';
export type ShoppingListType = 'daily' | 'global';

export const CATEGORIES = ['Дім', 'Робота', 'Особисте', 'Фінанси', 'Здоров\'я', 'Інше'] as const;
export type Category = typeof CATEGORIES[number];

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  assignee: Assignee;
  category: Category;
  access: AccessType;
  pinned: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  bought: boolean;
  url?: string;
  note?: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  type: ShoppingListType;
  items: ShoppingItem[];
  category: Category;
  access: AccessType;
  pinned: boolean;
  createdAt: string;
}
