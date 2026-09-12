import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ArtistProfile,
  ArtworkImageResponse,
  ArtworkResponse,
  CollectionResponse
} from '../../core/models/portfolio.models';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { PageLoaderComponent } from '../../shared/page-loader/page-loader.component';
@Component({
  selector: 'app-artworks',
  standalone: true,
  imports: [HeaderComponent, FooterComponent,
  PageLoaderComponent],
  templateUrl: './artworks.component.html',
  styleUrl: './artworks.component.scss'
})
export class ArtworksComponent implements OnInit {
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  profile: ArtistProfile = {
    name: '',
    subtitle: '',
    bio: '',
    quote: '',
    profileImageUrl: '',
    instagram: '',
    email: ''
  };

  collections: CollectionResponse[] = [];

  artworks: ArtworkResponse[] = [];
  filteredArtworks: ArtworkResponse[] = [];
  heroArtworks: ArtworkResponse[] = [];

  selectedCollection = 'all';
  selectedArtwork?: ArtworkResponse;
  selectedImageIndex = 0;

  get selectedCollectionData(): CollectionResponse | undefined {
    if (this.selectedCollection === 'all') {
      return undefined;
    }

    return this.collections.find(
      collection => collection.slug === this.selectedCollection
    );
  }
  pageSize = 12;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;

  loading = true;
  loadError = false;
  filtering = false;
  filterError = false;

  ngOnInit(): void {
    const collectionFromQuery =
      this.route.snapshot.queryParamMap.get('collection');
    this.selectedCollection =
      collectionFromQuery || 'all';

    const collection =
      this.selectedCollection === 'all'
        ? undefined
        : this.selectedCollection;
    forkJoin({
      profile: this.portfolioApi.getProfile(),
      collections: this.portfolioApi.getCollections(),
      artworksPage: this.portfolioApi.getArtworks(
        collection,
        0,
        this.pageSize
      ),
      heroArtworks: this.portfolioApi.getHeroArtworks()
    }).subscribe({
      next: ({
        profile,
        collections,
        artworksPage,
        heroArtworks
      }) => {
        this.profile = profile;

        this.collections = [...collections].sort(
          (a, b) => a.sortOrder - b.sortOrder
        );

        this.artworks = artworksPage.content;
        this.filteredArtworks = artworksPage.content;

        this.currentPage = artworksPage.page.number;
        this.totalPages = artworksPage.page.totalPages;
        this.totalElements = artworksPage.page.totalElements;

        this.heroArtworks = heroArtworks.filter(
          (artwork) => !!this.getArtworkImage(artwork)
        );

        this.loading = false;

        this.openArtworkFromRoute();
      },
      error: (error) => {
        console.error(
          'Error loading artworks page data',
          error
        );

        this.loading = false;
        this.loadError = true;
      }
    });
  }

  filterByCollection(slug: string): void {
    if (
      this.filtering ||
      slug === this.selectedCollection
    ) {
      return;
    }

    this.selectedCollection = slug;
    this.currentPage = 0;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        collection: slug === 'all'
          ? null
          : slug
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    this.loadArtworksPage(0);
  }

  loadArtworksPage(page: number): void {
    this.filtering = true;
    this.filterError = false;

    const collection =
      this.selectedCollection === 'all'
        ? undefined
        : this.selectedCollection;

    this.portfolioApi
      .getArtworks(
        collection,
        page,
        this.pageSize
      )
      .subscribe({
        next: (response) => {
          this.artworks = response.content;
          this.filteredArtworks = response.content;

          this.currentPage = response.page.number;
          this.totalPages = response.page.totalPages;
          this.totalElements = response.page.totalElements;

          this.filtering = false;
        },
        error: (error) => {
          console.error(
            'Error loading artworks page',
            error
          );

          this.filtering = false;
          this.filterError = true;
        }
      });
  }

  previousPage(): void {
    if (
      this.currentPage <= 0 ||
      this.filtering
    ) {
      return;
    }

    this.loadArtworksPage(
      this.currentPage - 1
    );
  }

  nextPage(): void {
    if (
      this.currentPage >= this.totalPages - 1 ||
      this.filtering
    ) {
      return;
    }

    this.loadArtworksPage(
      this.currentPage + 1
    );
  }

  goToPage(page: number): void {
    if (
      page < 0 ||
      page >= this.totalPages ||
      page === this.currentPage ||
      this.filtering
    ) {
      return;
    }

    this.loadArtworksPage(page);
  }

  openArtwork(artwork: ArtworkResponse): void {
    this.selectedArtwork = artwork;
    this.selectedImageIndex = this.getInitialImageIndex(artwork);
  }

  closeArtwork(): void {
    this.selectedArtwork = undefined;
    this.selectedImageIndex = 0;
  }

  previousImage(): void {
    const images =
      this.selectedArtworkImages;

    if (images.length <= 1) {
      return;
    }

    this.selectedImageIndex =
      (
        this.selectedImageIndex -
        1 +
        images.length
      ) %
      images.length;
  }

  nextImage(): void {
    const images =
      this.selectedArtworkImages;

    if (images.length <= 1) {
      return;
    }

    this.selectedImageIndex =
      (
        this.selectedImageIndex + 1
      ) %
      images.length;
  }

  selectImage(index: number): void {
    if (
      index < 0 ||
      index >=
        this.selectedArtworkImages.length
    ) {
      return;
    }

    this.selectedImageIndex = index;
  }

  get selectedArtworkImages():
    ArtworkImageResponse[] {
    if (!this.selectedArtwork) {
      return [];
    }

    const images = [
      ...(this.selectedArtwork.images ?? [])
    ].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder
    );

    if (
      this.selectedArtwork.mainImageUrl &&
      !images.some(
        (image) =>
          image.imageUrl ===
          this.selectedArtwork?.mainImageUrl
      )
    ) {
      images.unshift({
        imageUrl:
          this.selectedArtwork.mainImageUrl,
        altText:
          this.selectedArtwork.title,
        sortOrder: -1,
        main: true
      });
    }

    return images;
  }

  get selectedImageUrl(): string {
    return (
      this.selectedArtworkImages[
        this.selectedImageIndex
      ]?.imageUrl ??
      this.selectedArtwork?.mainImageUrl ??
      ''
    );
  }

  get selectedImageAlt(): string {
    return (
      this.selectedArtworkImages[
        this.selectedImageIndex
      ]?.altText ??
      this.selectedArtwork?.title ??
      'Obra de Vicente Ruiz'
    );
  }

  getArtworkImage(
    artwork: ArtworkResponse
  ): string {
    return (
      artwork.mainImageUrl ??
      artwork.images
        ?.slice()
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder
        )[0]?.imageUrl ??
      ''
    );
  }

  getDimensions(
    artwork: ArtworkResponse
  ): string {
    if (
      artwork.widthCm &&
      artwork.heightCm
    ) {
      return `${this.formatNumber(
        artwork.widthCm
      )} × ${this.formatNumber(
        artwork.heightCm
      )} cm`;
    }

    return '—';
  }

  getStatusLabel(
    status: string
  ): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';

      case 'SOLD':
        return 'Vendida';

      case 'PRIVATE_COLLECTION':
        return 'Colección privada';

      case 'NOT_FOR_SALE':
        return 'No disponible';

      default:
        return status
          .toLowerCase()
          .replaceAll('_', ' ')
          .replace(
            /^./,
            (value) =>
              value.toUpperCase()
          );
    }
  }

  formatPrice(
    price?: number
  ): string {
    if (
      price === undefined ||
      price === null
    ) {
      return '—';
    }

    return new Intl.NumberFormat(
      'es-ES',
      {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }
    ).format(price);
  }

  private openArtworkFromRoute(): void {
    const slug =
      this.route.snapshot.paramMap.get(
        'slug'
      );

    if (!slug) {
      return;
    }

    this.portfolioApi
      .getArtwork(slug)
      .subscribe({
        next: (artwork) => {
          this.openArtwork(
            artwork
          );
        },
        error: (error) => {
          console.error(
            'Error loading artwork from route',
            error
          );
        }
      });
  }

  private getInitialImageIndex(
    artwork: ArtworkResponse
  ): number {
    const sortedImages = [
      ...(artwork.images ?? [])
    ].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder
    );

    const mainIndex =
      sortedImages.findIndex(
        (image) => image.main
      );

    return mainIndex >= 0
      ? mainIndex
      : 0;
  }

  private formatNumber(
    value: number
  ): string {
    return Number.isInteger(value)
      ? value.toString()
      : value.toLocaleString(
          'es-ES',
          {
            maximumFractionDigits: 2
          }
        );
  }
}