export interface HeroSlide {
  imageUrl: string;
  altText: string;
}

export interface ArtistProfile {
  name: string;
  subtitle: string;
  bio: string;
  statement?: string;
  quote: string;
  profileImageUrl: string;
  signatureImageUrl?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  email?: string;
}

export interface CollectionResponse {
  name: string;
  slug: string;
  description?: string;
  coverImageUrl: string;
  sortOrder: number;
}

export interface ArtworkImageResponse {
  imageUrl: string;
  altText?: string;
  sortOrder: number;
  main: boolean;
}

export interface ArtworkResponse {
  title: string;
  slug: string;
  year?: number;
  description?: string;
  widthCm?: number;
  heightCm?: number;
  price?: number;
  status: string;
  featured: boolean;
  collectionName?: string;
  collectionSlug?: string;
  technique?: string;
  mainImageUrl?: string;
  images: ArtworkImageResponse[];
}

export type ExhibitionType = 'INDIVIDUAL' | 'COLLECTIVE';

export interface ExhibitionResponse {
  title: string;
  slug: string;
  type: ExhibitionType;
  description?: string;
  startDate?: string;
  endDate?: string;
  year?: number;
  locationName?: string;
  locationAddress?: string;
  imageUrl?: string;
  current: boolean;
  sortOrder: number;
}

/* Modelos usados por la Home */

export interface CollectionCard {
  name: string;
  slug: string;
  imageUrl: string;
}

export interface FeaturedArtwork {
  title: string;
  slug: string;
  year: number;
  technique: string;
  dimensions: string;
  imageUrl: string;
  shape: 'square' | 'portrait';
}

export interface ExhibitionItem {
  title: string;
  type: string;
  location: string;
  dateLabel: string;
  posterUrl?: string;
}