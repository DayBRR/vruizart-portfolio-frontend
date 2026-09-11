import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ArtistProfile,
  ExhibitionResponse,
  PublicationResponse,
  SiteContentResponse
} from '../../core/models/portfolio.models';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { PageLoaderComponent } from '../../shared/page-loader/page-loader.component';
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent,
  PageLoaderComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
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

  content: Record<string, SiteContentResponse> = {};

  exhibitions: ExhibitionResponse[] = [];
  publications: PublicationResponse[] = [];

  loading = true;
  loadError = false;

  ngOnInit(): void {
    forkJoin({
      profile: this.portfolioApi.getProfile(),
      content: this.portfolioApi.getSiteContent(),
      exhibitions: this.portfolioApi.getExhibitions(),
      publications: this.portfolioApi.getPublications()
    }).subscribe({
      next: ({ profile, content, exhibitions, publications }) => {
        this.profile = profile;

        this.content = content
          .filter((item) => item.key.startsWith('about.'))
          .reduce<Record<string, SiteContentResponse>>((acc, item) => {
            acc[item.key] = item;
            return acc;
          }, {});

        this.exhibitions = [...exhibitions]
          .sort((a, b) => this.compareExhibitions(a, b))
          .slice(0, 5);

        this.publications = [...publications]
          .sort((a, b) => {
            const yearA = a.publicationYear ?? this.extractYear(a.publicationDate);
            const yearB = b.publicationYear ?? this.extractYear(b.publicationDate);

            if (yearA !== yearB) {
              return yearB - yearA;
            }

            return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          })
          .slice(0, 3);

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading about page data', error);
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  item(key: string): SiteContentResponse | undefined {
    return this.content[key];
  }

  get processSteps(): SiteContentResponse[] {
    return [
      this.item('about.process.01'),
      this.item('about.process.02'),
      this.item('about.process.03'),
      this.item('about.process.04'),
      this.item('about.process.05')
    ].filter((item): item is SiteContentResponse => !!item);
  }

  get axes(): SiteContentResponse[] {
    return [
      this.item('about.axis.portrait'),
      this.item('about.axis.urban'),
      this.item('about.axis.social')
    ].filter((item): item is SiteContentResponse => !!item);
  }

  exhibitionYear(exhibition: ExhibitionResponse): string {
    return exhibition.year?.toString()
      ?? exhibition.startDate?.substring(0, 4)
      ?? '';
  }

  publicationYear(publication: PublicationResponse): string {
    const year =
      publication.publicationYear ??
      this.extractYear(publication.publicationDate);

    return year > 0 ? String(year) : '';
  }

  publicationImage(publication: PublicationResponse): string | undefined {
    return publication.coverImageUrl
      ?? publication.images?.find((image) => image.cover)?.imageUrl
      ?? publication.images?.[0]?.imageUrl;
  }

  private compareExhibitions(
    a: ExhibitionResponse,
    b: ExhibitionResponse
  ): number {
    const yearA = a.year ?? this.extractYear(a.startDate);
    const yearB = b.year ?? this.extractYear(b.startDate);

    if (yearA !== yearB) {
      return yearB - yearA;
    }

    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  }

  private extractYear(date?: string): number {
    if (!date || date.length < 4) {
      return 0;
    }

    const year = Number(date.substring(0, 4));
    return Number.isFinite(year) ? year : 0;
  }
}
