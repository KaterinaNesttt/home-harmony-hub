import { useState } from 'react';
import bgVideo from '@/assets/0331.mp4';
import { BottomNav } from '@/components/BottomNav';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { AddListDialog } from '@/components/AddListDialog';
import { AddToListDialog } from '@/components/AddToListDialog';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { ShoppingPage } from '@/pages/ShoppingPage';
import { SearchPage } from '@/pages/SearchPage';
import { AccountPage } from '@/pages/AccountPage';
import { WeatherPage } from '@/pages/WeatherPage';
import { AuthPage } from '@/pages/AuthPage';
import { useTaskStore, useShoppingStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import type { ShoppingList } from '@/types';

export type Tab = 'dashboard' | 'tasks' | 'shopping' | 'search' | 'weather' | 'account';

const Index = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);

  const { user, profile, loading, signUp, signIn, signOut, updateProfile, uploadAvatar } = useAuth();
  const { tasks, addTask, updateTask, deleteTask } = useTaskStore(!!user);
  const { lists, addList, addItem, toggleItem, deleteItem } = useShoppingStore(!!user);

  const changeTab = (t: Tab) => setTab(t);

  // addList wrapper that returns the new list id for AddToListDialog
  const addListAndReturn = async (list: Omit<ShoppingList, 'id' | 'createdAt' | 'items'>): Promise<string> => {
    await addList(list);
    // After optimistic update, the new list will be first in the array
    // We return a sentinel; AddToListDialog handles the fallback via lists prop update
    return '';
  };

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            src={bgVideo}
          />
        </div>
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-4 pt-[env(safe-area-inset-top)]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center shadow-gold animate-float">
            <span className="text-2xl">🏠</span>
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">Завантаження</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <div className="fixed inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            src={bgVideo}
          />
        </div>
        <div className="relative z-10 pt-[env(safe-area-inset-top)]">
          <AuthPage onAuth={async (mode, email, password, name) => {
            if (mode === 'signup') return signUp(email, password, name || '');
            return signIn(email, password);
          }} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          src={bgVideo}
        />
      </div>

      <div className="relative z-10 min-h-screen pt-[env(safe-area-inset-top)]">
        <main className="max-w-lg mx-auto px-4 pt-6 pb-28">
          {tab === 'dashboard' && (
            <DashboardPage
              tasks={tasks} lists={lists} profile={profile}
              onUpdateTask={updateTask}
              onToggleItem={toggleItem} onDeleteItem={deleteItem} onAddItem={addItem}
              onAddTask={() => setShowAddTask(true)}
              onAddToList={() => setShowAddToList(true)}
              onGoToTasks={() => changeTab('tasks')}
              onGoToShopping={() => changeTab('shopping')}
              onGoToWeather={() => changeTab('weather')}
            />
          )}
          {tab === 'tasks' && (
            <TasksPage tasks={tasks} onUpdateTask={updateTask} onDeleteTask={deleteTask}
              onAddTask={() => setShowAddTask(true)} />
          )}
          {tab === 'shopping' && (
            <ShoppingPage lists={lists}
              onAddList={() => setShowAddList(true)}
              onToggleItem={toggleItem} onDeleteItem={deleteItem} onAddItem={addItem} />
          )}
          {tab === 'search' && (
            <SearchPage tasks={tasks} lists={lists} onUpdateTask={updateTask} />
          )}
          {tab === 'weather' && <WeatherPage />}
          {tab === 'account' && (
            <AccountPage
              profile={profile}
              email={user.email || ''}
              onUpdateProfile={updateProfile}
              onUploadAvatar={uploadAvatar}
              onSignOut={signOut}
              taskCount={tasks.filter(t => t.status !== 'done').length}
              doneCount={tasks.filter(t => t.status === 'done').length}
              listCount={lists.length}
            />
          )}
        </main>

        <BottomNav active={tab} onChange={changeTab} />

        <AddTaskDialog open={showAddTask} onClose={() => setShowAddTask(false)} onAdd={addTask} />
        <AddListDialog open={showAddList} onClose={() => setShowAddList(false)} onAdd={addList} />
        <AddToListDialog
          open={showAddToList}
          onClose={() => setShowAddToList(false)}
          lists={lists}
          onAddItem={addItem}
          onAddList={addListAndReturn}
        />
      </div>
    </>
  );
};

export default Index;
