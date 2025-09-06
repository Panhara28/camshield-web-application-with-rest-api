import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, of } from 'rxjs';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  profilePicture: string;
  role: {
    name: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly apiUrl = 'http://localhost:8080/auth/signin';
  private readonly meUrl = 'http://localhost:8080/auth/me';
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  login(credentials: { email: string; password: string }) {
    return this.http.post<{ token: string }>(this.apiUrl, credentials).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        this.verifyUser();
      })
    );
  }

  verifyUser() {
    const token = this.getToken();
    if (!token) {
      this.logout();
      return of(null);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<AuthUser>(this.meUrl, { headers }).pipe(
      tap((user) => this.currentUserSubject.next(user)),
      catchError((err) => {
        this.logout();
        return of(null);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null); // Clear cached user info
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): Observable<AuthUser | null> {
    return this.currentUser$;
  }
}
