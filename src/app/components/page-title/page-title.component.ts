import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-title',
  imports: [],
  templateUrl: './page-title.component.html',
  styleUrl: './page-title.component.css',

  standalone: true,
})
export class PageTitleComponent {
  @Input() title: string = '';
  @Input() description: string = '';
}
