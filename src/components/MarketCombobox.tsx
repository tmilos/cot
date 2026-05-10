import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  markets: [string, string][] | null;
  value: string | null;
  onChange: (slug: string | null) => void;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
}

export function MarketCombobox({ markets, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const label = (() => {
    if (!markets) return 'Loading markets…';
    if (!value) return 'Select a market…';
    const m = markets.find(([slug]) => slug === value);
    return m ? m[1] : 'Select a market…';
  })();

  const filtered = markets
    ? markets.filter(([, name]) => name.toLowerCase().includes(query.toLowerCase()))
    : [];

  function openDropdown() {
    if (!markets) return;
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function select(slug: string) {
    onChange(slug || null);
    close();
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 2, left: r.left, width: r.width });
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) close();
    }
    if (open) document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  return (
    <div className="market-combo">
      <div className="market-combo__trigger-wrap">
        <button
          ref={triggerRef}
          type="button"
          className="market-combo__trigger"
          disabled={!markets}
          onClick={openDropdown}
        >
          {label}
        </button>
      </div>
      {open && pos && (
        <div
          ref={dropdownRef}
          className="market-combo__dropdown"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
        >
          <input
            ref={searchRef}
            className="market-combo__search"
            type="text"
            placeholder="Search markets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
          />
          <ul className="market-combo__list">
            {filtered.length > 0
              ? filtered.map(([slug, name]) => (
                  <li
                    key={slug}
                    className={'market-combo__option' + (slug === value ? ' market-combo__option--selected' : '')}
                    onMouseDown={() => select(slug)}
                  >
                    {name}
                  </li>
                ))
              : <li className="market-combo__empty">No markets match</li>
            }
          </ul>
        </div>
      )}
    </div>
  );
}
