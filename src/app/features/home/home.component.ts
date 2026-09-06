import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import {
  ArtistProfile,
  ArtworkResponse,
  CollectionCard,
  CollectionResponse,
  ExhibitionItem,
  ExhibitionResponse,
  FeaturedArtwork,
  HeroSlide
} from '../../core/models/portfolio.models';
import { HERO_SLIDES } from '../../core/services/mock-portfolio.data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly portfolioApi = inject(PortfolioApiService);

  profile: ArtistProfile = {
    name: '',
    subtitle: '',
    bio: '',
    quote: '',
    profileImageUrl: '',
    instagram: '',
    email: ''
  };

  // El hero sigue siendo local por ahora porque PortfolioApiService
  // todavía no expone un endpoint específico para sus imágenes.
  readonly heroSlides: HeroSlide[] = HERO_SLIDES;

  collections: CollectionCard[] = [];
  featuredArtworks: FeaturedArtwork[] = [];
  exhibitions: ExhibitionItem[] = [];

  loading = true;
  loadError = false;

  currentHero = 0;
  private heroTimer?: number;

  @ViewChild('collectionGrid') collectionGrid?: ElementRef<HTMLElement>;
  @ViewChild('featuredStrip') featuredStrip?: ElementRef<HTMLElement>;
  @ViewChild('exhibitionGrid') exhibitionGrid?: ElementRef<HTMLElement>;

  collectionPrevVisible = false;
  collectionNextVisible = true;
  featuredPrevVisible = false;
  featuredNextVisible = true;
  exhibitionPrevVisible = false;
  exhibitionNextVisible = true;

  selectedPoster?: string;

  ngOnInit(): void {
    forkJoin({
      profile: this.portfolioApi.getProfile(),
      collections: this.portfolioApi.getCollections(),
      featuredArtworks: this.portfolioApi.getFeaturedArtworks(),
      exhibitions: this.portfolioApi.getExhibitions()
    }).subscribe({
      next: ({ profile, collections, featuredArtworks, exhibitions }) => {
        this.profile = profile;

        this.collections = collections.map((collection) =>
          this.mapCollection(collection)
        );

        this.featuredArtworks = featuredArtworks.map((artwork) =>
          this.mapArtwork(artwork)
        );

        this.exhibitions = exhibitions.map((exhibition) =>
          this.mapExhibition(exhibition)
        );

        this.loading = false;

        setTimeout(() => this.updateAll(), 0);
      },
      error: (error) => {
        console.error('Error loading portfolio home data', error);
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  ngAfterViewInit(): void {
    if (
      this.heroSlides.length > 1 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.heroTimer = window.setInterval(
        () => this.currentHero = (this.currentHero + 1) % this.heroSlides.length,
        5000
      );
    }

    setTimeout(() => this.updateAll(), 0);
  }

  ngOnDestroy(): void {
    if (this.heroTimer) {
      clearInterval(this.heroTimer);
    }
  }

  private mapCollection(collection: CollectionResponse): CollectionCard {
  return {
    name: collection.name,
    slug: collection.slug,
    imageUrl: collection.coverImageUrl
  };
}

private mapArtwork(artwork: ArtworkResponse): FeaturedArtwork {
  const width = artwork.widthCm ?? 0;
  const height = artwork.heightCm ?? 0;

  return {
    title: artwork.title,
    slug: artwork.slug,
    year: artwork.year ?? 0,
    technique: artwork.technique ?? '',
    dimensions:
      width && height
        ? `${width} × ${height} cm`
        : '',
    imageUrl: artwork.mainImageUrl ?? '',
    shape: width === height ? 'square' : 'portrait'
  };
}

private mapExhibition(exhibition: ExhibitionResponse): ExhibitionItem {
  return {
    title: exhibition.title,
    type: exhibition.type,
    location: exhibition.locationName ?? '',
    dateLabel: this.formatExhibitionDate(
      exhibition.startDate,
      exhibition.endDate,
      exhibition.year
    ),
    posterUrl: exhibition.imageUrl
  };
}

private formatExhibitionDate(
  startDate?: string,
  endDate?: string,
  year?: number
): string {
    if (!startDate && !endDate) {
      return year ? year.toString() : '';
    }

    if (!startDate) {
      return endDate
        ? new Date(endDate).toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
          })
        : year?.toString() ?? '';
    }

    const start = new Date(startDate);

    if (!endDate) {
      return start.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric'
      });
    }

    const end = new Date(endDate);

    if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('es-ES', {
        month: 'short'
      })} – ${end.toLocaleDateString('es-ES', {
        month: 'short',
        year: 'numeric'
      })}`;
    }

    return `${start.toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric'
    })} – ${end.toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric'
    })}`;
  }

  move(
    kind: 'collections' | 'featured' | 'exhibitions',
    direction: number
  ): void {
    const ref =
      kind === 'collections'
        ? this.collectionGrid
        : kind === 'featured'
          ? this.featuredStrip
          : this.exhibitionGrid;

    const el = ref?.nativeElement;
    if (!el) return;

    const amount =
      kind === 'featured'
        ? el.clientWidth + 34
        : kind === 'collections'
          ? Math.max(1, el.clientWidth - 12)
          : el.clientWidth;

    el.scrollBy({
      left: direction * amount,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'
    });

    setTimeout(() => this.update(kind), 350);
  }

  update(kind: 'collections' | 'featured' | 'exhibitions'): void {
    const ref =
      kind === 'collections'
        ? this.collectionGrid
        : kind === 'featured'
          ? this.featuredStrip
          : this.exhibitionGrid;

    const el = ref?.nativeElement;
    if (!el) return;

    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const prev = el.scrollLeft > 2;
    const next = el.scrollLeft < max - 2;

    if (kind === 'collections') {
      this.collectionPrevVisible = prev;
      this.collectionNextVisible = next;
    }

    if (kind === 'featured') {
      this.featuredPrevVisible = prev;
      this.featuredNextVisible = next;
    }

    if (kind === 'exhibitions') {
      this.exhibitionPrevVisible = prev;
      this.exhibitionNextVisible = next;
    }
  }

  updateAll(): void {
    this.update('collections');
    this.update('featured');
    this.update('exhibitions');
  }

  openPoster(url?: string): void {
    if (url) {
      this.selectedPoster = url;
    }
  }

  closePoster(): void {
    this.selectedPoster = undefined;
  }
}
