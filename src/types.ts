export type TaskStatus = 'todo' | 'in-progress' | 'complete';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: number;
}

export interface QuickTodo {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  content: string;
  updatedAt: number;
}
