import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Report, Selection, DecoratedSelection, MarketData } from './types';
import { SELECTION_COLORS, DEFAULT_PARTY_BY_REPORT } from './data';
import { SelectionCard, PlusIcon } from './components/SelectionCard';
import { CotChart } from './components/Chart';

function uid(): string {
  return 's' + Math.random().toString(36).slice(2, 9);
}

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [marketsByReport, setMarketsByReport] = useState<Record<string, [string, string][]>>({});
  const [marketCache, setMarketCache] = useState<Record<string, MarketData>>({});
  const [bootError, setBootError] = useState<string | null>(null);

  const [selections, setSelections] = useState<Selection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const inflightMarkets = useRef(new Set<string>());
  const inflightMarket = useRef(new Set<string>());

  useEffect(() => {
    fetch('cot/index.json')
      .then(r => { if (!r.ok) throw new Error('index.json not found'); return r.json(); })
      .then((idx: Report[]) => {
        setReports(idx);
        const first = idx[0];
        if (first) {
          const newSel: Selection = { id: uid(), reportId: first.id, marketSlug: null, partyId: null, visibleKinds: ['net'], color: SELECTION_COLORS[0] };
          setSelections([newSel]);
          setActiveId(newSel.id);
        }
      })
      .catch(err => setBootError((err as Error).message));
  }, []);

  const ensureMarkets = useCallback((reportId: string) => {
    if (!reportId) return;
    if (marketsByReport[reportId]) return;
    if (inflightMarkets.current.has(reportId)) return;
    inflightMarkets.current.add(reportId);
    fetch(`cot/${reportId}/markets.json`)
      .then(r => { if (!r.ok) throw new Error('markets not found'); return r.json(); })
      .then((list: [string, string][]) => {
        setMarketsByReport(prev => ({ ...prev, [reportId]: list }));
      })
      .catch(err => console.warn('markets load failed', reportId, err))
      .finally(() => inflightMarkets.current.delete(reportId));
  }, [marketsByReport]);

  useEffect(() => {
    for (const sel of selections) {
      if (!sel.reportId || !sel.marketSlug) continue;
      const key = `${sel.reportId}/${sel.marketSlug}`;
      if (marketCache[key]) continue;
      if (inflightMarket.current.has(key)) continue;
      inflightMarket.current.add(key);
      fetch(`cot/${sel.reportId}/${sel.marketSlug}.json`)
        .then(r => { if (!r.ok) throw new Error('market not found'); return r.json(); })
        .then((data: MarketData) => {
          setMarketCache(prev => ({ ...prev, [key]: data }));
        })
        .catch(err => console.warn('market load failed', key, err))
        .finally(() => inflightMarket.current.delete(key));
    }
  }, [selections, marketCache]);

  useEffect(() => {
    if (!reports.length) return;
    const firstReport = reports[0];
    const firstMarkets = marketsByReport[firstReport.id];
    if (!firstMarkets?.length) return;
    setSelections(prev => prev.map((s, i) => {
      if (i === 0 && !s.marketSlug && !s.partyId) {
        return { ...s, marketSlug: firstMarkets[0][0], partyId: DEFAULT_PARTY_BY_REPORT[firstReport.id] ?? firstReport.parties[0][0] };
      }
      return s;
    }));
  }, [reports, marketsByReport]);

  const decoratedSelections: DecoratedSelection[] = useMemo(() => {
    return selections.map(sel => {
      const report = reports.find(r => r.id === sel.reportId);
      const partyIdx = report ? report.parties.findIndex(p => p[0] === sel.partyId) : -1;
      const partyLabel = report && partyIdx >= 0 ? report.parties[partyIdx][1] : '';
      const reportLabel = report ? report.label : '';
      const markets = sel.reportId ? marketsByReport[sel.reportId] : undefined;
      let marketName = '';
      if (markets && sel.marketSlug) {
        const m = markets.find(x => x[0] === sel.marketSlug);
        if (m) marketName = m[1];
      }
      return { ...sel, partyIdx, partyLabel, reportLabel, marketName };
    });
  }, [selections, reports, marketsByReport]);

  const handleAdd = useCallback(() => {
    if (selections.length >= SELECTION_COLORS.length) return;
    const base = selections.find(s => s.id === activeId) ?? selections[selections.length - 1];
    const color = SELECTION_COLORS[selections.length % SELECTION_COLORS.length];
    let next: Selection;
    if (base?.reportId) {
      next = { id: uid(), reportId: base.reportId, marketSlug: base.marketSlug, partyId: DEFAULT_PARTY_BY_REPORT[base.reportId] ?? base.partyId, visibleKinds: ['net'], color };
    } else {
      const r0 = reports[0];
      next = { id: uid(), reportId: r0?.id ?? null, marketSlug: null, partyId: null, visibleKinds: ['net'], color };
    }
    setSelections(prev => [...prev, next]);
    setActiveId(next.id);
  }, [selections, activeId, reports]);

  const handleRemove = useCallback((id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
    setActiveId(prev => (prev === id ? null : prev));
  }, []);

  const handleUpdate = useCallback((id: string, patch: Partial<Selection>) => {
    setSelections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const validSelections = decoratedSelections.filter(
    s => s.reportId && s.marketSlug && s.partyId && s.partyIdx >= 0
  );
  const selectionsWithKinds = validSelections.filter(s => s.visibleKinds.length > 0);
  const hasAnyData = selectionsWithKinds.some(s => marketCache[`${s.reportId}/${s.marketSlug}`]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__mark">L</span>
        <span className="topbar__title">Lumen</span>
        <span className="topbar__sep" />
        <span className="topbar__sub">COT Dashboard</span>
        <span className="topbar__spacer" />
        <span className="topbar__meta">
          {validSelections.length} active series {validSelections.length === 1 ? 'group' : 'groups'}
        </span>
      </header>

      <aside className="sidebar">
        <div className="sidebar__head">
          <h2>Selections</h2>
          <span className="sidebar__count">{selections.length}</span>
        </div>
        <div className="sidebar__list">
          {selections.length === 0 && (
            <div style={{ color: 'var(--slate-500)', fontSize: 12, padding: 8, textAlign: 'center' }}>
              No selections. Add one to start.
            </div>
          )}
          {selections.map((sel) => (
            <SelectionCard
              key={sel.id}
              selection={sel}
              isActive={activeId === sel.id}
              onActivate={() => setActiveId(sel.id)}
              onUpdate={(patch) => handleUpdate(sel.id, patch)}
              onRemove={() => handleRemove(sel.id)}
              reports={reports}
              marketsByReport={marketsByReport}
              ensureMarkets={ensureMarkets}
            />
          ))}
        </div>
        <div className="sidebar__foot">
          <button
            className="btn btn--primary btn--block"
            onClick={handleAdd}
            disabled={selections.length >= SELECTION_COLORS.length}
          >
            <PlusIcon />
            Add selection
          </button>
        </div>
      </aside>

      <main className="main">
        {bootError && (
          <div className="chart-head">
            <span style={{ color: 'var(--red-600)', fontSize: 12 }}>
              Couldn't load data: {bootError}
            </span>
          </div>
        )}

        <CotChart
          selections={validSelections}
          marketCache={marketCache}
        />

        {(!hasAnyData || selectionsWithKinds.length === 0 || validSelections.length === 0) && (
          <div className="empty" style={{ pointerEvents: 'none' }}>
            <div className="empty__inner">
              <svg className="empty__icon" viewBox="0 0 48 48" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 38h36" />
                <path d="M6 6v32" />
                <path d="M12 30l8-10 6 6 12-14" />
                <circle cx="12" cy="30" r="1.5" fill="currentColor" />
                <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                <circle cx="26" cy="26" r="1.5" fill="currentColor" />
                <circle cx="38" cy="12" r="1.5" fill="currentColor" />
              </svg>
              {validSelections.length === 0 && (
                <>
                  <div className="empty__title">No complete selection</div>
                  <div className="empty__sub">Pick a report, market, and party to plot data.</div>
                </>
              )}
              {validSelections.length > 0 && selectionsWithKinds.length === 0 && (
                <>
                  <div className="empty__title">No series visible</div>
                  <div className="empty__sub">Toggle series chips in a selection card to start charting.</div>
                </>
              )}
              {selectionsWithKinds.length > 0 && !hasAnyData && (
                <>
                  <div className="empty__title">Loading data…</div>
                  <div className="empty__sub">Fetching weekly observations for the current selection.</div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
