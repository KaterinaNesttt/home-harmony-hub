import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { AddListDialog } from '@/components/AddListDialog';
import { AddToListDialog } from '@/components/AddToListDialog';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { ShoppingPage } from '@/pages/ShoppingPage';
import { SearchPage } from '@/pages/SearchPage';
import { AccountPage } from '@/pages/AccountPage';
import { AuthPage } from '@/pages/AuthPage';
import { useTaskStore, useShoppingStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'dashboard' | 'tasks' | 'shopping' | 'search' | 'account';

const Index = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);

  const { tasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { lists, addList, addItem, toggleItem, deleteItem } = useShoppingStore();
  const { user, profile, loading, signUp, signIn, signOut, updateProfile, uploadAvatar } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Завантаження...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage onAuth={async (mode, email, password, name) => {
        if (mode === 'signup') return signUp(email, password, name || '');
        return signIn(email, password);
      }} />
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {tab === 'dashboard' && (
          <DashboardPage
            tasks={tasks} lists={lists}
            profile={profile}
            onUpdateTask={updateTask}
            onToggleItem={toggleItem} onDeleteItem={deleteItem} onAddItem={addItem}
            onAddTask={() => setShowAddTask(true)}
            onAddToList={() => setShowAddToList(true)}
            onGoToTasks={() => setTab('tasks')}
            onGoToShopping={() => setTab('shopping')}
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
        {tab === 'account' && (
          <AccountPage
            profile={profile}
            email={user.email || ''}
            onUpdateProfile={updateProfile}
            onUploadAvatar={uploadAvatar}
            onSignOut={signOut}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      <AddTaskDialog open={showAddTask} onClose={() => setShowAddTask(false)} onAdd={addTask} />
      <AddListDialog open={showAddList} onClose={() => setShowAddList(false)} onAdd={addList} />
      <AddToListDialog open={showAddToList} onClose={() => setShowAddToList(false)} lists={lists} onAddItem={addItem} />
    </div>
  );
};

export default Index;
