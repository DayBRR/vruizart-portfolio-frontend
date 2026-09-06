import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ArtistProfile,
  ArtworkResponse,
  CollectionResponse,
  ExhibitionResponse
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

  getArtworks(collection?: string): Observable<ArtworkResponse[]> {
    const params: { [param: string]: string } = {};

    if (collection) {
      params['collection'] = collection;
    }

    return this.http.get<ArtworkResponse[]>(
      `${this.baseUrl}/artworks`,
      { params }
    );
  }

  getArtwork(slug: string): Observable<ArtworkResponse> {
    return this.http.get<ArtworkResponse>(
      `${this.baseUrl}/artworks/${encodeURIComponent(slug)}`
    );
  }

  getFeaturedArtworks(): Observable<ArtworkResponse[]> {
    return this.http.get<ArtworkResponse[]>(
      `${this.baseUrl}/artworks?featured=true`
    );
  }

  getExhibitions(): Observable<ExhibitionResponse[]> {
    return this.http.get<ExhibitionResponse[]>(
      `${this.baseUrl}/exhibitions`
    );
  }
}
