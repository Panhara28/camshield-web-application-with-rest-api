import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const LoginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // ✅ Already signed in, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  // ✅ Allow access to login if not authenticated
  return true;
};
