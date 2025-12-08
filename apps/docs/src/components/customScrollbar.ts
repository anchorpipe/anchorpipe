/* eslint-disable @typescript-eslint/no-explicit-any */
/* Register the custom scrollbar web component in the browser context. */
import type React from 'react';

let template: HTMLTemplateElement | null = null;
const createTemplate = () => {
  if (template || typeof document === 'undefined') return;
  template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host {
        display: block;
        position: relative;
        overflow: hidden;
      }
      .scroll-content {
        overflow: auto;
        height: 100%;
        width: 100%;
        padding-right: 12px;
        padding-bottom: 12px;
        box-sizing: border-box;
      }

      .scrollbar-track {
        position: absolute;
        background: var(--scrollbar-track-background, #f1f1f1);
        border-radius: var(--scrollbar-track-border-radius, 4px);
        z-index: 10;
      }
      .scrollbar-thumb {
        position: absolute;
        background: var(--scrollbar-thumb-background, #c1c1c1);
        border-radius: var(--scrollbar-thumb-border-radius, 4px);
        cursor: pointer;
        transition: opacity 0.2s ease-in-out;
        opacity: var(--scrollbar-thumb-opacity, 0.4);
      }
      .scrollbar-thumb:hover { opacity: var(--scrollbar-thumb-hover-opacity, 0.7); }
      .scrollbar-thumb.dragging { opacity: 1; }

      .scrollbar-track.vertical { top: 0; right: 0; width: var(--scrollbar-size, 8px); height: 100%; }
      .scrollbar-track.horizontal { bottom: 0; left: 0; height: var(--scrollbar-size, 8px); width: 100%; }
      .scrollbar-thumb.vertical { width: 100%; }
      .scrollbar-thumb.horizontal { height: 100%; }
    </style>
    <div class="scroll-content" part="scroll-content">
      <slot></slot>
    </div>
    <div class="scrollbar-track vertical" part="track-vertical">
      <div class="scrollbar-thumb vertical" part="thumb-vertical"></div>
    </div>
    <div class="scrollbar-track horizontal" part="track-horizontal">
      <div class="scrollbar-thumb horizontal" part="thumb-horizontal"></div>
    </div>
  `;
};

let isDefined = false;

export const ensureCustomScrollbar = (): void => {
  if (
    typeof window === 'undefined' ||
    typeof customElements === 'undefined' ||
    typeof HTMLElement === 'undefined'
  ) {
    return;
  }
  if (isDefined) return;

  createTemplate();

  class CustomScrollbar extends HTMLElement {
    static get observedAttributes() {
      return ['auto-hide'];
    }

    private _scrollContent!: HTMLElement;
    private _verticalTrack!: HTMLElement;
    private _verticalThumb!: HTMLElement;
    private _horizontalTrack!: HTMLElement;
    private _horizontalThumb!: HTMLElement;
    private _resizeObserver?: ResizeObserver;
    private _rafs: number[] = [];
    private _isDraggingThumb = false;
    private _dragStartPos = { x: 0, y: 0 };
    private _thumbStartPos = { x: 0, y: 0 };

    constructor() {
      super();
      createTemplate();
      const shadow = this.attachShadow({ mode: 'open' });
      if (template) {
        shadow.appendChild(template.content.cloneNode(true));
      }
      this._scrollContent = shadow.querySelector('.scroll-content') as HTMLElement;
      this._verticalTrack = shadow.querySelector('.scrollbar-track.vertical') as HTMLElement;
      this._verticalThumb = shadow.querySelector('.scrollbar-thumb.vertical') as HTMLElement;
      this._horizontalTrack = shadow.querySelector('.scrollbar-track.horizontal') as HTMLElement;
      this._horizontalThumb = shadow.querySelector('.scrollbar-thumb.horizontal') as HTMLElement;
    }

    connectedCallback() {
      this._setupEventListeners();
      this._updateScrollbars();
      this._resizeObserver = new ResizeObserver(() => this._updateScrollbars());
      this._resizeObserver.observe(this._scrollContent);
    }

    disconnectedCallback() {
      this._removeEventListeners();
      this._resizeObserver?.disconnect();
      this._rafs.forEach((id) => cancelAnimationFrame(id));
    }

    private _setupEventListeners() {
      this._scrollContent.addEventListener('scroll', this._handleScroll, { passive: true });
      this._verticalThumb.addEventListener('mousedown', this._handleThumbMouseDown);
      this._verticalTrack.addEventListener('click', this._handleTrackClick);
      this._horizontalThumb.addEventListener('mousedown', this._handleThumbMouseDown);
      this._horizontalTrack.addEventListener('click', this._handleTrackClick);
      document.addEventListener('mousemove', this._handleThumbMouseMove);
      document.addEventListener('mouseup', this._handleThumbMouseUp);
    }

    private _removeEventListeners() {
      this._scrollContent.removeEventListener('scroll', this._handleScroll);
      this._verticalThumb.removeEventListener('mousedown', this._handleThumbMouseDown);
      this._verticalTrack.removeEventListener('click', this._handleTrackClick);
      this._horizontalThumb.removeEventListener('mousedown', this._handleThumbMouseDown);
      this._horizontalTrack.removeEventListener('click', this._handleTrackClick);
      document.removeEventListener('mousemove', this._handleThumbMouseMove);
      document.removeEventListener('mouseup', this._handleThumbMouseUp);
    }

    private _handleScroll = () => {
      this._updateThumbPositions();
    };

    private _updateScrollbars() {
      const rafId = requestAnimationFrame(() => {
        const { scrollHeight, clientHeight, scrollWidth, clientWidth } = this._scrollContent;

        if (scrollHeight > clientHeight) {
          this._verticalTrack.style.display = 'block';
          const thumbHeight = (clientHeight / scrollHeight) * 100;
          this._verticalThumb.style.height = `${thumbHeight}%`;
        } else {
          this._verticalTrack.style.display = 'none';
        }

        if (scrollWidth > clientWidth) {
          this._horizontalTrack.style.display = 'block';
          const thumbWidth = (clientWidth / scrollWidth) * 100;
          this._horizontalThumb.style.width = `${thumbWidth}%`;
        } else {
          this._horizontalTrack.style.display = 'none';
        }

        this._updateThumbPositions();
      });
      this._rafs.push(rafId);
    }

    private _updateThumbPositions() {
      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } =
        this._scrollContent;

      const verticalMax = Math.max(scrollHeight - clientHeight, 1);
      const horizontalMax = Math.max(scrollWidth - clientWidth, 1);

      const verticalThumbTop =
        ((scrollTop / verticalMax) * (100 - (clientHeight / scrollHeight) * 100)) || 0;
      this._verticalThumb.style.top = `${verticalThumbTop}%`;

      const horizontalThumbLeft =
        ((scrollLeft / horizontalMax) * (100 - (clientWidth / scrollWidth) * 100)) || 0;
      this._horizontalThumb.style.left = `${horizontalThumbLeft}%`;
    }

    private _handleThumbMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this._isDraggingThumb = true;
      this._dragStartPos = { x: e.clientX, y: e.clientY };
      const thumb = e.target as HTMLElement;
      this._thumbStartPos = { x: thumb.offsetLeft, y: thumb.offsetTop };
      thumb.classList.add('dragging');
    };

    private _handleThumbMouseMove = (e: MouseEvent) => {
      if (!this._isDraggingThumb) return;
      e.preventDefault();
      const thumb = e.target as HTMLElement;
      const isVertical = thumb.classList.contains('vertical');

      if (isVertical) {
        const deltaY = e.clientY - this._dragStartPos.y;
        const trackHeight = this._verticalTrack.clientHeight;
        const thumbHeight = this._verticalThumb.clientHeight;
        const maxTop = trackHeight - thumbHeight;
        let newTop = this._thumbStartPos.y + deltaY;
        newTop = Math.max(0, Math.min(newTop, maxTop));

        const scrollRatio = maxTop ? newTop / maxTop : 0;
        const maxScrollTop = this._scrollContent.scrollHeight - this._scrollContent.clientHeight;
        this._scrollContent.scrollTop = scrollRatio * maxScrollTop;
      } else {
        const deltaX = e.clientX - this._dragStartPos.x;
        const trackWidth = this._horizontalTrack.clientWidth;
        const thumbWidth = this._horizontalThumb.clientWidth;
        const maxLeft = trackWidth - thumbWidth;
        let newLeft = this._thumbStartPos.x + deltaX;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));

        const scrollRatio = maxLeft ? newLeft / maxLeft : 0;
        const maxScrollLeft = this._scrollContent.scrollWidth - this._scrollContent.clientWidth;
        this._scrollContent.scrollLeft = scrollRatio * maxScrollLeft;
      }
    };

    private _handleThumbMouseUp = () => {
      if (this._isDraggingThumb) {
        this._isDraggingThumb = false;
        this._verticalThumb.classList.remove('dragging');
        this._horizontalThumb.classList.remove('dragging');
      }
    };

    private _handleTrackClick = (e: MouseEvent) => {
      if (e.target === this._verticalThumb || e.target === this._horizontalThumb) return;

      const track = e.currentTarget as HTMLElement;
      const isVertical = track.classList.contains('vertical');
      const rect = track.getBoundingClientRect();

      if (isVertical) {
        const clickPos = e.clientY - rect.top;
        const thumbHeight = this._verticalThumb.clientHeight;
        const scrollRatio = rect.height > thumbHeight ? clickPos / (rect.height - thumbHeight) : 0;
        const maxScrollTop = this._scrollContent.scrollHeight - this._scrollContent.clientHeight;
        this._scrollContent.scrollTop = scrollRatio * maxScrollTop;
      } else {
        const clickPos = e.clientX - rect.left;
        const thumbWidth = this._horizontalThumb.clientWidth;
        const scrollRatio = rect.width > thumbWidth ? clickPos / (rect.width - thumbWidth) : 0;
        const maxScrollLeft = this._scrollContent.scrollWidth - this._scrollContent.clientWidth;
        this._scrollContent.scrollLeft = scrollRatio * maxScrollLeft;
      }
    };
  }

  customElements.define('custom-scrollbar', CustomScrollbar);
  isDefined = true;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'custom-scrollbar': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

// Ensure global augmentation is applied in module scope
export {};

