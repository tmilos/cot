import { useEffect, useState } from 'react';
import type { Report, Selection } from '../types';
import { SERIES_DEFS, DEFAULT_PARTY_BY_REPORT } from '../data';
import { MarketCombobox } from './MarketCombobox';

function Chevron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Trash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <div className="field__select-wrap">{children}</div>
    </div>
  );
}

interface Props {
  selection: Selection;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (patch: Partial<Selection>) => void;
  onRemove: () => void;
  reports: Report[];
  marketsByReport: Record<string, [string, string][]>;
  ensureMarkets: (reportId: string) => void;
}

export function SelectionCard({
  selection, isActive, onActivate, onUpdate, onRemove,
  reports, marketsByReport, ensureMarkets,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const report = reports.find(r => r.id === selection.reportId);
  const markets = selection.reportId ? (marketsByReport[selection.reportId] ?? null) : null;

  useEffect(() => {
    if (selection.reportId) ensureMarkets(selection.reportId);
  }, [selection.reportId, ensureMarkets]);

  const marketName = (() => {
    if (!markets) return '…';
    const m = markets.find(x => x[0] === selection.marketSlug);
    return m ? m[1] : '—';
  })();

  const partyName = (() => {
    if (!report) return '—';
    const p = report.parties.find(x => x[0] === selection.partyId);
    return p ? p[1] : '—';
  })();

  const titleText = `${marketName} · ${partyName}`;

  function handleReport(e: React.ChangeEvent<HTMLSelectElement>) {
    const newReportId = e.target.value;
    onUpdate({ reportId: newReportId, marketSlug: null, partyId: DEFAULT_PARTY_BY_REPORT[newReportId] ?? null });
    ensureMarkets(newReportId);
  }

  return (
    <div className={'sel' + (isActive ? ' sel--active' : '') + (collapsed ? ' sel--collapsed' : '')} onClick={onActivate}>
      <div className="sel__head">
        <span className="sel__swatch" style={{ background: selection.color }} />
        <div className="sel__title" title={titleText}>{titleText}</div>
        <button
          className="sel__toggle"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          title={collapsed ? 'Expand' : 'Collapse'}
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
        >
          <Chevron />
        </button>
        <button
          className="sel__btn"
          aria-label="Remove selection"
          title="Remove selection"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <Trash />
        </button>
      </div>
      {!collapsed && <div className="sel__body" onClick={(e) => e.stopPropagation()}>
        <div className="field">
          <label className="field__label">Color</label>
          <input
            type="color"
            className="color-input"
            value={selection.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
          />
        </div>
        <Field label="Report">
          <select className="field__select" value={selection.reportId ?? ''} onChange={handleReport}>
            {reports.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Market">
          <MarketCombobox
            markets={markets}
            value={selection.marketSlug}
            onChange={(slug) => onUpdate({ marketSlug: slug })}
          />
        </Field>
        <Field label="Party">
          <select
            className="field__select"
            value={selection.partyId ?? ''}
            onChange={(e) => onUpdate({ partyId: e.target.value || null })}
            disabled={!report}
          >
            <option value="">Select a party…</option>
            {report?.parties.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </Field>
        <div className="field">
          <label className="field__label">Series</label>
          <div className="sel__chips">
            {SERIES_DEFS.map(def => {
              const on = selection.visibleKinds.includes(def.id);
              return (
                <button
                  key={def.id}
                  className={'chip chip--sm' + (on ? ' chip--on' : '')}
                  onClick={() => {
                    const kinds = on
                      ? selection.visibleKinds.filter(k => k !== def.id)
                      : [...selection.visibleKinds, def.id];
                    onUpdate({ visibleKinds: kinds });
                  }}
                  title={def.label}
                >
                  <span className="chip__dot" />
                  {def.short}
                </button>
              );
            })}
          </div>
        </div>
      </div>}
    </div>
  );
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
