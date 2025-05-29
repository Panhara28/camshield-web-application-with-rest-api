import { Component } from '@angular/core';
import { LayoutsComponent } from '../../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { TableComponent } from '../../../components/table/table.component';
import { UserService } from '../../../services/users.service';
import { ActivatedRoute } from '@angular/router';
import { RolesService } from '../../../services/roles.service';

interface PaginationMeta {
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
}

@Component({
  selector: 'app-list',
  imports: [LayoutsComponent, PageTitleComponent, TableComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.css',
})
export class ListComponent {
  users: any = [];
  meta: PaginationMeta = { page: 1, limit: 0, totalPages: 1, total: 0 };
  roles: any = [];
  roleId: number | null = null;
  page = 1;
  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private RoleService: RolesService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.userService.getUsers(params).subscribe((res) => {
        this.users = res.data;
        this.meta = res.meta;
      });

      this.RoleService.getRoles({
        pagination: { page: 1 },
      }).subscribe((res: any) => {
        res.data.map((item: any) => {
          this.roles.push({
            value: item.id,
            label: item.name,
          });
        });
      });
    });
  }
}
