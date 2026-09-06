export interface HeroSlide { imageUrl: string; altText: string; }
export interface CollectionCard { name: string; slug: string; imageUrl: string; }
export interface FeaturedArtwork { title: string; slug: string; year: number; technique: string; dimensions: string; imageUrl: string; shape: 'square' | 'portrait'; }
export interface ExhibitionItem { title: string; type: string; location: string; dateLabel: string; posterUrl?: string; }
export interface ArtistProfile { name: string; subtitle: string; bio: string; quote: string; profileImageUrl: string; instagram?: string; email?: string; }
