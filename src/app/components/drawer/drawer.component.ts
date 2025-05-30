import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-drawer',
  imports: [CommonModule],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.css',
})
export class DrawerComponent {
  isDrawerOpen = false;
  @Input() media: any = undefined;
  @Input() triggerOpenDrawer: () => void = () => this.toggleDrawer(this.media);

  toggleDrawer(media?: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawerOnOutsideClick(event: Event): void {
    this.isDrawerOpen = false;
  }
}
