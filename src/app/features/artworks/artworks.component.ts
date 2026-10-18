import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, combineLatest, forkJoin, map, of, Subscription, switchMap } from 'rxjs';

import {
  ArtistProfile,
  ArtworkResponse,
  CollectionResponse,
  PageResponse
} from '../../core/models/portfolio.models';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { ArtworkViewerComponent } from '../../shared/artwork-viewer/artwork-viewer.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { PageLoaderComponent } from '../../shared/page-loader/page-loader.component';
@Component({
  selector: 'app-artworks',
  standalone: true,
  imports: [ArtworkViewerComponent, NgTemplateOutlet, RouterLink, HeaderComponent, FooterComponent,
  PageLoaderComponent],
  templateUrl: './artworks.component.html',
  styleUrl: './artworks.component.scss'
})
export class ArtworksComponent implements OnInit {
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);
  private pageRequest?: Subscription;
  private techniqueRequest?: Subscription;
  techniques: string[] = [];
  selectedTechnique = '';
  techniquesLoading = false;
  techniquesError = false;
  isCollectionCover = true;
  isCollectionGallery = false;
  collectionNotFound = false;
  collectionPreviews: { collection: CollectionResponse; artworks: ArtworkResponse[] }[] = [];

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
  viewerArtworks: ArtworkResponse[] = [];

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

  get visiblePages(): number[] {
    const count = Math.min(5, this.totalPages);
    const start = Math.max(0, Math.min(this.currentPage - 2, this.totalPages - count));
    return Array.from({ length: count }, (_, index) => start + index);
  }

  loading = true;
  loadError = false;
  filtering = false;
  filterError = false;

  ngOnInit(): void {
    forkJoin({
      profile: this.portfolioApi.getProfile(),
      collections: this.portfolioApi.getCollections(),
      heroArtworks: this.portfolioApi.getHeroArtworks()
    }).pipe(
      switchMap(({ profile, collections, heroArtworks }) => {
        this.profile = profile;
        this.collections = [...collections].sort((a, b) =>
          a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
        this.heroArtworks = heroArtworks.filter(artwork => !!this.getArtworkImage(artwork));
        return combineLatest([this.route.paramMap, this.route.queryParamMap]);
      }),
      switchMap(([params, query]) => {
        this.pageRequest?.unsubscribe();
        this.techniqueRequest?.unsubscribe();
        this.filtering = false;
        this.filterError = false;
        this.loading = true;
        this.loadError = false;
        this.selectedArtwork = undefined;
        this.isCollectionGallery = !!params.get('collectionSlug');
        this.selectedCollection = params.get('collectionSlug') || query.get('collection') || 'all';
        this.selectedTechnique = query.get('technique') || '';
        this.isCollectionCover = !this.isCollectionGallery &&
          !this.route.snapshot.data['catalog'] && !query.has('collection');
        this.collectionNotFound = this.selectedCollection !== 'all' && !this.selectedCollectionData;
        if (this.collectionNotFound) {
          this.loading = false;
          return EMPTY;
        }
        if (!this.isCollectionCover) {
          this.loading = false;
          this.filtering = true;
        }
        const data = this.isCollectionCover
          ? this.portfolioApi.getAllArtworks().pipe(map(artworks => {
              this.collectionPreviews = this.collections.map(collection => ({
                collection,
                artworks: this.selectCollectionPreview(artworks, collection.slug)
              }));
            }))
          : this.loadTechniqueOptions().pipe(map(() => this.loadArtworksPage(0)));
        return data.pipe(
          switchMap(() => params.get('slug')
            ? this.portfolioApi.getArtwork(params.get('slug')!) : of(undefined)),
          map(artwork => {
            this.loading = false;
            if (this.isCollectionCover) this.filtering = false;
            if (artwork) this.openArtwork(artwork);
          }),
          catchError(error => {
            console.error('Error loading artworks', error);
            this.loading = false;
            this.filtering = false;
            this.loadError = this.isCollectionCover;
            this.filterError = !this.isCollectionCover;
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({ error: error => {
      console.error('Error loading artworks page data', error);
      this.loading = false;
      this.loadError = true;
    }});
  }

  // Replace this policy when collection-specific editorial selection is available.
  // ArtworkResponse has no sortOrder; slug is stable across API pages and reloads.
  private selectCollectionPreview(artworks: ArtworkResponse[], slug: string): ArtworkResponse[] {
    return artworks.filter(artwork => artwork.collectionSlug === slug)
      .sort((a, b) => a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
      .slice(0, 4);
  }

  filterByCollection(slug: string): void {
    if (
      this.filtering ||
      slug === this.selectedCollection
    ) {
      return;
    }

    void this.router.navigate(['/obra/catalogo'], {
      queryParams: {
        collection: slug === 'all' ? null : slug,
        ...(this.selectedTechnique ? { technique: this.selectedTechnique } : {})
      }
    });
  }

  private loadTechniqueOptions() {
    this.techniquesLoading = true;
    this.techniquesError = false;
    this.techniques = [];
    return this.portfolioApi.getArtworkTechniques(
      this.selectedCollection === 'all' ? undefined : this.selectedCollection
    ).pipe(
      map(techniques => {
        this.techniques = techniques;
        if (this.selectedTechnique && !techniques.includes(this.selectedTechnique)) {
          this.selectedTechnique = '';
        }
        this.techniquesLoading = false;
      }),
      catchError(() => {
        this.techniquesLoading = false;
        this.techniquesError = true;
        return of(undefined);
      })
    );
  }

  retryTechniques(): void {
    if (this.techniquesLoading) return;
    const previous = this.selectedTechnique;
    this.techniqueRequest = this.loadTechniqueOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (previous !== this.selectedTechnique) this.loadArtworksPage(0);
      });
  }

  filterByTechnique(technique: string): void {
    if (technique === this.selectedTechnique) return;
    this.selectedTechnique = technique;
    this.currentPage = 0;
    this.loadArtworksPage(0);
  }

  loadArtworksPage(page: number): void {
    this.filtering = true;
    this.filterError = false;

    const collection =
      this.selectedCollection === 'all'
        ? undefined
        : this.selectedCollection;

    this.pageRequest?.unsubscribe();
    this.pageRequest = this.portfolioApi
      .getArtworks(
        collection,
        page,
        this.pageSize,
        this.selectedTechnique || undefined
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.applyArtworkPage(response);

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

  private applyArtworkPage(response: PageResponse<ArtworkResponse>): void {
    this.artworks = this.filteredArtworks = response.content;
    this.currentPage = response.page.number;
    this.totalPages = response.page.totalPages;
    this.totalElements = response.page.totalElements;
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

  openArtwork(artwork: ArtworkResponse, context?: ArtworkResponse[]): void {
    this.viewerArtworks = context ?? [artwork];
    this.selectedArtwork = artwork;
  }

  closeArtwork(): void {
    this.selectedArtwork = undefined;
    this.viewerArtworks = [];
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

}
