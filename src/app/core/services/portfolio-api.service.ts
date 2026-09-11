import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ArtistProfile,
  ArtworkResponse,
  CollectionResponse,
  ExhibitionResponse,
  PageResponse,
  PublicationResponse,
  SiteContentResponse
} from '../models/portfolio.models';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getProfile(): Observable<ArtistProfile> {
    return this.http.get<ArtistProfile>(`${this.baseUrl}/profile`);
  }

  getCollections(): Observable<CollectionResponse[]> {
    return this.http.get<CollectionResponse[]>(`${this.baseUrl}/collections`);
  }

  getArtworks(
    collection?: string,
    page = 0,
    size = 12
  ): Observable<PageResponse<ArtworkResponse>> {
    const params: { [param: string]: string } = {
      page: String(page),
      size: String(size)
    };

    if (collection) {
      params['collection'] = collection;
    }

    return this.http.get<PageResponse<ArtworkResponse>>(
      `${this.baseUrl}/artworks`,
      { params }
    );
  }

  getHeroArtworks(): Observable<ArtworkResponse[]> {
    return this.http.get<ArtworkResponse[]>(
      `${this.baseUrl}/artworks/hero`
    );
  }

  getFeaturedArtworks(): Observable<ArtworkResponse[]> {
    return this.http.get<ArtworkResponse[]>(
      `${this.baseUrl}/artworks/featured`
    );
  }

  getArtwork(slug: string): Observable<ArtworkResponse> {
    return this.http.get<ArtworkResponse>(
      `${this.baseUrl}/artworks/${encodeURIComponent(slug)}`
    );
  }

  getExhibitions(): Observable<ExhibitionResponse[]> {
    return this.http.get<ExhibitionResponse[]>(
      `${this.baseUrl}/exhibitions`
    );
  }

  getPublications(featured?: boolean): Observable<PublicationResponse[]> {
    const params: { [param: string]: string } = {};

    if (featured !== undefined) {
      params['featured'] = String(featured);
    }

    return this.http.get<PublicationResponse[]>(
      `${this.baseUrl}/publications`,
      { params }
    );
  }

  getSiteContent(): Observable<SiteContentResponse[]> {
    return this.http.get<SiteContentResponse[]>(`${this.baseUrl}/content`);
  }

  getHeroContent(): Observable<SiteContentResponse[]> {
    return this.http.get<SiteContentResponse[]>(
      `${this.baseUrl}/content/hero`
    );
  }

  getPublication(slug: string): Observable<PublicationResponse> {
    return this.http.get<PublicationResponse>(
      `${this.baseUrl}/publications/${encodeURIComponent(slug)}`
    );
  }
}
