import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { TaskDto, CreateTaskDto } from '@turbovets-task-manager/shared-types';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './task-list.component.html',
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  tasks: TaskDto[] = [];
  isLoading = false;
  errorMessage = '';
  showCreateForm = false;
  editingTaskId: string | null = null;

  currentUser = this.authService.currentUser;

  createTaskForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
  });

  editTaskForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load tasks';
        this.isLoading = false;
      },
    });
  }

  onCreateTask(): void {
    if (this.createTaskForm.invalid) {
      return;
    }

    const title = this.createTaskForm.value.title;
    const description = this.createTaskForm.value.description;

    if (!title) {
      return;
    }

    const newTask: CreateTaskDto = {
      title,
      description: description || undefined,
    };

    this.taskService.createTask(newTask).subscribe({
      next: () => {
        this.createTaskForm.reset();
        this.showCreateForm = false;
        this.loadTasks();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create task';
      },
    });
  }

  onStartEdit(task: TaskDto): void {
    this.editingTaskId = task.id;
    this.editTaskForm.patchValue({
      title: task.title,
      description: task.description || '',
    });
  }

  onCancelEdit(): void {
    this.editingTaskId = null;
    this.editTaskForm.reset();
  }

  onSaveEdit(taskId: string): void {
    if (this.editTaskForm.invalid) {
      return;
    }

    const title = this.editTaskForm.value.title;
    const description = this.editTaskForm.value.description;

    if (!title) {
      return;
    }

    this.taskService
      .updateTask(taskId, {
        title,
        description: description || undefined,
      })
      .subscribe({
        next: () => {
          this.editingTaskId = null;
          this.editTaskForm.reset();
          this.loadTasks();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to update task';
        },
      });
  }

  onToggleComplete(task: TaskDto): void {
    this.taskService
      .updateTask(task.id, { completed: !task.completed })
      .subscribe({
        next: () => {
          this.loadTasks();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to update task';
        },
      });
  }

  onDeleteTask(taskId: string): void {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to delete task';
      },
    });
  }

  onLogout(): void {
    this.authService.logout();
  }
}
