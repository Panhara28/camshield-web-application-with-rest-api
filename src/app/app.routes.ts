import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';
import { ListComponent } from './pages/users/list/list.component';
import { EditComponent } from './pages/users/edit/edit.component';

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
      {
        path: ':id/edit',
        component: EditComponent,
      },
    ],
    canActivate: [AuthGuard],
  },
  {
    path: 'media',
    loadComponent: () =>
      import('./pages/media/media.component').then((m) => m.MediaComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'products',
    children: [
      {
        path: 'lists',
        loadComponent: () =>
          import('./pages/products/product-list/product-list.component').then(
            (m) => m.ProductListComponent
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'create',
        loadComponent: () =>
          import(
            './pages/products/create-product/create-product.component'
          ).then((m) => m.CreateProductComponent),
        canActivate: [AuthGuard],
      },
    ],
  },
];
