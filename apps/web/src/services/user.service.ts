import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UserDto,
  AddUserDto,
  AddUserResponseDto,
} from '@turbovets-task-manager/shared-types';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly API_URL = 'http://localhost:3000/api/users';
  private http = inject(HttpClient);

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.API_URL);
  }

  getUser(id: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.API_URL}/${id}`);
  }

  addUser(user: AddUserDto): Observable<AddUserResponseDto> {
    return this.http.post<AddUserResponseDto>(this.API_URL, user);
  }
}
