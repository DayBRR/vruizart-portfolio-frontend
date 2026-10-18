import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { ArtworkImageResponse, ArtworkResponse } from '../../core/models/portfolio.models';

@Component({
  selector: 'app-artwork-viewer',
  standalone: true,
  templateUrl: './artwork-viewer.component.html',
  styleUrl: './artwork-viewer.component.scss'
})
export class ArtworkViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) artwork!: ArtworkResponse;
  @Input() artworks: ArtworkResponse[] = [];
  @Input() additionalFacts: { label: string; value: string }[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() artworkChange = new EventEmitter<ArtworkResponse>();
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('info') private info?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
  private readonly document = inject(DOCUMENT);
  private opener?: HTMLElement;
  private previousOverflow = '';
  private previousPadding = '';
  private previousRootOverflow = '';
  private background: { element: HTMLElement; inert: boolean }[] = [];
  private scrollX = 0;
  private scrollY = 0;
  selectedImageIndex = 0;
  imageLoaded = false;
  imageError = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['artwork']) this.resetArtwork();
  }

  private resetArtwork(): void {
    this.selectedImageIndex = Math.max(0, this.images.findIndex(image => image.main));
    this.resetImage();
  }

  ngAfterViewInit(): void {
    const view = this.document.defaultView;
    this.opener = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : undefined;
    this.scrollX = view?.scrollX ?? 0;
    this.scrollY = view?.scrollY ?? 0;
    const body = this.document.body;
    this.previousOverflow = body.style.overflow;
    this.previousPadding = body.style.paddingRight;
    this.previousRootOverflow = this.document.documentElement.style.overflow;
    const scrollbar = (view?.innerWidth ?? 0) - this.document.documentElement.clientWidth;
    if (scrollbar > 0 && view) body.style.paddingRight = `${parseFloat(view.getComputedStyle(body).paddingRight) + scrollbar}px`;
    body.style.overflow = 'hidden';
    this.document.documentElement.style.overflow = 'hidden';
    // Make background content unavailable to keyboard and assistive technology.
    let branch: HTMLElement | null = this.dialog?.nativeElement.parentElement ?? null;
    while (branch && branch !== body) {
      const parent: HTMLElement | null = branch.parentElement;
      for (const sibling of Array.from(parent?.children ?? [])) {
        if (sibling !== branch && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(sibling.tagName)) {
          this.background.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = parent;
    }
    this.closeButton?.nativeElement.focus({ preventScroll: true });
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
    this.document.body.style.paddingRight = this.previousPadding;
    this.document.documentElement.style.overflow = this.previousRootOverflow;
    for (const item of this.background) item.element.inert = item.inert;
    this.document.defaultView?.scrollTo(this.scrollX, this.scrollY);
    if (this.opener?.isConnected && !this.opener.closest('[inert]')) this.opener.focus({ preventScroll: true });
  }

  get images(): ArtworkImageResponse[] {
    const images = [...(this.artwork.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.artwork.mainImageUrl && !images.some(image => image.imageUrl === this.artwork.mainImageUrl)) {
      images.unshift({ imageUrl: this.artwork.mainImageUrl, altText: this.artwork.title, sortOrder: -1, main: true });
    }
    return images;
  }
  get imageUrl(): string { return this.images[this.selectedImageIndex]?.imageUrl ?? ''; }
  get imageAlt(): string { return this.images[this.selectedImageIndex]?.altText || this.artwork.title; }
  get artworkIndex(): number { return this.artworks.findIndex(artwork => artwork.slug === this.artwork.slug); }
  get canNavigate(): boolean { return this.artworks.length > 1 && this.artworkIndex >= 0; }
  get dimensions(): string {
    const { widthCm, heightCm } = this.artwork;
    return widthCm && heightCm ? `${widthCm.toLocaleString('es-ES')} × ${heightCm.toLocaleString('es-ES')} cm` : '—';
  }

  selectImage(index: number): void {
    if (index < 0 || index >= this.images.length || index === this.selectedImageIndex) return;
    this.selectedImageIndex = index;
    this.resetImage();
  }
  changeImage(delta: number): void {
    if (this.images.length > 1) this.selectImage((this.selectedImageIndex + delta + this.images.length) % this.images.length);
  }
  private resetImage(): void { this.imageLoaded = false; this.imageError = false; }

  changeArtwork(delta: number): void {
    const index = this.artworkIndex + delta;
    if (!this.canNavigate || index < 0 || index >= this.artworks.length) return;
    this.artwork = this.artworks[index];
    this.resetArtwork();
    this.info?.nativeElement.scrollTo(0, 0);
    this.artworkChange.emit(this.artwork);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closed.emit();
    } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        !event.altKey && !event.ctrlKey && !event.metaKey &&
        !(event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable=true], .lb-thumbs'))) {
      event.preventDefault();
      this.changeArtwork(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Tab') {
      const controls = this.dialog?.nativeElement.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1], active = this.document.activeElement;
      if (!this.dialog?.nativeElement.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  }
}
