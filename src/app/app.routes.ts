import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ArtworksComponent } from './features/artworks/artworks.component';
import { CollectionsComponent } from './features/collections/collections.component';
import { ExhibitionsComponent } from './features/exhibitions/exhibitions.component';
import { PublicationsComponent } from './features/publications/publications.component';
import { AboutComponent } from './features/about/about.component';
import { ContactComponent } from './features/contact/contact.component';
export const routes: Routes = [
 {path:'',component:HomeComponent}, {path:'obra',component:ArtworksComponent}, {path:'obra/:slug',component:ArtworksComponent},
 {path:'colecciones',component:CollectionsComponent}, {path:'colecciones/:slug',component:CollectionsComponent},
 {path:'exposiciones',component:ExhibitionsComponent}, {path:'exposiciones/:slug',component:ExhibitionsComponent},
 {path:'publicaciones',component:PublicationsComponent}, {path:'publicaciones/:slug',component:PublicationsComponent},
 {path:'sobre-mi',component:AboutComponent}, {path:'contacto',component:ContactComponent}, {path:'**',redirectTo:''}
];
