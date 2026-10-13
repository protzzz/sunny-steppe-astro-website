import { useEffect, useRef, useState } from 'react';

/** One side of the pack, prepared at build time by the product page (see getImage there). */
export interface ViewerImage {
  src: string;
  width: number;
  height: number;
  avif: string;
  webp: string;
  /** Large WebP shown in the zoom overlay. */
  zoom: string;
}

interface Props {
  name: string;
  front: ViewerImage;
  back: ViewerImage;
  labels: { rotate: string; rotateBack: string; zoom: string; dragHint: string; close: string };
}

const MAX_TILT = 26;

const faceClass =
  'absolute inset-0 m-auto max-h-[92%] max-w-[92%] object-contain backface-hidden drop-shadow-[0_30px_40px_rgba(20,54,94,.22)]';

// Rendered width of a face: 92% of a box up to 420px wide, or most of the phone screen.
const SIZES = '(max-width: 520px) 85vw, 390px';

const Face = ({
  img,
  alt,
  className,
  eager,
}: {
  img: ViewerImage;
  alt: string;
  className: string;
  eager?: boolean;
}) => (
  <picture className="contents">
    <source type="image/avif" srcSet={img.avif} sizes={SIZES} />
    <source type="image/webp" srcSet={img.webp} sizes={SIZES} />
    <img
      src={img.src}
      width={img.width}
      height={img.height}
      alt={alt}
      className={className}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
    />
  </picture>
);

const pillClass =
  'inline-flex cursor-pointer items-center gap-2 rounded-full border border-navy/16 px-[18px] py-[9px] text-[12.5px] font-semibold text-navy hover:border-gold/50 hover:bg-white';

export const ProductViewer = ({ name, front, back, labels }: Props) => {
  const [showBack, setShowBack] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(false);
  // Last pointer X while dragging, null when idle.
  const dragX = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragX.current === null) return;
      const dx = e.clientX - dragX.current;
      dragX.current = e.clientX;
      setTilt((t) => Math.max(-MAX_TILT, Math.min(MAX_TILT, t + dx * 0.35)));
    };
    const onUp = () => {
      dragX.current = null;
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const rotation = (showBack ? 180 : 0) + tilt;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          dragX.current = e.clientX;
          setDragging(true);
        }}
        className="flex aspect-square w-full max-w-[420px] cursor-grab touch-pan-y items-center justify-center select-none perspective-[1400px]"
      >
        <div
          data-testid="product-pack"
          className="relative size-full transform-3d"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transition: dragging ? 'none' : 'transform .6s cubic-bezier(.4,0,.2,1)',
          }}
        >
          <Face img={front} alt={name} className={faceClass} eager />
          <Face img={back} alt={name} className={`${faceClass} rotate-y-180`} />
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <button
          onClick={() => {
            setShowBack((v) => !v);
            setTilt(0);
          }}
          className={`${pillClass} bg-white/80`}
        >
          <span>⟲</span> {showBack ? labels.rotateBack : labels.rotate}
        </button>
        <button onClick={() => setZoom(true)} className={`${pillClass} bg-transparent`}>
          <span>⊕</span> {labels.zoom}
        </button>
      </div>
      <span className="text-[11.5px] text-earth">{labels.dragHint}</span>

      {zoom && (
        <div
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-90 flex cursor-zoom-out items-center justify-center bg-navy/62 p-[clamp(16px,4vw,48px)] backdrop-blur-[6px]"
        >
          <img
            src={(showBack ? back : front).zoom}
            alt={name}
            className="max-h-full max-w-full object-contain drop-shadow-[0_30px_60px_rgba(10,24,44,.45)]"
          />
          <button
            onClick={() => setZoom(false)}
            aria-label={labels.close}
            className="absolute top-[18px] right-5 size-[42px] cursor-pointer rounded-full border-none bg-cream/90 text-[20px] leading-none text-navy"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
