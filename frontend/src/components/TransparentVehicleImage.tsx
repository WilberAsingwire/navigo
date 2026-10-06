import React, { useEffect, useState } from 'react';

type TransparentVehicleImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  turntable?: boolean;
};

type ProcessedEntry = {
  src: string;
};

const cache = new Map<string, Promise<ProcessedEntry>>();

const quantize = (value: number) => Math.round(value / 16) * 16;

const colorDistance = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
) => Math.sqrt(
  (r1 - r2) ** 2 +
  (g1 - g2) ** 2 +
  (b1 - b2) ** 2
);

const processCheckerboard = (source: string): Promise<ProcessedEntry> => {
  const cached = cache.get(source);
  if (cached) return cached;

  const promise = new Promise<ProcessedEntry>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas is unavailable');

        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data: pixels, width, height } = data;

        // Learn the checkerboard colors from a thin border band.
        const histogram = new Map<string, number>();
        const band = Math.max(3, Math.floor(Math.min(width, height) * 0.08));

        for (let y = 0; y < height; y++) {
          const onBorder = y < band || y >= height - band;
          for (let x = 0; x < width; x++) {
            if (!onBorder && x >= band && x < width - band) continue;
            const i = (y * width + x) * 4;
            if (pixels[i + 3] < 245) continue;
            const key = [
              quantize(pixels[i]),
              quantize(pixels[i + 1]),
              quantize(pixels[i + 2])
            ].join(',');
            histogram.set(key, (histogram.get(key) || 0) + 1);
          }
        }

        const bgColors = [...histogram.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([key]) => key.split(',').map(Number))
          .filter(([r, g, b]) => {
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            return max - min < 35 && max > 150;
          })
          .slice(0, 2);

        if (bgColors.length < 2) {
          resolve({ src: source });
          return;
        }

        const isBackground = (i: number) => {
          if (pixels[i + 3] < 245) return false;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          return bgColors.some(([br, bg, bb]) =>
            colorDistance(r, g, b, br, bg, bb) < 34
          );
        };

        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const seed = (x: number, y: number) => {
          const p = y * width + x;
          if (visited[p]) return;
          const i = p * 4;
          if (!isBackground(i)) return;
          visited[p] = 1;
          queue.push(p);
        };

        for (let x = 0; x < width; x++) {
          seed(x, 0);
          seed(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          seed(0, y);
          seed(width - 1, y);
        }

        while (queue.length) {
          const p = queue.pop() as number;
          const x = p % width;
          const y = Math.floor(p / width);
          pixels[p * 4 + 3] = 0;

          if (x > 0) seed(x - 1, y);
          if (x < width - 1) seed(x + 1, y);
          if (y > 0) seed(x, y - 1);
          if (y < height - 1) seed(x, y + 1);
        }

        ctx.putImageData(data, 0, 0);
        canvas.toBlob(blob => {
          if (!blob) {
            resolve({ src: source });
            return;
          }
          resolve({ src: URL.createObjectURL(blob) });
        }, 'image/png');
      } catch {
        resolve({ src: source });
      }
    };
    image.onerror = () => reject(new Error('Unable to load vehicle image'));
    image.src = source;
  });

  cache.set(source, promise);
  return promise;
};

const TransparentVehicleImage: React.FC<TransparentVehicleImageProps> = ({
  src,
  className = '',
  turntable = false,
  ...props
}) => {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (typeof window === 'undefined' || !src) return;

    processCheckerboard(String(src))
      .then(result => {
        if (!cancelled) setProcessedSrc(result.src);
      })
      .catch(() => {
        if (!cancelled) setProcessedSrc(String(src));
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const image = (
    <img
      {...props}
      src={processedSrc || undefined}
      alt={props.alt || ''}
      className={className}
      style={{
        ...props.style,
        opacity: processedSrc ? 1 : 0,
        transition: 'opacity 180ms ease'
      }}
    />
  );

  if (!turntable) return image;

  return (
    <span className="vehicle-turntable" aria-hidden={props.alt === ''}>
      {image}
    </span>
  );
};

export default TransparentVehicleImage;
