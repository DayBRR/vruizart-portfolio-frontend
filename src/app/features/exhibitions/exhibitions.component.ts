import { Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ArtistProfile, ExhibitionResponse } from '../../core/models/portfolio.models';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';

interface CollectiveExhibitionGroup {
  year: number;
  exhibitions: ExhibitionResponse[];
}

@Component({
  selector: 'app-exhibitions',
  standalone: true,
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.scss'
})
export class ExhibitionsComponent implements OnInit {
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

  individualExhibitions: ExhibitionResponse[] = [];
  collectiveGroups: CollectiveExhibitionGroup[] = [];
  heroExhibitions: ExhibitionResponse[] = [];

  loading = true;
  loadError = false;
  selectedPoster?: string;
  selectedPosterAlt = '';

  ngOnInit(): void {
    forkJoin({
      profile: this.portfolioApi.getProfile(),
      exhibitions: this.portfolioApi.getExhibitions()
    }).subscribe({
      next: ({ profile, exhibitions }) => {
        this.profile = profile;

        this.individualExhibitions = exhibitions
          .filter((exhibition) => exhibition.type === 'INDIVIDUAL')
          .sort((a, b) => this.compareExhibitions(a, b));

        const collectiveExhibitions = exhibitions
          .filter((exhibition) => exhibition.type === 'COLLECTIVE');

        this.collectiveGroups = this.groupCollectivesByYear(collectiveExhibitions);

        this.heroExhibitions = this.individualExhibitions
          .filter((exhibition) => !!exhibition.imageUrl)
          .slice(0, 3);

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading exhibitions page data', error);
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  get trajectoryRange(): string {
    const years = [
      ...this.individualExhibitions,
      ...this.collectiveGroups.flatMap((group) => group.exhibitions)
    ]
      .map((exhibition) => exhibition.year)
      .filter((year): year is number => year !== undefined && year !== null);

    if (!years.length) {
      return '';
    }

    const min = Math.min(...years);
    const max = Math.max(...years);

    return min === max ? `${min}` : `${min}—${max}`;
  }

  formatDateRange(exhibition: ExhibitionResponse): string {
    const start = this.parseDate(exhibition.startDate);
    const end = this.parseDate(exhibition.endDate);

    if (!start && !end) {
      return exhibition.year?.toString() ?? '';
    }

    if (start && !end) {
      return `${start.day} ${start.month} ${start.year}`;
    }

    if (!start && end) {
      return `${end.day} ${end.month} ${end.year}`;
    }

    if (!start || !end) {
      return '';
    }

    if (start.year === end.year && start.month === end.month) {
      return `${start.day} - ${end.day} ${end.month} ${end.year}`;
    }

    if (start.year === end.year) {
      return `${start.day} ${start.month} - ${end.day} ${end.month} ${end.year}`;
    }

    return `${start.day} ${start.month} ${start.year} - ${end.day} ${end.month} ${end.year}`;
  }

  openPoster(exhibition: ExhibitionResponse): void {
    if (!exhibition.imageUrl) {
      return;
    }

    this.selectedPoster = exhibition.imageUrl;
    this.selectedPosterAlt = `Cartel de ${exhibition.title}`;
  }

  closePoster(): void {
    this.selectedPoster = undefined;
    this.selectedPosterAlt = '';
  }

  private compareExhibitions(
    a: ExhibitionResponse,
    b: ExhibitionResponse
  ): number {
    const yearDifference = (b.year ?? 0) - (a.year ?? 0);

    if (yearDifference !== 0) {
      return yearDifference;
    }

    return a.sortOrder - b.sortOrder;
  }

  private groupCollectivesByYear(
    exhibitions: ExhibitionResponse[]
  ): CollectiveExhibitionGroup[] {
    const grouped = new Map<number, ExhibitionResponse[]>();

    for (const exhibition of exhibitions) {
      if (!exhibition.year) {
        continue;
      }

      const items = grouped.get(exhibition.year) ?? [];
      items.push(exhibition);
      grouped.set(exhibition.year, items);
    }

    return Array.from(grouped.entries())
      .sort(([yearA], [yearB]) => yearB - yearA)
      .map(([year, items]) => ({
        year,
        exhibitions: items.sort((a, b) => a.sortOrder - b.sortOrder)
      }));
  }

  private parseDate(
    value?: string
  ): { day: number; month: string; year: number } | undefined {
    if (!value) {
      return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return undefined;
    }

    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre'
    ];

    return {
      day,
      month: months[month - 1],
      year
    };
  }
}
