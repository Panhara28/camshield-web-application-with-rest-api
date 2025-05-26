import { Component } from '@angular/core';
import { LayoutsComponent } from '../../components/layouts/layouts.component';
import { CardsComponent } from '../../components/cards/cards.component';
import { TableComponent } from '../../components/table/table.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { UserService } from '../../services/users.service';

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

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userService.getUsers().subscribe((res: any) => {
      this.users = res.data;
    });
  }
}
