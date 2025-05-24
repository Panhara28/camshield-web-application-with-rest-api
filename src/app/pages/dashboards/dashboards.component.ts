import { Component } from '@angular/core';
import { LayoutsComponent } from '../../components/layouts/layouts.component';
import { CardsComponent } from '../../components/cards/cards.component';
import { TableComponent } from '../../components/table/table.component';

@Component({
  selector: 'app-dashboards',
  imports: [LayoutsComponent, CardsComponent, TableComponent],
  templateUrl: './dashboards.component.html',
  styleUrl: './dashboards.component.css',
})
export class DashboardsComponent {}
