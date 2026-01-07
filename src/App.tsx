import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskStatus, QuickTodo } from './types';
import './App.css';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'complete', label: 'Complete' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

// Sortable Task Card
function TaskCard({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="task-card" {...attributes} {...listeners}>
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.description && <span className="task-desc">{task.description}</span>}
      </div>
      <button className="task-delete" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>
        ×
      </button>
    </div>
  );
}

// Column Component
function Column({
  column,
  tasks,
  onAddTask,
  onDeleteTask,
}: {
  column: { id: TaskStatus; label: string };
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
}) {
  return (
    <div className="column">
      <div className="column-header">
        <span className="column-title">{column.label}</span>
        <span className="column-count">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="column-tasks">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </div>
      </SortableContext>
      <button className="add-task-btn" onClick={() => onAddTask(column.id)}>
        + Add
      </button>
    </div>
  );
}

// Quick Todo Item
function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: QuickTodo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`todo-item ${todo.done ? 'done' : ''}`}>
      <button className="todo-check" onClick={() => onToggle(todo.id)}>
        {todo.done ? '✓' : ''}
      </button>
      <span className="todo-text">{todo.text}</span>
      <button className="todo-delete" onClick={() => onDelete(todo.id)}>×</button>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('vibe-tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [todos, setTodos] = useState<QuickTodo[]>(() => {
    const saved = localStorage.getItem('vibe-todos');
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState(() => {
    return localStorage.getItem('vibe-notes') || '';
  });

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newTodo, setNewTodo] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('vibe-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('vibe-todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('vibe-notes', notes);
  }, [notes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((c) => c.id === over.id);
    if (targetColumn) {
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, status: targetColumn.id } : t))
      );
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, status: overTask.status } : t))
      );
    }
  }

  function openAddTask(status: TaskStatus) {
    setNewTaskStatus(status);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowTaskModal(true);
  }

  function addTask() {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: generateId(),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      status: newTaskStatus,
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, task]);
    setShowTaskModal(false);
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addTodo() {
    if (!newTodo.trim()) return;
    setTodos((prev) => [...prev, { id: generateId(), text: newTodo.trim(), done: false }]);
    setNewTodo('');
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="app">
      <header className="header">
        <h1>vibe.board</h1>
        <span className="tagline">ship it</span>
      </header>

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <section className="quick-todos">
            <h2>Quick Tasks</h2>
            <div className="todo-input-wrap">
              <input
                type="text"
                placeholder="Add a quick task..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              />
              <button onClick={addTodo}>+</button>
            </div>
            <div className="todo-list">
              {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
              ))}
            </div>
          </section>

          <section className="notes-section">
            <h2>Notes</h2>
            <textarea
              placeholder="Jot down ideas, links, reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>
        </aside>

        {/* Kanban Board */}
        <main className="kanban">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={tasks.filter((t) => t.status === col.id)}
                onAddTask={openAddTask}
                onDeleteTask={deleteTask}
              />
            ))}
            <DragOverlay>
              {activeTask && (
                <div className="task-card dragging">
                  <div className="task-content">
                    <span className="task-title">{activeTask.title}</span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </main>
      </div>

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Task</h3>
            <input
              type="text"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
            />
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowTaskModal(false)}>
                Cancel
              </button>
              <button className="confirm" onClick={addTask}>
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
