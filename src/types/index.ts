export type TaskStatus = 'unseen' | 'seen' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type Assignee = string | 'both';
export type AccessType = 'shared' | 'private';
export type ShoppingListType = 'daily' | 'global' | 'wishlist';

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
  assigneeName?: string;
  category: Category;
  access: AccessType;
  pinned: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly';
  createdById?: string;
  createdByName?: string;
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
  addedById?: string;
  addedByName?: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  type: ShoppingListType;
  items: ShoppingItem[];
  category: Category;
  access: AccessType;
  pinned: boolean;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}
