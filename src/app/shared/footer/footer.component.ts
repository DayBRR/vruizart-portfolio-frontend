import { Component, Input } from '@angular/core';
@Component({selector:'app-footer',standalone:true,templateUrl:'./footer.component.html',styleUrl:'./footer.component.scss'})
export class FooterComponent { @Input() instagram='https://www.instagram.com/vicenteruizdeza/'; @Input() email='vruiz77@gmail.com'; }
