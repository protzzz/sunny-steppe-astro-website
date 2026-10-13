import { useRef, useState } from 'react';
import { DocumentRow } from '@components/DocumentRow';

interface Doc {
  title: string;
  meta: string;
  href: string;
  product?: string;
}

interface Props {
  items: { q: string; a: string; docs?: Doc[] }[];
  openLabel: string;
  downloadLabel: string;
}

// The answer should slide at a similar speed whatever its height: a fixed duration made the long
// documents answer jump open. Time grows with height, capped so tall answers don't feel sluggish.
const durationFor = (height: number) => Math.round(Math.min(1100, Math.max(320, 200 + height * 1.5)));

export const FaqList = ({ items, openLabel, downloadLabel }: Props) => {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [durations, setDurations] = useState<Record<number, number>>({});
  const contents = useRef<(HTMLDivElement | null)[]>([]);

  const toggle = (i: number) => {
    // The answer stays in the DOM while collapsed, so its natural height can be measured.
    setDurations((d) => ({ ...d, [i]: durationFor(contents.current[i]?.offsetHeight ?? 0) }));
    setOpen((s) => ({ ...s, [i]: !s[i] }));
  };

  return (
    <div className="mt-9 flex flex-col gap-2.5">
      {items.map((item, i) => {
        const isOpen = !!open[i];
        const id = `faq-${i}`;
        const ms = durations[i] ?? 380;
        // Height follows the full duration; the text fades in quickly so long answers don't sit pale.
        const slide = { transitionDuration: `${ms}ms` };
        const fade = { transitionDuration: `${Math.min(ms, 420)}ms` };
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-[18px] border bg-paper transition-[border-color,box-shadow] duration-300 ${
              isOpen ? 'border-gold/30 shadow-[0_14px_34px_rgba(20,54,94,.07)]' : 'border-navy/9'
            }`}
          >
            <button
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={id}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 border-0 px-6 py-5 text-left transition-colors duration-300 hover:bg-sand/40 ${
                isOpen ? 'bg-sand/40' : 'bg-transparent'
              }`}
            >
              <span className="font-heading text-[18px] leading-[1.3] font-semibold text-navy">{item.q}</span>
              <span
                className={`flex size-7 flex-none items-center justify-center rounded-full bg-navy/6 text-[18px] text-gold-ink transition-transform duration-300 ${
                  isOpen ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>
            {/* Animating grid rows from 0fr to 1fr lets the answer slide to its natural height. */}
            <div
              id={id}
              inert={!isOpen}
              style={slide}
              className={`grid transition-[grid-template-rows] ease-[cubic-bezier(.22,.8,.3,1)] ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div
                  ref={(el) => {
                    contents.current[i] = el;
                  }}
                  style={fade}
                  className={`border-t border-navy/7 px-6 pt-5 pb-6 transition-[opacity,translate] ${
                    isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
                  }`}
                >
                  <p className="m-0 text-[14.5px] leading-[1.7] text-lead">{item.a}</p>
                  {item.docs && (
                    <div className="mt-4 flex flex-col gap-2.5">
                      {item.docs.map((d) => (
                        <DocumentRow
                          key={d.href}
                          variant="tinted"
                          title={d.title}
                          meta={[d.meta]}
                          href={d.href}
                          product={d.product}
                          openLabel={openLabel}
                          downloadLabel={downloadLabel}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
