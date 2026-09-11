import { Component } from '@angular/core';

import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  readonly email = 'vruizart77@gmail.com';
  readonly phoneDisplay = '+34 675 267 267';
  readonly phoneHref = 'tel:+34675267267';
  readonly instagramUrl = 'https://www.instagram.com/vicenteruizdeza/';
  readonly instagramHandle = '@vicenteruizdeza';
}
