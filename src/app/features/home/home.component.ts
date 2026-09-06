import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ARTIST_PROFILE, COLLECTIONS, EXHIBITIONS, FEATURED_ARTWORKS, HERO_SLIDES } from '../../core/services/mock-portfolio.data';

@Component({selector:'app-home',standalone:true,imports:[RouterLink,HeaderComponent,FooterComponent],templateUrl:'./home.component.html',styleUrl:'./home.component.scss'})
export class HomeComponent implements AfterViewInit, OnDestroy {
  readonly profile=ARTIST_PROFILE; readonly heroSlides=HERO_SLIDES; readonly collections=COLLECTIONS; readonly featuredArtworks=FEATURED_ARTWORKS; readonly exhibitions=EXHIBITIONS;
  currentHero=0; private heroTimer?: number;
  @ViewChild('collectionGrid') collectionGrid?: ElementRef<HTMLElement>;
  @ViewChild('featuredStrip') featuredStrip?: ElementRef<HTMLElement>;
  @ViewChild('exhibitionGrid') exhibitionGrid?: ElementRef<HTMLElement>;
  collectionPrevVisible=false; collectionNextVisible=true; featuredPrevVisible=false; featuredNextVisible=true; exhibitionPrevVisible=false; exhibitionNextVisible=true;
  selectedPoster?: string;

  ngAfterViewInit(): void { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.heroTimer=window.setInterval(()=>this.currentHero=(this.currentHero+1)%this.heroSlides.length,5000); setTimeout(()=>this.updateAll(),0); }
  ngOnDestroy(): void { if (this.heroTimer) clearInterval(this.heroTimer); }
  move(kind:'collections'|'featured'|'exhibitions', direction:number): void { const ref=kind==='collections'?this.collectionGrid:kind==='featured'?this.featuredStrip:this.exhibitionGrid; const el=ref?.nativeElement; if(!el)return; const amount=kind==='featured'?el.clientWidth+34:kind==='collections'?Math.max(1,el.clientWidth-12):el.clientWidth; el.scrollBy({left:direction*amount,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); setTimeout(()=>this.update(kind),350); }
  update(kind:'collections'|'featured'|'exhibitions'): void { const ref=kind==='collections'?this.collectionGrid:kind==='featured'?this.featuredStrip:this.exhibitionGrid; const el=ref?.nativeElement; if(!el)return; const max=Math.max(0,el.scrollWidth-el.clientWidth), prev=el.scrollLeft>2, next=el.scrollLeft<max-2; if(kind==='collections'){this.collectionPrevVisible=prev;this.collectionNextVisible=next;} if(kind==='featured'){this.featuredPrevVisible=prev;this.featuredNextVisible=next;} if(kind==='exhibitions'){this.exhibitionPrevVisible=prev;this.exhibitionNextVisible=next;} }
  updateAll(): void { this.update('collections');this.update('featured');this.update('exhibitions'); }
  openPoster(url?:string): void { if(url)this.selectedPoster=url; }
  closePoster(): void { this.selectedPoster=undefined; }
}
