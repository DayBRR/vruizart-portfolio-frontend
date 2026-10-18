import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, reduce } from 'rxjs';

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
    size = 12,
    technique?: string
  ): Observable<PageResponse<ArtworkResponse>> {
    let params = new HttpParams().set('page', page).set('size', size);

    if (collection) {
      params = params.set('collection', collection);
    }
    if (technique) params = params.set('technique', technique);

    return this.http.get<PageResponse<ArtworkResponse>>(
      `${this.baseUrl}/artworks`,
      { params }
    );
  }

  getArtworkTechniques(collection?: string): Observable<string[]> {
    let params = new HttpParams();
    if (collection) params = params.set('collection', collection);
    return this.http.get<string[]>(`${this.baseUrl}/artworks/techniques`, { params });
  }

  // Follow server pagination, including servers that cap the requested page size.
  getAllArtworks(): Observable<ArtworkResponse[]> {
    return this.getArtworks(undefined, 0, 100).pipe(
      expand(page => page.page.number + 1 < page.page.totalPages
        ? this.getArtworks(undefined, page.page.number + 1, 100) : EMPTY),
      reduce((artworks, page) => artworks.concat(page.content), [] as ArtworkResponse[])
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
