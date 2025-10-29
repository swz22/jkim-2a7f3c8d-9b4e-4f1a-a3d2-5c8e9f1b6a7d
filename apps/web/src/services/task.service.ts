import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TaskDto,
  CreateTaskDto,
  UpdateTaskDto,
} from '@turbovets-task-manager/shared-types';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly API_URL = 'http://localhost:3000/api/tasks';
  private http = inject(HttpClient);

  getTasks(): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(this.API_URL);
  }

  getTask(id: string): Observable<TaskDto> {
    return this.http.get<TaskDto>(`${this.API_URL}/${id}`);
  }

  createTask(task: CreateTaskDto): Observable<TaskDto> {
    return this.http.post<TaskDto>(this.API_URL, task);
  }

  updateTask(id: string, task: UpdateTaskDto): Observable<TaskDto> {
    return this.http.patch<TaskDto>(`${this.API_URL}/${id}`, task);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
