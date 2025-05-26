import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';
import { ListComponent } from './pages/users/list/list.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [LoginGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboards/dashboards.component').then(
        (m) => m.DashboardsComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'users',
    children: [
      {
        path: 'lists',
        component: ListComponent,
      },
    ],
    canActivate: [AuthGuard],
  },
];
