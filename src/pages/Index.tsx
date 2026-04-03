import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useTaskStore, useShoppingStore, useWardrobeStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { usePwaNotifications } from '@/hooks/usePwaNotifications';
import type { ShoppingList } from '@/types';

export type Tab = 'dashboard' | 'tasks' | 'shopping' | 'search' | 'weather' | 'account';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = useMemo(() => {
    const urlTab = searchParams.get('tab');
    const allowedTabs: Tab[] = ['dashboard', 'tasks', 'shopping', 'search', 'weather', 'account'];
    return allowedTabs.includes(urlTab as Tab) ? (urlTab as Tab) : 'dashboard';
  }, [searchParams]);

  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);

  const { user, profile, householdUsers, loading, signUp, signIn, signOut, updateProfile, uploadAvatar } = useAuth();
  usePwaNotifications(!!user);
  const { tasks, addTask, updateTask } = useTaskStore(!!user);
  const { lists, addList, addItem, toggleItem, deleteItem, archiveList, unarchiveList } = useShoppingStore(!!user);
  const {
    items: wardrobeItems,
    loading: wardrobeLoading,
    lastSuggestion,
    addItem: addWardrobeItem,
    updateItem: updateWardrobeItem,
    deleteItem: deleteWardrobeItem,
    uploadPhoto: uploadWardrobePhoto,
    suggestOutfit,
    saveOutfit,
  } = useWardrobeStore(!!user);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  const changeTab = (t: Tab) => {
    setTab(t);
    const next = new URLSearchParams(searchParams);
    if (t === 'dashboard') {
      next.delete('tab');
    } else {
      next.set('tab', t);
    }
    setSearchParams(next, { replace: true });
  };

  // addList wrapper that returns the new list id for AddToListDialog
  const addListAndReturn = async (list: Omit<ShoppingList, 'id' | 'createdAt' | 'items'>): Promise<string> => {
    return addList(list);
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
              tasks={tasks} lists={lists} profile={profile} currentUserId={user.id} householdUsers={householdUsers}
              onUpdateTask={updateTask}
              onToggleItem={toggleItem} onDeleteItem={deleteItem} onAddItem={addItem}
              onArchiveList={archiveList}
              onUnarchiveList={unarchiveList}
              onAddTask={() => setShowAddTask(true)}
              onAddToList={() => setShowAddToList(true)}
              onGoToTasks={() => changeTab('tasks')}
              onGoToShopping={() => changeTab('shopping')}
              onGoToWeather={() => changeTab('weather')}
            />
          )}
          {tab === 'tasks' && (
            <TasksPage tasks={tasks} currentUserId={user.id} householdUsers={householdUsers} onUpdateTask={updateTask}
              onAddTask={() => setShowAddTask(true)} />
          )}
          {tab === 'shopping' && (
            <ShoppingPage lists={lists}
              onAddList={() => setShowAddList(true)}
              onToggleItem={toggleItem} onDeleteItem={deleteItem} onAddItem={addItem}
              onArchiveList={archiveList}
              onUnarchiveList={unarchiveList} />
          )}
          {tab === 'search' && (
            <SearchPage tasks={tasks} lists={lists} currentUserId={user.id} householdUsers={householdUsers} onUpdateTask={updateTask} />
          )}
          {tab === 'weather' && (
            <WeatherPage
              wardrobeCount={wardrobeItems.length}
              lastSuggestion={lastSuggestion}
              onSuggestOutfit={suggestOutfit}
              onSaveOutfit={saveOutfit}
            />
          )}
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
              wardrobeItems={wardrobeItems}
              wardrobeLoading={wardrobeLoading}
              onAddWardrobeItem={addWardrobeItem}
              onUpdateWardrobeItem={updateWardrobeItem}
              onDeleteWardrobeItem={deleteWardrobeItem}
              onUploadWardrobePhoto={uploadWardrobePhoto}
            />
          )}
        </main>

        <BottomNav active={tab} onChange={changeTab} />

        <AddTaskDialog
          open={showAddTask}
          onClose={() => setShowAddTask(false)}
          onAdd={addTask}
          currentUserId={user.id}
          householdUsers={householdUsers}
        />
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
