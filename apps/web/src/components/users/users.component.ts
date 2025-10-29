import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserDto, UserRole } from '@turbovets-task-manager/shared-types';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  users: UserDto[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showAddForm = false;
  tempPassword = '';

  // Expose enum to template
  UserRole = UserRole;

  currentUser = this.authService.currentUser;

  addUserForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    role: [UserRole.MEMBER, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  get canAddUsers(): boolean {
    return (
      this.currentUser?.role === UserRole.OWNER ||
      this.currentUser?.role === UserRole.ADMIN
    );
  }

  get availableRoles(): UserRole[] {
    if (this.currentUser?.role === UserRole.OWNER) {
      return [UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER];
    } else if (this.currentUser?.role === UserRole.ADMIN) {
      return [UserRole.ADMIN, UserRole.MEMBER];
    }
    return [];
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load users';
        this.isLoading = false;
      },
    });
  }

  onAddUser(): void {
    if (this.addUserForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.tempPassword = '';

    const formValue = this.addUserForm.value;

    if (
      !formValue.email ||
      !formValue.firstName ||
      !formValue.lastName ||
      !formValue.role
    ) {
      return;
    }

    this.userService
      .addUser({
        email: formValue.email,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        role: formValue.role,
      })
      .subscribe({
        next: (response) => {
          this.successMessage = `User ${response.user.email} added successfully!`;
          this.tempPassword = response.tempPassword;
          this.addUserForm.reset({ role: UserRole.MEMBER });
          this.loadUsers();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to add user';
        },
      });
  }

  onCancelAdd(): void {
    this.showAddForm = false;
    this.addUserForm.reset({ role: UserRole.MEMBER });
    this.errorMessage = '';
    this.successMessage = '';
    this.tempPassword = '';
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRole.OWNER:
        return 'bg-purple-100 text-purple-800';
      case UserRole.ADMIN:
        return 'bg-blue-100 text-blue-800';
      case UserRole.MEMBER:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
