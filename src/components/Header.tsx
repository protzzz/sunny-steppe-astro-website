import { useEffect, useRef, useState } from 'react';
import { contacts } from '@data/contacts';
import { isActive, type NavItem } from '@data/navigation';
import { langNames, langs, localePath, type Lang } from '@i18n/index';

interface Props {
  /** Logo URL, resized by the layout. */
  logo: string;
  lang: Lang;
  /** Route without the language prefix, e.g. "/catalog". */
  route: string;
  items: NavItem[];
  /** Extra links for the burger menu only. */
  menuExtraItems?: NavItem[];
  writeLabel: string;
  menuLabel: string;
}

const MENU_ID = 'mobile-menu';

/** RU/KZ switch: the whole pill links to the other language; the thumb slides on click. */
const LangSwitch = ({ lang, route }: { lang: Lang; route: string }) => {
  const target: Lang = lang === 'ru' ? 'kz' : 'ru';
  const [switching, setSwitching] = useState(false);
  // Reset the thumb when the page is restored by Back (bfcache).
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setSwitching(false);
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);
  const shown = switching ? target : lang;

  return (
    <a
      href={localePath(target, route)}
      hrefLang={target === 'kz' ? 'kk' : 'ru'}
      aria-label={`${langNames[target]} — ${target.toUpperCase()}`}
      onClick={() => setSwitching(true)}
      className="group relative grid cursor-pointer grid-cols-2 items-center rounded-full bg-navy/6 p-[3px]"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-paper shadow-[0_1px_3px_rgba(20,54,94,.14)] transition-transform duration-200 ease-out ${
          shown === 'kz' ? 'translate-x-full' : ''
        }`}
      />
      {langs.map((code) => (
        <span
          key={code}
          aria-hidden="true"
          className={`relative px-[11px] py-1.5 text-center text-[12px] font-bold tracking-[.06em] transition-colors duration-200 sm:px-[13px] ${
            code === shown ? 'text-navy' : 'text-mist group-hover:text-navy'
          }`}
        >
          {code.toUpperCase()}
        </span>
      ))}
    </a>
  );
};

export const Header = ({ logo, lang, route, items, menuExtraItems = [], writeLabel, menuLabel }: Props) => {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to the burger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      burger.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-navy/9 bg-cream/88 backdrop-blur-[14px]">
      {/* Fits 320px: below 360px only the logo mark is shown. */}
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-5 py-3.5 sm:gap-[18px]">
        <a
          href={localePath(lang)}
          aria-label="Sunny Steppe"
          className="flex flex-none items-center gap-2.5 sm:gap-[11px]"
        >
          <img src={logo} alt="" width={34} height={34} className="block size-[34px] object-contain" />
          <span className="font-heading text-[15px] leading-none font-medium tracking-[.08em] text-navy max-[359px]:sr-only sm:text-[17px] sm:tracking-[.10em]">
            SUNNY STEPPE
          </span>
        </a>

        <nav className="hidden min-w-0 flex-auto justify-center gap-0.5 overflow-hidden nav:flex">
          {items.map((item) => {
            const active = isActive(item.route, route);
            return (
              <a
                key={item.route}
                href={localePath(lang, item.route)}
                className={`inline-flex items-center rounded-full px-[11px] py-2 text-[14px] whitespace-nowrap ${
                  active ? 'bg-navy/7 font-bold text-navy' : 'font-medium text-muted'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-none items-center gap-2 nav:ml-0 sm:gap-2.5">
          <LangSwitch lang={lang} route={route} />
          <a
            href={contacts.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center rounded-full bg-navy px-[18px] py-2.5 text-[13.5px] font-semibold whitespace-nowrap text-cream wide:inline-flex"
          >
            {writeLabel}
          </a>
          <button
            ref={burger}
            onClick={() => setOpen((v) => !v)}
            aria-label={menuLabel}
            aria-expanded={open}
            aria-controls={MENU_ID}
            className="flex size-[38px] cursor-pointer flex-col items-center justify-center rounded-[11px] border border-navy/14 bg-transparent nav:hidden"
          >
            <span className="block h-[1.6px] w-[17px] rounded-xs bg-navy" />
            <span className="mt-1 block h-[1.6px] w-[17px] rounded-xs bg-navy" />
            <span className="mt-1 block h-[1.6px] w-[17px] rounded-xs bg-navy" />
          </button>
        </div>
      </div>

      {open && (
        <div
          id={MENU_ID}
          data-testid="mobile-menu"
          className="flex flex-col gap-0.5 border-t border-navy/9 bg-cream px-5 pt-2.5 pb-[18px] nav:hidden"
        >
          {[...items, ...menuExtraItems].map((item) => {
            const active = isActive(item.route, route);
            return (
              <a
                key={item.route}
                href={localePath(lang, item.route)}
                aria-current={active ? 'page' : undefined}
                className={`border-b border-navy/7 px-1.5 py-3 text-[15.5px] ${
                  active ? 'font-bold text-navy' : 'font-medium text-muted'
                }`}
              >
                {item.label}
              </a>
            );
          })}
          {/* WhatsApp in the menu: the header has no room for it on phones. */}
          <a
            href={contacts.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-[9px] rounded-full bg-navy px-6 py-3.5 text-[15px] font-semibold text-cream hover:text-cream"
          >
            {writeLabel}
            <span>→</span>
          </a>
        </div>
      )}
    </header>
  );
};
