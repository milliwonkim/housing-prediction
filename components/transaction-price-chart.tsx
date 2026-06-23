"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { SaleTransactionRecord } from "@/lib/area-type";
import { formatAmountManwon } from "@/lib/format-amount";

const VIEW_WIDTH = 680;
const BASE_Y = 190;
const PLOT_TOP = 35;
const PLOT_HEIGHT = 155;

type TransactionPriceChartProps = {
  transactions: SaleTransactionRecord[];
  gradientId: string;
};

type ChartPoint = {
  id: string;
  x: number;
  y: number;
  transaction: SaleTransactionRecord;
  isRecord: boolean;
};

type MonthBucket = {
  key: string;
  label: string;
  x: number;
  hitLeft: number;
  hitRight: number;
  points: ChartPoint[];
};

function buildBuckets(points: ChartPoint[]): MonthBucket[] {
  const bucketMap = new Map<string, ChartPoint[]>();
  for (const point of points) {
    const date = new Date(point.transaction.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const group = bucketMap.get(key) ?? [];
    group.push(point);
    bucketMap.set(key, group);
  }

  const buckets = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucketPoints]) => {
      const xs = bucketPoints.map((point) => point.x);
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const [year, month] = key.split("-");
      return {
        key,
        label: `${year}. ${month}`,
        x: centerX,
        hitLeft: 0,
        hitRight: 0,
        points: bucketPoints.sort((a, b) => b.transaction.amount - a.transaction.amount),
      };
    });

  for (let index = 0; index < buckets.length; index += 1) {
    const prev = buckets[index - 1];
    const next = buckets[index + 1];
    buckets[index].hitLeft = prev ? (prev.x + buckets[index].x) / 2 : 0;
    buckets[index].hitRight = next ? (buckets[index].x + next.x) / 2 : VIEW_WIDTH;
  }

  return buckets;
}

function pickBucket(x: number, buckets: MonthBucket[]): MonthBucket {
  for (const bucket of buckets) {
    if (x >= bucket.hitLeft && x < bucket.hitRight) return bucket;
  }
  return buckets.reduce((best, bucket) =>
    Math.abs(bucket.x - x) < Math.abs(best.x - x) ? bucket : best,
  );
}

export function TransactionPriceChart({ transactions, gradientId }: TransactionPriceChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [activeBucketKey, setActiveBucketKey] = useState<string | null>(null);
  const [tooltipPinned, setTooltipPinned] = useState(false);

  const geometry = useMemo(() => {
    if (!transactions.length) return null;

    const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    const recordAmount = Math.max(...sorted.map((item) => item.amount));
    const valuesEok = sorted.map((item) => item.amount / 10000);
    const minTs = sorted[0].timestamp;
    const maxTs = sorted.at(-1)!.timestamp;
    const tsRange = maxTs - minTs || 1;
    const minVal = Math.min(...valuesEok) - 0.4;
    const maxVal = Math.max(...valuesEok) + 0.4;
    const valRange = maxVal - minVal || 1;

    const points: ChartPoint[] = sorted.map((transaction) => ({
      id: transaction.id,
      x: tsRange === 0 ? VIEW_WIDTH / 2 : ((transaction.timestamp - minTs) / tsRange) * VIEW_WIDTH,
      y: BASE_Y - ((transaction.amount / 10000 - minVal) / valRange) * PLOT_HEIGHT,
      transaction,
      isRecord: transaction.amount === recordAmount,
    }));

    const buckets = buildBuckets(points);
    const recordY = BASE_Y - ((recordAmount / 10000 - minVal) / valRange) * PLOT_HEIGHT;

    return {
      points,
      buckets,
      recordAmount,
      recordY,
      startLabel: sorted[0].date.slice(0, 8),
      endLabel: sorted.at(-1)!.date.slice(0, 8),
      count: sorted.length,
    };
  }, [transactions]);

  const resolveX = useCallback((clientX: number) => {
    const plot = plotRef.current;
    if (!plot) return 0;
    const rect = plot.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * VIEW_WIDTH;
  }, []);

  const updateHover = useCallback((clientX: number) => {
    if (!geometry) return;
    const bucket = pickBucket(resolveX(clientX), geometry.buckets);
    setActiveBucketKey(bucket.key);
  }, [geometry, resolveX]);

  const handlePlotMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (tooltipPinned) return;
    updateHover(event.clientX);
  }, [tooltipPinned, updateHover]);

  const handlePlotLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Element && next.closest(".transaction-chart-tooltip")) return;
    if (tooltipPinned) return;
    setActiveBucketKey(null);
  }, [tooltipPinned]);

  const handleWrapLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setTooltipPinned(false);
    setActiveBucketKey(null);
  }, []);

  if (!geometry) {
    return (
      <div className="chart-empty chart-empty--compact">
        <b>표시할 거래가 없어요</b>
      </div>
    );
  }

  const activeBucket = geometry.buckets.find((bucket) => bucket.key === activeBucketKey) ?? null;
  const activePointIds = new Set(activeBucket?.points.map((point) => point.id) ?? []);
  const tooltipLeft = activeBucket
    ? Math.min(92, Math.max(8, (activeBucket.x / VIEW_WIDTH) * 100))
    : 50;

  return (
    <div
      className="chart-wrap transaction-chart-wrap"
      onMouseLeave={handleWrapLeave}
    >
      {activeBucket ? (
        <div
          className="transaction-chart-tooltip transaction-chart-tooltip--active"
          style={{ left: `${tooltipLeft}%` }}
          onMouseEnter={() => setTooltipPinned(true)}
          onMouseLeave={() => setTooltipPinned(false)}
        >
          <div className="transaction-chart-tooltip__head">
            <span>{activeBucket.label}</span>
            <em>{activeBucket.points.length}건</em>
          </div>
          <ul className="transaction-chart-tooltip__list">
            {activeBucket.points.map((point) => (
              <li key={point.id} className={point.isRecord ? "is-record" : undefined}>
                <div>
                  <strong>{point.transaction.priceLabel}</strong>
                  <small>{point.transaction.area.toFixed(1)}㎡ · {point.transaction.floor}층</small>
                </div>
                <span>{point.transaction.date}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="transaction-chart-tooltip transaction-chart-tooltip--hint">
          그래프 위를 가로로 이동해 보세요
        </div>
      )}

      <div className="transaction-chart-plot" ref={plotRef}>
        <svg
          className="chart transaction-chart"
          viewBox="0 0 680 220"
          role="img"
          aria-label="건별 실거래가 추이"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3167ed" stopOpacity=".12" />
              <stop offset="1" stopColor="#3167ed" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[40, 90, 140, 190].map((y) => (
            <line key={y} x1="0" x2={VIEW_WIDTH} y1={y} y2={y} className="grid-line" />
          ))}

          <line
            x1="0"
            x2={VIEW_WIDTH}
            y1={geometry.recordY}
            y2={geometry.recordY}
            className="record-line"
          />
          <text x="8" y={geometry.recordY - 6} className="record-line-label">
            신고가 {formatAmountManwon(geometry.recordAmount)}
          </text>

          {activeBucket ? (
            <>
              <rect
                x={activeBucket.hitLeft}
                y={PLOT_TOP}
                width={activeBucket.hitRight - activeBucket.hitLeft}
                height={BASE_Y + 20 - PLOT_TOP}
                className="transaction-chart-band"
              />
              <line
                x1={activeBucket.x}
                x2={activeBucket.x}
                y1={PLOT_TOP}
                y2={BASE_Y + 20}
                className="transaction-chart-crosshair"
              />
            </>
          ) : null}

          {geometry.points.map((point) => {
            const isActive = activePointIds.has(point.id);
            return (
              <circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r={isActive ? 7.5 : point.isRecord ? 6 : 4.5}
                fill={point.isRecord ? "#0c9b69" : "#3167ed"}
                stroke="#fff"
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={activeBucket ? (isActive ? 1 : 0.35) : 0.82}
                className="chart-point"
              />
            );
          })}
        </svg>

        <div
          className="transaction-chart-overlay"
          onMouseMove={handlePlotMove}
          onMouseLeave={handlePlotLeave}
          aria-hidden="true"
        />
      </div>

      <div className="x-axis transaction-chart-axis">
        <span>{geometry.startLabel}</span>
        <span>{geometry.count}건 · 가로 이동으로 월별 조회</span>
        <span>{geometry.endLabel}</span>
      </div>
    </div>
  );
}
