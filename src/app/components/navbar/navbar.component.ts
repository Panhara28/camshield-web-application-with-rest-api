import { Component, OnInit, Renderer2 } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  constructor(private auth: AuthService, private renderer: Renderer2) {}
  profileName: string = '';
  profilePicture: string = '';
  roleName: string = '';
  isSidebarToggled = false;

  ngOnInit(): void {
    this.auth.verifyUser().subscribe((user) => {
      if (user) {
        (this.profileName = user.name),
          (this.profilePicture = user.profilePicture);
        this.roleName = user.role.name;
      }
    });
  }

  onLogout() {
    this.auth.logout();
  }

  toggleSidebar() {
    const hasClass = document.body.classList.contains('sidenav-toggled');
    if (hasClass) {
      this.renderer.removeClass(document.body, 'sidenav-toggled');
    } else {
      this.renderer.addClass(document.body, 'sidenav-toggled');
    }
  }
}
