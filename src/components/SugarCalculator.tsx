import { useState } from 'react';
import type { Dictionary } from '@i18n/types';

interface Props {
  t: Dictionary['calc'];
}

// 1 teaspoon ≈ 5 g; sugar is 4 kcal/g, xylitol 2.4 kcal/g.
const GRAMS_PER_SPOON = 5;
const SUGAR_KCAL = 4;
const XYLITOL_KCAL = 2.4;

export const SugarCalculator = ({ t }: Props) => {
  const [spoons, setSpoons] = useState(4);

  const grams = spoons * GRAMS_PER_SPOON;
  const sugarKcal = Math.round(grams * SUGAR_KCAL);
  const xylitolKcal = Math.round(grams * XYLITOL_KCAL);
  const savedYear = new Intl.NumberFormat('ru-RU').format((sugarKcal - xylitolKcal) * 365);

  const rows = [
    {
      name: t.sugar,
      kcal: sugarKcal,
      note: `${grams} ${t.perDay}`,
      nameClass: 'text-milk/80',
      barClass: 'bg-milk/50',
      width: 100,
    },
    {
      name: t.xylitol,
      kcal: xylitolKcal,
      note: `${grams} ${t.perDay} · ${t.sameVolume}`,
      nameClass: 'text-honey',
      barClass: 'bg-linear-90 from-honey to-[#F0C57A] transition-[width] duration-300',
      width: Math.round((xylitolKcal / sugarKcal) * 100),
    },
  ];

  return (
    <section className="bg-navy text-milk">
      <div className="container py-[clamp(52px,6.5vw,88px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-center gap-[clamp(28px,4vw,56px)]">
          <div>
            <div className="text-[11.5px] font-bold tracking-[.16em] text-honey">{t.kicker}</div>
            <h2 className="mt-3 font-heading text-[clamp(27px,3.4vw,40px)] leading-[1.14] font-medium">{t.title}</h2>
            <p className="mt-3.5 max-w-[44ch] text-[15px] leading-[1.62] text-milk/76">{t.lead}</p>
            <div className="mt-[30px]">
              <label
                htmlFor="spoons"
                className="flex items-baseline justify-between text-[13px] font-semibold text-milk/72"
              >
                <span>{t.label}</span>
                <span className="font-heading text-[24px] text-milk">{spoons}</span>
              </label>
              <input
                id="spoons"
                type="range"
                min={1}
                max={12}
                step={1}
                value={spoons}
                onChange={(e) => setSpoons(Number(e.target.value))}
                className="mt-3 h-6 w-full cursor-pointer accent-honey"
              />
              <div className="flex justify-between text-[11px] font-semibold text-milk/66">
                <span>1</span>
                <span>12</span>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-milk/16 bg-white/6 p-[clamp(22px,3vw,32px)]">
            {rows.map((row) => (
              <div key={row.name} className="mb-[22px]">
                <div className="mb-[9px] flex items-baseline justify-between">
                  <span className={`text-[13.5px] font-semibold ${row.nameClass}`}>{row.name}</span>
                  <span className="font-heading text-[22px] text-milk">
                    {row.kcal} {t.kcal}
                  </span>
                </div>
                <div className="h-[9px] overflow-hidden rounded-full bg-milk/13">
                  <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${row.width}%` }} />
                </div>
                <div className="mt-[7px] text-[11.5px] text-milk/66">{row.note}</div>
              </div>
            ))}
            <div className="mt-1 border-t border-milk/16 pt-[18px]">
              <div className="text-[12px] font-bold tracking-[.1em] text-honey">{t.savedLabel}</div>
              <div className="mt-1.5 font-heading text-[clamp(30px,4vw,42px)] leading-[1.1]">
                {savedYear} {t.kcal}
              </div>
              <div className="mt-1.5 text-[12.5px] text-milk/66">{t.savedNote}</div>
            </div>
          </div>
        </div>
        <p className="mt-[26px] max-w-[70ch] text-[11.5px] text-milk/66">{t.disclaimer}</p>
      </div>
    </section>
  );
};
