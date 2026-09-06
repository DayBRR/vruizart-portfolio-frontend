import { ArtistProfile, CollectionCard, ExhibitionItem, FeaturedArtwork, HeroSlide } from '../models/portfolio.models';

export const HERO_SLIDES: HeroSlide[] = [
  {
    imageUrl: "assets/images/hero/hero-1.jpg",
    altText: "Vista de una exposición de Vicente Ruiz, 2022"
  },
  {
    imageUrl: "assets/images/hero/hero-2.jpg",
    altText: "Vista de una exposición de Vicente Ruiz, 2024"
  },
  {
    imageUrl: "assets/images/hero/hero-3.jpg",
    altText: "Vicente Ruiz junto a una de sus obras en exposición, 2024"
  },
  {
    imageUrl: "assets/images/hero/hero-4.jpg",
    altText: "Vista de una exposición de Vicente Ruiz, 2024"
  },
  {
    imageUrl: "assets/images/hero/hero-5.jpg",
    altText: "Vista de una exposición de Vicente Ruiz, 2020"
  }
];

export const COLLECTIONS: CollectionCard[] = [
  {
    name: "Paisaje urbano",
    slug: "paisaje-urbano",
    imageUrl: "assets/images/collections/collection-1.jpg"
  },
  {
    name: "Retratos",
    slug: "retratos",
    imageUrl: "assets/images/collections/collection-2.jpg"
  },
  {
    name: "Leyendas de la música",
    slug: "leyendas-de-la-musica",
    imageUrl: "assets/images/collections/collection-3.jpg"
  },
  {
    name: "Un cuadro, una historia",
    slug: "un-cuadro-una-historia",
    imageUrl: "assets/images/collections/collection-4.jpg"
  },
  {
    name: "Ventanas del alma",
    slug: "ventanas-del-alma",
    imageUrl: "assets/images/collections/collection-5.jpg"
  },
  {
    name: "20x20",
    slug: "20x20",
    imageUrl: "assets/images/collections/collection-6.jpg"
  },
  {
    name: "Otras obras",
    slug: "otras-obras",
    imageUrl: "assets/images/collections/collection-7.jpg"
  }
];

export const FEATURED_ARTWORKS: FeaturedArtwork[] = [
  {
    title: "Vigilando el abandono",
    slug: "vigilando-el-abandono",
    year: 2021,
    technique: "Óleo sobre lienzo",
    dimensions: "100 × 100 cm",
    imageUrl: "assets/images/artworks/artwork-1.jpg",
    shape: "square"
  },
  {
    title: "Cara oculta de Piazza San Marco",
    slug: "cara-oculta-de-piazza-san-marco",
    year: 2020,
    technique: "Óleo sobre lienzo",
    dimensions: "65 × 81 cm",
    imageUrl: "assets/images/artworks/artwork-2.jpg",
    shape: "portrait"
  },
  {
    title: "La bruja de Cadaqués",
    slug: "la-bruja-de-cadaques",
    year: 2020,
    technique: "Óleo sobre lienzo",
    dimensions: "65 × 81 cm",
    imageUrl: "assets/images/artworks/artwork-3.jpg",
    shape: "portrait"
  },
  {
    title: "Imagine",
    slug: "imagine",
    year: 2020,
    technique: "Óleo sobre lienzo",
    dimensions: "65 × 81 cm",
    imageUrl: "assets/images/artworks/artwork-4.jpg",
    shape: "portrait"
  },
  {
    title: "Cooper",
    slug: "cooper",
    year: 2019,
    technique: "Óleo sobre lienzo",
    dimensions: "60 × 60 cm",
    imageUrl: "assets/images/artworks/artwork-5.jpg",
    shape: "square"
  },
  {
    title: "Amy",
    slug: "amy",
    year: 2020,
    technique: "Óleo sobre lienzo",
    dimensions: "60 × 60 cm",
    imageUrl: "assets/images/artworks/artwork-6.jpg",
    shape: "square"
  },
  {
    title: "Aprendiz de payaso",
    slug: "aprendiz-de-payaso",
    year: 2024,
    technique: "Óleo sobre lienzo",
    dimensions: "80 × 80 cm",
    imageUrl: "assets/images/artworks/artwork-7.jpg",
    shape: "square"
  },
  {
    title: "Ione",
    slug: "ione",
    year: 2021,
    technique: "Óleo sobre lienzo",
    dimensions: "80 × 100 cm",
    imageUrl: "assets/images/artworks/artwork-8.jpg",
    shape: "portrait"
  },
  {
    title: "Guerreras del agua",
    slug: "guerreras-del-agua",
    year: 2024,
    technique: "Óleo sobre lienzo",
    dimensions: "80 × 80 cm",
    imageUrl: "assets/images/artworks/artwork-9.jpg",
    shape: "square"
  },
  {
    title: "Guerra y escuela",
    slug: "guerra-y-escuela",
    year: 2025,
    technique: "Óleo sobre lienzo",
    dimensions: "80 × 80 cm",
    imageUrl: "assets/images/artworks/artwork-10.jpg",
    shape: "square"
  },
  {
    title: "Boxer",
    slug: "boxer",
    year: 2019,
    technique: "Carboncillo sobre papel",
    dimensions: "40 × 40 cm",
    imageUrl: "assets/images/artworks/artwork-11.jpg",
    shape: "square"
  },
  {
    title: "Isabelle",
    slug: "isabelle",
    year: 2019,
    technique: "Carboncillo sobre papel",
    dimensions: "40 × 40 cm",
    imageUrl: "assets/images/artworks/artwork-12.jpg",
    shape: "square"
  }
];

export const EXHIBITIONS: ExhibitionItem[] = [
  {
    title: "Pinceladas de vida",
    type: "Exposición individual",
    location: "C. C. Mariano Mesonada · Utebo",
    dateLabel: "11 abr — 10 may 2024"
  },
  {
    title: "Inquietudes",
    type: "Exposición individual",
    location: "Casa de la Cámara · Tauste",
    dateLabel: "7 — 30 oct 2022",
    posterUrl: "assets/images/exhibitions/inquietudes-poster.jpg"
  },
  {
    title: "Retratos que dan la nota",
    type: "Exposición individual",
    location: "Ayuntamiento de Tauste · Tauste",
    dateLabel: "2022"
  },
  {
    title: "Miradas y visiones",
    type: "Exposición individual",
    location: "Centros Cívicos · Zaragoza",
    dateLabel: "2 mar — 18 abr 2022"
  },
  {
    title: "Leyendas de la música",
    type: "Exposición individual",
    location: "Ayuntamiento de Zaragoza · Zaragoza",
    dateLabel: "2020"
  },
  {
    title: "Ventanas del alma",
    type: "Exposición individual",
    location: "Centro Cívico Delicias · Zaragoza",
    dateLabel: "2020"
  },
  {
    title: "Colectivas",
    type: "Exposiciones colectivas",
    location: "Contenido en preparación",
    dateLabel: ""
  }
];

export const ARTIST_PROFILE: ArtistProfile = {
  name: 'Vicente Ruiz',
  subtitle: 'Artista plástico - Zaragoza',
  bio: 'Artista plástico aragonés afincado en Zaragoza. Alterna el retrato y el paisaje urbano con una mirada atenta a lo cotidiano y a esos rincones que suelen pasar desapercibidos. Actualmente desarrolla Un cuadro, una historia, un proyecto de temática social.',
  quote: 'Considero arte toda aquella expresión capaz de conmover al que la percibe.',
  profileImageUrl: 'assets/images/profile/vicente-studio.jpg',
  instagram: 'https://www.instagram.com/vicenteruizdeza/',
  email: 'vruiz77@gmail.com'
};
