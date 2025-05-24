import { Component, Input, input } from '@angular/core';

@Component({
  selector: 'app-cards',
  imports: [],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css',
})
export class CardsComponent {
  @Input() icon: string = '';
  @Input() total: string = '';
  @Input() title: string = '';
}
