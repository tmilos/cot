import { useEffect, useRef } from 'react';
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import type { DecoratedSelection, MarketData } from '../types';
import { SERIES_DEFS, SERIES_INDEX, buildSeriesData, fmtForKind, intDateToISO } from '../data';

const DEFAULT_ZOOM_WEEKS = 16;

interface SeriesEntry {
  series: ISeriesApi<SeriesType>;
  meta: {
    selectionId: string;
    selectionIndex: number;
    color: string;
    kind: string;
    marketName: string;
    partyLabel: string;
    reportLabel: string;
  };
}

interface Props {
  selections: DecoratedSelection[];
  marketCache: Record<string, MarketData>;
}

export function CotChart({ selections, marketCache }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef(new Map<string, SeriesEntry>());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zeroSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const lastZoomKeyRef = useRef('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = createChart(host, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#475569',
        fontFamily: '"Geist", "Inter", system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      rightPriceScale: {
        visible: true,
        borderColor: '#e2e8f0',
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      leftPriceScale: {
        visible: true,
        borderColor: '#e2e8f0',
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        rightOffset: 4,
        barSpacing: 8,
        fixLeftEdge: false,
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#94a3b8', width: 1, style: 2, labelBackgroundColor: '#0f172a' },
        horzLine: { color: '#94a3b8', width: 1, style: 2, labelBackgroundColor: '#0f172a' },
      },
      localization: {
        priceFormatter: (p: number) => {
          const abs = Math.abs(p);
          if (abs >= 1e6) return (p / 1e6).toFixed(2) + 'M';
          if (abs >= 1e3) return (p / 1e3).toFixed(1) + 'k';
          return p.toFixed(0);
        },
      },
      handleScroll: true,
      handleScale: true,
      autoSize: true,
    });

    chartRef.current = chart;

    const zeroSeries = chart.addSeries(LineSeries, {
      color: '#f78b8b',
      lineWidth: 2,
      lineStyle: 4,
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      title: '',
    });
    zeroSeriesRef.current = zeroSeries;

    chart.subscribeCrosshairMove((param) => updateTooltip(param));

    return () => {
      chart.remove();
      chartRef.current = null;
      zeroSeriesRef.current = null;
      seriesMapRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const map = seriesMapRef.current;
    const wantedKeys = new Set<string>();

    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      if (!sel.reportId || !sel.marketSlug || !sel.partyId) continue;
      const cacheKey = `${sel.reportId}/${sel.marketSlug}`;
      const market = marketCache[cacheKey];
      if (!market) continue;
      if (sel.partyIdx < 0) continue;
      const color = sel.color;

      for (const kind of sel.visibleKinds) {
        const def = SERIES_INDEX[kind];
        if (!def) continue;
        const key = `${sel.id}|${kind}`;
        wantedKeys.add(key);

        const priceScaleId = def.scale === 'pct' ? 'left' : 'right';

        const data = buildSeriesData(market, sel.partyIdx, kind);
        let entry = map.get(key);
        if (!entry) {
          const series = chart.addSeries(LineSeries, {
            color,
            lineWidth: def.lineWidth as 1 | 2 | 3 | 4,
            lineStyle: def.lineStyle as 0 | 1 | 2 | 3 | 4,
            priceScaleId,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: def.markerVisible,
            crosshairMarkerRadius: def.markerRadius,
            crosshairMarkerBorderColor: '#ffffff',
            crosshairMarkerBackgroundColor: color,
            title: '',
          });
          entry = { series, meta: { selectionId: sel.id, selectionIndex: i, color, kind, marketName: sel.marketName, partyLabel: sel.partyLabel, reportLabel: sel.reportLabel } };
          map.set(key, entry);
        } else {
          entry.series.applyOptions({
            color,
            lineWidth: def.lineWidth as 1 | 2 | 3 | 4,
            lineStyle: def.lineStyle as 0 | 1 | 2 | 3 | 4,
            crosshairMarkerVisible: def.markerVisible,
            crosshairMarkerRadius: def.markerRadius,
            crosshairMarkerBackgroundColor: color,
          });
          entry.meta = { selectionId: sel.id, selectionIndex: i, color, kind, marketName: sel.marketName, partyLabel: sel.partyLabel, reportLabel: sel.reportLabel };
        }
        entry.series.setData(data);
      }
    }

    for (const [k, entry] of [...map.entries()]) {
      if (!wantedKeys.has(k)) {
        try { chart.removeSeries(entry.series); } catch { /* ignore */ }
        map.delete(k);
      }
    }

    if (zeroSeriesRef.current) {
      const allDates = new Set<string>();
      for (const sel of selections) {
        if (!sel.reportId || !sel.marketSlug) continue;
        const m = marketCache[`${sel.reportId}/${sel.marketSlug}`];
        if (m?.d) {
          for (const d of m.d) allDates.add(intDateToISO(d));
        }
      }
      const zeroData = [...allDates].sort().map(time => ({ time, value: 0 }));
      if (zeroData.length > 0) {
        zeroSeriesRef.current.setData(zeroData as { time: string; value: number }[]);
      }
    }

    // Default zoom: last N weeks
    const sigParts = selections
      .filter(s => s.reportId && s.marketSlug && s.partyId)
      .map(s => `${s.id}:${s.reportId}/${s.marketSlug}/${s.partyId}`);
    const sig = sigParts.join(',');
    if (sig && sig !== lastZoomKeyRef.current && map.size > 0) {
      lastZoomKeyRef.current = sig;
      let maxLen = 0;
      for (const sel of selections) {
        const ck = `${sel.reportId}/${sel.marketSlug}`;
        const m = marketCache[ck];
        if (m && m.d && m.d.length > maxLen) maxLen = m.d.length;
      }
      if (maxLen > 0) {
        const from = Math.max(0, maxLen - DEFAULT_ZOOM_WEEKS);
        const to = maxLen + 2;
        try { chart.timeScale().setVisibleLogicalRange({ from, to }); } catch { /* ignore */ }
      }
    }
  }, [selections, marketCache]);

  function updateTooltip(param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) {
    const tt = tooltipRef.current;
    const host = hostRef.current;
    if (!tt || !host) return;

    if (!param?.time || !param.point ||
        param.point.x < 0 || param.point.y < 0 ||
        param.point.x > host.clientWidth || param.point.y > host.clientHeight) {
      tt.classList.remove('tt--visible');
      return;
    }

    const map = seriesMapRef.current;
    const groups = new Map<string, { selectionIndex: number; color: string; marketName: string; partyLabel: string; reportLabel: string; rows: { kind: string; value: number }[] }>();

    for (const [, entry] of map.entries()) {
      const value = param.seriesData.get(entry.series) as { value?: number } | undefined;
      if (value?.value == null) continue;
      const m = entry.meta;
      if (!groups.has(m.selectionId)) {
        groups.set(m.selectionId, { selectionIndex: m.selectionIndex, color: m.color, marketName: m.marketName, partyLabel: m.partyLabel, reportLabel: m.reportLabel, rows: [] });
      }
      groups.get(m.selectionId)!.rows.push({ kind: m.kind, value: value.value });
    }

    if (groups.size === 0) {
      tt.classList.remove('tt--visible');
      return;
    }

    const sortedGroups = [...groups.values()].sort((a, b) => a.selectionIndex - b.selectionIndex);

    const time = param.time as string | { year: number; month: number; day: number };
    let dateLabel = String(time);
    if (typeof time === 'object' && time.year != null) {
      dateLabel = `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
    }

    let html = `<div class="tt__date">${dateLabel}</div>`;
    for (const g of sortedGroups) {
      html += `<div class="tt__group">`;
      html += `<div class="tt__group-head">`;
      html += `<span class="tt__group-swatch" style="background:${g.color}"></span>`;
      html += `<span class="tt__group-title" title="${g.marketName}">${g.marketName}</span>`;
      html += `</div>`;
      html += `<div class="tt__row" style="padding-left:14px;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">${g.partyLabel}</div>`;
      g.rows.sort((a, b) => {
        const ai = SERIES_DEFS.findIndex(s => s.id === a.kind);
        const bi = SERIES_DEFS.findIndex(s => s.id === b.kind);
        return ai - bi;
      });
      for (const row of g.rows) {
        const def = SERIES_INDEX[row.kind];
        html += `<div class="tt__row"><span class="tt__row-name">${def?.label ?? row.kind}</span><span class="tt__row-val">${fmtForKind(row.kind, row.value)}</span></div>`;
      }
      html += `</div>`;
    }

    tt.innerHTML = html;
    tt.classList.add('tt--visible');

    const w = tt.offsetWidth;
    const h = tt.offsetHeight;
    const px = param.point.x;
    const py = param.point.y;
    const margin = 16;
    let left = px + margin;
    if (left + w > host.clientWidth - 8) left = px - w - margin;
    if (left < 8) left = 8;
    let top = py + margin;
    if (top + h > host.clientHeight - 8) top = py - h - margin;
    if (top < 8) top = 8;
    tt.style.left = left + 'px';
    tt.style.top = top + 'px';
  }

  return (
    <div className="chart-host">
      <div id="chart" ref={hostRef} />
      <div className="tt" ref={tooltipRef} />
    </div>
  );
}
