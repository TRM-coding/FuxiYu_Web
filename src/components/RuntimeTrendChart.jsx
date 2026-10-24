import { parseServerTime } from '../utils/detailFormat';
import React from 'react';

const AXIS_LEFT = 42;
const AXIS_RIGHT = 14;
const AXIS_TOP = 30;
const AXIS_BOTTOM = 42;

const clampPercent = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
};

// 走共用的 parseServerTime：后端发的是**不带时区后缀的 UTC**，裸用 new Date 会
// 按本地时间解析，等于把 UTC 的数值原样画出来（差 8 小时）。
const formatTickTime = value => {
  const date = parseServerTime(value);
  if (!date) return '';
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const buildSmoothPath = coords => {
  if (!coords.length) return '';
  if (coords.length === 1) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  return coords.reduce((path, point, idx) => {
    if (idx === 0) return `M${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    const prev = coords[idx - 1];
    const next = coords[idx + 1] || point;
    const beforePrev = coords[idx - 2] || prev;
    const cp1x = prev.x + (point.x - beforePrev.x) / 6;
    const cp1y = prev.y + (point.y - beforePrev.y) / 6;
    const cp2x = point.x - (next.x - prev.x) / 6;
    const cp2y = point.y - (next.y - prev.y) / 6;
    return `${path} C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }, '');
};

const renderEmptyChart = (emptyText, ariaLabel) => {
  const w = 720;
  const h = 190;
  const plotH = h - AXIS_TOP - AXIS_BOTTOM;
  const yFor = value => AXIS_TOP + (100 - value) / 100 * plotH;
  const axisTicks = [100, 75, 50, 25, 0];
  return (
    <svg className="detail-chart detail-chart-empty" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel}>
      {axisTicks.map(tick => (
        <g key={`empty-y-${tick}`}>
          <path d={`M${AXIS_LEFT} ${yFor(tick).toFixed(1)} H${w - AXIS_RIGHT}`} stroke="#e4edf7" strokeWidth="1" />
          <text x="30" y={yFor(tick) + 4} fill="#74859a" fontSize="11" textAnchor="end">{tick}%</text>
        </g>
      ))}
      <path d={`M${AXIS_LEFT} ${AXIS_TOP} V${h - AXIS_BOTTOM} H${w - AXIS_RIGHT}`} stroke="#cfdbea" strokeWidth="1" fill="none" />
      <text x={w / 2} y={h / 2 + 4} fill="#7b8da3" fontSize="13" textAnchor="middle">{emptyText}</text>
    </svg>
  );
};

const RuntimeTrendChart = ({ history, series, emptyText, ariaLabel }) => {
  const points = history || [];
  const visibleSeries = (series || []).filter(item => points.some(point => Number.isFinite(Number(item.value(point)))));
  if (points.length < 1 || visibleSeries.length === 0) {
    return renderEmptyChart(emptyText, ariaLabel);
  }

  const w = 720;
  const h = 190;
  const plotW = w - AXIS_LEFT - AXIS_RIGHT;
  const plotH = h - AXIS_TOP - AXIS_BOTTOM;
  const xFor = idx => AXIS_LEFT + (points.length === 1 ? 0 : (idx / (points.length - 1)) * plotW);
  const yFor = value => AXIS_TOP + (100 - value) / 100 * plotH;
  const axisTicks = [100, 75, 50, 25, 0];
  const xTickIndexes = Array.from(new Set([
    0,
    Math.floor((points.length - 1) / 2),
    points.length - 1,
  ])).filter(idx => idx >= 0 && idx < points.length);
  const coordsFor = item => points
    .map((point, idx) => {
      const raw = clampPercent(item.value(point));
      if (raw === null) return null;
      const x = xFor(idx);
      const y = yFor(raw);
      return { x, y, raw, point, idx };
    })
    .filter(Boolean);
  const pathFor = item => buildSmoothPath(coordsFor(item));
  const areaFor = item => {
    const coords = coordsFor(item);
    if (coords.length < 2) return '';
    const baseline = h - AXIS_BOTTOM;
    const line = buildSmoothPath(coords);
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${line} L${last.x.toFixed(1)},${baseline.toFixed(1)} L${first.x.toFixed(1)},${baseline.toFixed(1)} Z`;
  };

  return (
    <svg className="detail-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel}>
      {axisTicks.map(tick => (
        <g key={`y-${tick}`}>
          <path d={`M${AXIS_LEFT} ${yFor(tick).toFixed(1)} H${w - AXIS_RIGHT}`} stroke="#e4edf7" strokeWidth="1" />
          <text x="30" y={yFor(tick) + 4} fill="#74859a" fontSize="11" textAnchor="end">{tick}%</text>
        </g>
      ))}
      <path d={`M${AXIS_LEFT} ${AXIS_TOP} V${h - AXIS_BOTTOM} H${w - AXIS_RIGHT}`} stroke="#cfdbea" strokeWidth="1" fill="none" />
      {visibleSeries.map(item => item.fill ? (
        <path key={`${item.key}-area`} d={areaFor(item)} fill={item.fill} stroke="none" />
      ) : null)}
      {visibleSeries.map(item => (
        <path key={item.key} d={pathFor(item)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {visibleSeries.map(item => coordsFor(item).map(({ point, idx, raw, x, y }) => {
        const time = formatTickTime(point.collectedAt || point.t);
        return (
          <circle key={`${item.key}-${idx}`} cx={x} cy={y} r="3.2" fill="#fff" stroke={item.color} strokeWidth="2">
            <title>{`${item.label}: ${raw.toFixed(raw % 1 === 0 ? 0 : 1)}%${time ? ` · ${time}` : ''}`}</title>
          </circle>
        );
      }))}
      {xTickIndexes.map(idx => (
        <text
          key={`x-${idx}`}
          x={xFor(idx)}
          y={h - 12}
          fill="#74859a"
          fontSize="11"
          textAnchor="end"
          transform={`rotate(-28 ${xFor(idx).toFixed(1)} ${h - 12})`}
        >
          {formatTickTime(points[idx]?.collectedAt || points[idx]?.t)}
        </text>
      ))}
      {visibleSeries.map((item, idx) => (
        <g key={`${item.key}-legend`} transform={`translate(${AXIS_LEFT + idx * 82}, 18)`}>
          <circle cx="0" cy="-4" r="4" fill={item.color} />
          <text x="9" y="0" fill="#334860" fontSize="12">{item.label}</text>
        </g>
      ))}
    </svg>
  );
};

export default RuntimeTrendChart;
