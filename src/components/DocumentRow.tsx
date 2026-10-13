interface Props {
  title: string;
  /** Line above the title, e.g. product name. */
  eyebrow?: string;
  /** Lines under the title: number, regulations, validity. */
  meta: string[];
  href: string;
  openLabel: string;
  downloadLabel: string;
  /** "tinted": inside the FAQ answer. */
  variant?: 'paper' | 'tinted';
  /** Product id for pdf_download. */
  product?: string;
}

const pill = 'inline-flex items-center rounded-full px-[18px] py-2.5 text-[13px] font-semibold whitespace-nowrap';

/** A downloadable document. Static: works without hydration. */
export const DocumentRow = ({
  title,
  eyebrow,
  meta,
  href,
  openLabel,
  downloadLabel,
  variant = 'paper',
  product,
}: Props) => (
  <div
    data-product={product}
    className={`flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[18px] border px-5 py-[18px] ${
      variant === 'tinted' ? 'border-gold/24 bg-sand/45' : 'border-navy/9 bg-paper'
    }`}
  >
    <div className="flex min-w-[min(100%,260px)] flex-1 items-center gap-4">
      <span
        aria-hidden="true"
        className="flex h-[54px] w-11 flex-none items-end justify-center rounded-[9px] border border-gold/45 bg-paper pb-2 text-[10px] font-bold tracking-[.06em] text-bronze"
      >
        PDF
      </span>
      <div className="min-w-0">
        {eyebrow && <div className="text-[11.5px] font-bold tracking-[.04em] text-khaki">{eyebrow}</div>}
        <div className="font-heading text-[17px] leading-[1.3] font-semibold text-navy">{title}</div>
        {meta.map((line) => (
          <div key={line} className="mt-0.5 text-[12.5px] leading-[1.5] text-subtle">
            {line}
          </div>
        ))}
      </div>
    </div>
    <div className="flex flex-none items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className={`${pill} bg-navy text-cream hover:bg-navy/90 hover:text-cream`}
      >
        {openLabel}
      </a>
      <a
        href={href}
        download
        className={`${pill} border border-navy/14 bg-paper/70 text-navy hover:border-gold/60 hover:text-navy`}
      >
        <span aria-hidden="true" className="mr-1.5">
          ↓
        </span>
        {downloadLabel}
      </a>
    </div>
  </div>
);
