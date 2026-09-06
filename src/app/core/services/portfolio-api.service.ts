import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ArtistProfile, CollectionCard, ExhibitionItem, FeaturedArtwork } from '../models/portfolio.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  getProfile(): Observable<ArtistProfile> { return this.http.get<ArtistProfile>(`${this.baseUrl}/profile`); }
  getCollections(): Observable<CollectionCard[]> { return this.http.get<CollectionCard[]>(`${this.baseUrl}/collections`); }
  getFeaturedArtworks(): Observable<FeaturedArtwork[]> { return this.http.get<FeaturedArtwork[]>(`${this.baseUrl}/artworks?featured=true`); }
  getExhibitions(): Observable<ExhibitionItem[]> { return this.http.get<ExhibitionItem[]>(`${this.baseUrl}/exhibitions`); }
}
