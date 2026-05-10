import type { MarketData, SeriesDef } from './types';

export const SELECTION_COLORS = [
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#e11d48',
  '#0891b2',
  '#65a30d',
  '#c026d3',
];

// LineStyle: 0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed, 4=SparseDotted
export const SERIES_DEFS: SeriesDef[] = [
  { id: 'l',   short: 'Long',    label: 'Long positions',     scale: 'counts',  lineStyle: 0, lineWidth: 1.5, markerRadius: 5, markerVisible: true },
  { id: 's',   short: 'Short',   label: 'Short positions',    scale: 'counts',  lineStyle: 0, lineWidth: 1.5, markerRadius: 5, markerVisible: true },
  { id: 'net', short: 'Net',     label: 'Net (long − short)', scale: 'counts',  lineStyle: 0, lineWidth: 2.5, markerRadius: 5, markerVisible: true },
  { id: 'cl',  short: 'Δ Long',  label: 'Change in long',     scale: 'changes', lineStyle: 1, lineWidth: 1.5, markerRadius: 3, markerVisible: true },
  { id: 'cs',  short: 'Δ Short', label: 'Change in short',    scale: 'changes', lineStyle: 1, lineWidth: 1.5, markerRadius: 3, markerVisible: true },
  { id: 'pl',  short: '% Long',  label: '% long of OI',       scale: 'pct',     lineStyle: 2, lineWidth: 1.5, markerRadius: 0, markerVisible: false },
  { id: 'ps',  short: '% Short', label: '% short of OI',      scale: 'pct',     lineStyle: 2, lineWidth: 1.5, markerRadius: 0, markerVisible: false },
];

export const DEFAULT_PARTY_BY_REPORT: Record<string, string> = {
  tff:    'lev_money',
  disagg: 'm_money',
};

export const SERIES_INDEX: Record<string, SeriesDef> = Object.fromEntries(
  SERIES_DEFS.map(s => [s.id, s])
);

export function intDateToISO(d: number): string {
  const s = String(d);
  return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
}

export function buildSeriesData(
  market: MarketData,
  partyIdx: number,
  kind: string
): { time: string; value: number }[] {
  const party = market.p[partyIdx];
  if (!party) return [];
  const out: { time: string; value: number }[] = new Array(market.d.length);
  for (let t = 0; t < market.d.length; t++) {
    let v: number;
    if (kind === 'net') {
      v = party.l[t] - party.s[t];
    } else {
      const raw = (party as unknown as Record<string, number[]>)[kind]?.[t] ?? 0;
      v = (kind === 's' || kind === 'cs') ? -raw : raw;
    }
    out[t] = { time: intDateToISO(market.d[t]), value: v };
  }
  return out;
}

function fmtInt(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n < 0 ? '−' : '';
  return sign + Math.abs(Math.round(n)).toLocaleString('en-US');
}

function fmtSignedInt(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (n === 0) return '0';
  const sign = n > 0 ? '+' : '−';
  return sign + Math.abs(Math.round(n)).toLocaleString('en-US');
}

function fmtPct(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toFixed(1) + '%';
}

export function fmtForKind(kind: string, v: number): string {
  if (kind === 'pl' || kind === 'ps') return fmtPct(v);
  if (kind === 'cl' || kind === 'cs') return fmtSignedInt(v);
  return fmtInt(v);
}
