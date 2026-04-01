export type TaskStatus = 'unseen' | 'seen' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type Assignee = string | 'both';
export type AccessType = 'shared' | 'private';
export type ShoppingListType = 'daily' | 'global' | 'wishlist';

export const CATEGORIES = ['Дім', 'Робота', 'Особисте', 'Фінанси', "Здоров'я", 'Інше'] as const;
export type Category = typeof CATEGORIES[number];

export const WARDROBE_CATEGORIES = [
  'Верхній одяг',
  'Светр/кофта',
  'Футболка',
  'Штани/джинси',
  'Спідниця',
  'Взуття',
  'Аксесуар',
] as const;
export type WardrobeCategory = typeof WARDROBE_CATEGORIES[number];

export const WARDROBE_SEASONS = ['Весна', 'Літо', 'Осінь', 'Зима'] as const;
export type WardrobeSeason = typeof WARDROBE_SEASONS[number];

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

export interface WardrobeItem {
  id: string;
  userId: string;
  name: string;
  category: WardrobeCategory;
  seasons: WardrobeSeason[];
  colors?: string | null;
  tempMin?: number | null;
  tempMax?: number | null;
  description?: string | null;
  photoKey?: string | null;
  photoUrl?: string | null;
  createdAt: string;
}

export interface WardrobeSuggestion {
  source: 'ai' | 'fallback';
  outfit: string[];
  items: WardrobeItem[];
  explanation: string;
  availableCount: number;
}
