import { Component } from '@angular/core';
import { LayoutsComponent } from '../../components/layouts/layouts.component';
import { CardsComponent } from '../../components/cards/cards.component';
import { TableComponent } from '../../components/table/table.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { UserService } from '../../services/users.service';
import { ActivatedRoute, Router } from '@angular/router';

interface PaginationMeta {
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
}

@Component({
  selector: 'app-dashboards',
  imports: [
    LayoutsComponent,
    CardsComponent,
    TableComponent,
    PageTitleComponent,
  ],
  templateUrl: './dashboards.component.html',
  styleUrl: './dashboards.component.css',
})
export class DashboardsComponent {
  users: any[] = [];
  // meta: any = { page: 1, totalPages: 65, total: 0, limit: 10 };
  meta: PaginationMeta = { page: 1, limit: 0, totalPages: 1, total: 0 };

  constructor(
    private userService: UserService,
    private route: ActivatedRoute
  ) {}
  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const name = params['name'];
      const page = +params['page'] || 1;
      this.userService
        .getUsers({
          pagination: { page },
          filter: name ? { name } : undefined,
        })
        .subscribe((res: any) => {
          this.users = res.data;
          this.meta = res.meta;
        });
    });
  }

  onFilterChanged(filters: any): void {
    const page = 1;
    this.userService
      .getUsers({
        pagination: { page },
        filter: filters,
      })
      .subscribe((res: any) => {
        this.users = res.data;
        this.meta = res.meta;
      });
  }
}
