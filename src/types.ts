export interface Report {
  id: string;
  label: string;
  parties: [string, string][];
}

export interface Selection {
  id: string;
  reportId: string | null;
  marketSlug: string | null;
  partyId: string | null;
  visibleKinds: string[];
  color: string;
}

export interface DecoratedSelection extends Selection {
  partyIdx: number;
  partyLabel: string;
  reportLabel: string;
  marketName: string;
}

export interface PartyData {
  l: number[];
  s: number[];
  cl: number[];
  cs: number[];
  pl: number[];
  ps: number[];
}

export interface MarketData {
  meta: { code: string; name: string };
  d: number[];
  oi: number[];
  p: PartyData[];
}

export interface SeriesDef {
  id: string;
  short: string;
  label: string;
  scale: 'counts' | 'pct' | 'changes';
  lineStyle: number;
  lineWidth: number;
  markerRadius: number;
  markerVisible: boolean;
}
