import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { AddListDialog } from '@/components/AddListDialog';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { ShoppingPage } from '@/pages/ShoppingPage';
import { SearchPage } from '@/pages/SearchPage';
import { useTaskStore, useShoppingStore } from '@/store/useStore';

type Tab = 'dashboard' | 'tasks' | 'shopping' | 'search';

const Index = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddList, setShowAddList] = useState(false);

  const { tasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { lists, addList, addItem, toggleItem, deleteItem } = useShoppingStore();

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {tab === 'dashboard' && (
          <DashboardPage
            tasks={tasks} lists={lists}
            onUpdateTask={updateTask}
            onToggleItem={toggleItem} onDeleteItem={deleteItem} onAddItem={addItem}
            onAddTask={() => setShowAddTask(true)}
            onAddList={() => setShowAddList(true)}
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
      </main>

      <BottomNav active={tab} onChange={setTab} />

      <AddTaskDialog open={showAddTask} onClose={() => setShowAddTask(false)} onAdd={addTask} />
      <AddListDialog open={showAddList} onClose={() => setShowAddList(false)} onAdd={addList} />
    </div>
  );
};

export default Index;
