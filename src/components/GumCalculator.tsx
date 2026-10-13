import { useState } from 'react';
import type { Dictionary } from '@i18n/types';
import { cupsWord } from '@i18n/plural';

interface Props {
  t: Dictionary['gumCalc'];
}

const CAFFEINE_PER_GUM = 35; // mg
const MAX_GUMS = 8;

const stepClass =
  'size-[46px] cursor-pointer rounded-full border-[1.5px] border-froth/30 bg-transparent text-[22px] text-froth hover:border-caramel hover:text-caramel';

export const GumCalculator = ({ t }: Props) => {
  const [gums, setGums] = useState(2);
  const espresso = Math.round((gums / 2) * 10) / 10;

  return (
    <section className="bg-coffee text-froth">
      <div className="container grid grid-cols-[repeat(auto-fit,minmax(min(290px,100%),1fr))] items-center gap-[clamp(28px,4vw,56px)] py-[clamp(48px,6vw,80px)]">
        <div>
          <div className="text-[11.5px] font-bold tracking-[.16em] text-caramel">{t.kicker}</div>
          <h2 className="mt-3 font-heading text-[clamp(26px,3.4vw,40px)] leading-[1.14] font-medium">{t.title}</h2>
          <p className="mt-3.5 max-w-[42ch] text-[15px] leading-[1.62] text-froth/72">{t.lead}</p>
          <div className="mt-7 flex items-center gap-3.5">
            <button onClick={() => setGums((g) => Math.max(0, g - 1))} className={stepClass}>
              −
            </button>
            <div className="min-w-[110px] text-center">
              <div className="font-heading text-[46px] leading-none">{gums}</div>
              <div className="mt-1 text-[11.5px] font-semibold tracking-[.1em] text-froth/60">{t.unit}</div>
            </div>
            <button onClick={() => setGums((g) => Math.min(MAX_GUMS, g + 1))} className={stepClass}>
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-[22px] border border-froth/14 bg-white/5 p-[clamp(24px,3vw,34px)]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13.5px] font-semibold text-froth/70">{t.caffeine}</span>
            <span className="font-heading text-[30px] text-caramel">
              {gums * CAFFEINE_PER_GUM} {t.mg}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-froth/14 pt-[18px]">
            <span className="text-[13.5px] font-semibold text-froth/70">{t.espresso}</span>
            <span className="font-heading text-[30px] text-froth">
              {espresso.toString().replace('.', ',')} {cupsWord(espresso, t.cups)}
            </span>
          </div>
          <div className="flex flex-wrap gap-[7px] border-t border-froth/14 pt-[18px]">
            {Array.from({ length: MAX_GUMS }, (_, i) => (
              <span
                key={i}
                className={`text-[19px] transition-opacity duration-200 ${i < gums / 2 ? '' : 'opacity-25 grayscale'}`}
              >
                ☕
              </span>
            ))}
          </div>
          <p className="m-0 text-[11.5px] text-froth/60">{t.note}</p>
        </div>
      </div>
    </section>
  );
};
