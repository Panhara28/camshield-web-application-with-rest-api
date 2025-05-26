import { Component } from '@angular/core';
import { LayoutsComponent } from '../../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';

@Component({
  selector: 'app-list',
  imports: [LayoutsComponent, PageTitleComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.css',
})
export class ListComponent {}
