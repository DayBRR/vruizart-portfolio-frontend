import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private previousBodyOverflow = '';
  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileMenu') private mobileMenu?: ElementRef<HTMLElement>;
  menuOpen = false;

  toggleMenu(): void {
    if (this.menuOpen) {
      this.closeMenu();
      return;
    }
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.menuOpen = true;
    this.changeDetector.detectChanges();
    this.mobileMenu?.nativeElement.querySelector<HTMLAnchorElement>('a')?.focus();
  }

  closeMenu(restoreFocus = true): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.document.body.style.overflow = this.previousBodyOverflow;
    if (restoreFocus) this.menuToggle?.nativeElement.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.menuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
    } else if (event.key === 'Tab') {
      const controls = this.mobileMenu?.nativeElement.querySelectorAll<HTMLElement>('a[href], button');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = this.document.activeElement;
      if (!this.mobileMenu?.nativeElement.contains(active) ||
          (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if ((this.document.defaultView?.innerWidth ?? 0) > 1120) this.closeMenu(false);
  }

  ngOnDestroy(): void {
    this.closeMenu(false);
  }
}
