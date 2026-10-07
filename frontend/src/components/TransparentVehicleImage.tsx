import React, { useEffect, useRef, useState } from 'react';

type TransparentVehicleImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  turntable?: boolean;
};

type ProcessedEntry = {
  src: string;
  ownedObjectUrl: boolean;
};

const cache = new Map<string, Promise<ProcessedEntry>>();

const quantize = (value: number) => Math.round(value / 16) * 16;

const colorDistance = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
) => Math.hypot(r1 - r2, g1 - g2, b1 - b2);

const isNeutralLight = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) < 34 && max >= 145;
};

/**
 * Some of the supplied vehicle renders contain a baked-in light checkerboard.
 * We remove only checkerboard-like pixels that are connected to the image edge,
 * so white/silver parts of the actual vehicle remain intact.
 */
const processCheckerboard = (source: string): Promise<ProcessedEntry> => {
  const cached = cache.get(source);
  if (cached) return cached;

  const promise = new Promise<ProcessedEntry>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      try {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) {
          resolve({ src: source, ownedObjectUrl: false });
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve({ src: source, ownedObjectUrl: false });
          return;
        }

        ctx.drawImage(image, 0, 0);
        const bitmap = ctx.getImageData(0, 0, width, height);
        const pixels = bitmap.data;
        const band = Math.max(4, Math.floor(Math.min(width, height) * 0.07));
        const histogram = new Map<string, number>();

        // Learn candidate checker colors from the outer border only.
        const sample = (x: number, y: number) => {
          const i = (y * width + x) * 4;
          if (pixels[i + 3] < 245) return;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          if (!isNeutralLight(r, g, b)) return;
          const key = [quantize(r), quantize(g), quantize(b)].join(',');
          histogram.set(key, (histogram.get(key) || 0) + 1);
        };

        for (let y = 0; y < Math.min(band, height); y++) {
          for (let x = 0; x < width; x++) sample(x, y);
        }
        for (let y = Math.max(0, height - band); y < height; y++) {
          for (let x = 0; x < width; x++) sample(x, y);
        }
        for (let y = band; y < Math.max(band, height - band); y += Math.max(1, Math.floor(band / 2))) {
          sample(0, y);
          sample(width - 1, y);
        }

        const backgroundColors = [...histogram.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([key]) => key.split(',').map(Number));

        if (backgroundColors.length < 1) {
          resolve({ src: source, ownedObjectUrl: false });
          return;
        }

        const isBackground = (i: number) => {
          if (pixels[i + 3] < 245) return false;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          if (!isNeutralLight(r, g, b)) return false;

          const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
          const matchesLearnedColor = backgroundColors.some(([br, bg, bb]) =>
            colorDistance(r, g, b, br, bg, bb) <= 52
          );

          // Very light neutral edge pixels are strong checkerboard candidates
          // even when compression shifted their exact color.
          return matchesLearnedColor || luminance >= 208;
        };

        const visited = new Uint8Array(width * height);
        const stack: number[] = [];

        const seed = (x: number, y: number) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return;
          const p = (y * width) + x;
          if (visited[p]) return;
          const i = p * 4;
          if (!isBackground(i)) return;
          visited[p] = 1;
          stack.push(p);
        };

        for (let x = 0; x < width; x++) {
          seed(x, 0);
          seed(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          seed(0, y);
          seed(width - 1, y);
        }

        while (stack.length > 0) {
          const p = stack.pop() as number;
          const x = p % width;
          const y = Math.floor(p / width);
          pixels[(p * 4) + 3] = 0;

          seed(x - 1, y);
          seed(x + 1, y);
          seed(x, y - 1);
          seed(x, y + 1);
        }

        ctx.putImageData(bitmap, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve({ src: source, ownedObjectUrl: false });
            return;
          }
          const objectUrl = URL.createObjectURL(blob);
          resolve({ src: objectUrl, ownedObjectUrl: true });
        }, 'image/png');
      } catch {
        resolve({ src: source, ownedObjectUrl: false });
      }
    };

    image.onerror = () => resolve({ src: source, ownedObjectUrl: false });
    image.src = source;
  });

  cache.set(source, promise);
  return promise;
};

const useVehicleMotion = (
  ref: React.RefObject<HTMLSpanElement>,
  enabled: boolean
) => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled || reducedMotion) return;

    element.style.willChange = 'transform';
    const animation = element.animate(
      [
        { transform: 'perspective(1100px) rotateY(0deg) rotateZ(-1deg) scaleX(1) translateY(0)' },
        { transform: 'perspective(1100px) rotateY(60deg) rotateZ(0deg) scaleX(.88) translateY(-1px)' },
        { transform: 'perspective(1100px) rotateY(120deg) rotateZ(.5deg) scaleX(.64) translateY(-2px)' },
        { transform: 'perspective(1100px) rotateY(180deg) rotateZ(1deg) scaleX(.46) translateY(-1px)' },
        { transform: 'perspective(1100px) rotateY(240deg) rotateZ(.5deg) scaleX(.64) translateY(-2px)' },
        { transform: 'perspective(1100px) rotateY(300deg) rotateZ(0deg) scaleX(.88) translateY(-1px)' },
        { transform: 'perspective(1100px) rotateY(360deg) rotateZ(-1deg) scaleX(1) translateY(0)' }
      ],
      {
        duration: 7200,
        iterations: Infinity,
        easing: 'linear',
        fill: 'both'
      }
    );

    return () => {
      animation.cancel();
      if (element) element.style.willChange = '';
    };
  }, [ref, enabled, reducedMotion]);
};

const TransparentVehicleImage: React.FC<TransparentVehicleImageProps> = ({
  src,
  className = '',
  turntable = false,
  ...props
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [processedSrc, setProcessedSrc] = useState<string>(String(src || ''));

  useEffect(() => {
    let cancelled = false;

    if (typeof window === 'undefined' || !src) {
      return () => {};
    }

    processCheckerboard(String(src))
      .then((result) => {
        if (!cancelled) setProcessedSrc(result.src);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useVehicleMotion(wrapperRef, turntable);

  const image = (
    <img
      {...props}
      src={processedSrc || undefined}
      alt={props.alt || ''}
      className={className}
      draggable={false}
      style={{
        ...props.style,
        opacity: 1,
        transition: 'opacity 180ms ease'
      }}
    />
  );

  if (!turntable) return image;

  return (
    <span
      ref={wrapperRef}
      className="vehicle-turntable"
      aria-hidden={props.alt === ''}
    >
      {image}
    </span>
  );
};

export default TransparentVehicleImage;
