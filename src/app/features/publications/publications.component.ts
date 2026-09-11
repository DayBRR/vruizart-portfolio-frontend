import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import {
  ArtistProfile,
  PublicationResponse,
  PublicationType
} from '../../core/models/portfolio.models';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { PageLoaderComponent } from '../../shared/page-loader/page-loader.component';
@Component({
  selector: 'app-publications',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    PageLoaderComponent
  ],
  templateUrl: './publications.component.html',
  styleUrl: './publications.component.scss'
})
export class PublicationsComponent {
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly sanitizer = inject(DomSanitizer);

  profile?: ArtistProfile;
  publications: PublicationResponse[] = [];
  featuredPublication?: PublicationResponse;

  loading = true;
  loadError = false;

  lightboxImage?: string;
  lightboxAlt = '';

  pdfPublication?: PublicationResponse;
  safePdfUrl?: SafeResourceUrl;

  constructor() {
    this.load();
  }

  private load(): void {
    forkJoin({
      profile: this.portfolioApi.getProfile(),
      publications: this.portfolioApi.getPublications()
    }).subscribe({
      next: ({ profile, publications }) => {
        this.profile = profile;

        this.publications = [...publications].sort((a, b) => {
          const yearA = a.publicationYear ?? this.extractYear(a.publicationDate);
          const yearB = b.publicationYear ?? this.extractYear(b.publicationDate);

          if (yearA !== yearB) {
            return yearB - yearA;
          }

          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        });

        this.featuredPublication =
          this.publications.find((publication) => publication.featured) ??
          this.publications[0];

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading publications', error);
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  get archivePublications(): PublicationResponse[] {
    if (!this.featuredPublication) {
      return this.publications;
    }

    return this.publications.filter(
      (publication) => publication.slug !== this.featuredPublication?.slug
    );
  }

  get heroPublications(): PublicationResponse[] {
    const heroSlugs = [
      'artist-portfolio-magazine',
      'the-meam-hall',
      'guia-internacional-leonardo-2025'
    ];

    return heroSlugs
      .map((slug) => this.publications.find((publication) => publication.slug === slug))
      .filter((publication): publication is PublicationResponse => !!publication?.coverImageUrl);
  }

  getYear(publication: PublicationResponse): string {
    const year =
      publication.publicationYear ??
      this.extractYear(publication.publicationDate);

    return year > 0 ? String(year) : '';
  }

  getPublicationImages(publication: PublicationResponse) {
    return [...(publication.images ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private extractYear(publicationDate?: string): number {
    if (!publicationDate) {
      return 0;
    }

    const year = Number(publicationDate.substring(0, 4));
    return Number.isFinite(year) ? year : 0;
  }

  getPublicationTypeLabel(type: PublicationType): string {
    const labels: Record<PublicationType, string> = {
      PRESS: 'Prensa',
      MAGAZINE: 'Revista',
      BOOK: 'Libro',
      CATALOG: 'Catálogo',
      WEB_ARTICLE: 'Artículo web',
      VIDEO: 'Vídeo',
      PODCAST: 'Podcast',
      TV: 'Televisión',
      RADIO: 'Radio',
      OTHER: 'Publicación'
    };

    return labels[type];
  }

  getMeta(publication: PublicationResponse): string {
    return [
      this.getPublicationTypeLabel(publication.publicationType),
      publication.publisherName
    ].filter(Boolean).join(' · ');
  }

  openImage(imageUrl?: string, alt = ''): void {
    if (!imageUrl) {
      return;
    }

    this.lightboxImage = imageUrl;
    this.lightboxAlt = alt;
    document.body.style.overflow = 'hidden';
  }

  closeImage(): void {
    this.lightboxImage = undefined;
    this.lightboxAlt = '';

    if (!this.pdfPublication) {
      document.body.style.overflow = '';
    }
  }

  openPdf(publication: PublicationResponse): void {
    if (!publication.fileUrl) {
      return;
    }

    this.pdfPublication = publication;
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      publication.fileUrl
    );
    document.body.style.overflow = 'hidden';
  }

  closePdf(): void {
    this.pdfPublication = undefined;
    this.safePdfUrl = undefined;

    if (!this.lightboxImage) {
      document.body.style.overflow = '';
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pdfPublication) {
      this.closePdf();
      return;
    }

    if (this.lightboxImage) {
      this.closeImage();
    }
  }
}
