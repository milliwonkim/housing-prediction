"use client";

import { useMemo, useState } from "react";
import type { SaleTransactionRecord } from "@/lib/area-type";
import { formatAmountManwon } from "@/lib/format-amount";

const VIEW_WIDTH = 680;
const BASE_Y = 190;
const PLOT_HEIGHT = 155;

type TransactionPriceChartProps = {
  transactions: SaleTransactionRecord[];
  gradientId: string;
};

type ChartPoint = {
  id: string;
  x: number;
  y: number;
  valueEok: number;
  transaction: SaleTransactionRecord;
  isRecord: boolean;
};

export function TransactionPriceChart({ transactions, gradientId }: TransactionPriceChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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
      valueEok: transaction.amount / 10000,
      transaction,
      isRecord: transaction.amount === recordAmount,
    }));

    const recordY = BASE_Y - ((recordAmount / 10000 - minVal) / valRange) * PLOT_HEIGHT;
    const startLabel = sorted[0].date.slice(0, 8);
    const endLabel = sorted.at(-1)!.date.slice(0, 8);

    return {
      points,
      recordAmount,
      recordY,
      startLabel,
      endLabel,
      count: sorted.length,
    };
  }, [transactions]);

  if (!geometry) {
    return (
      <div className="chart-empty chart-empty--compact">
        <b>표시할 거래가 없어요</b>
      </div>
    );
  }

  const activePoint = geometry.points.find((point) => point.id === activeId)
    ?? geometry.points.at(-1)
    ?? geometry.points[0];
  const tooltipLeft = (activePoint.x / VIEW_WIDTH) * 100;

  return (
    <div className="chart-wrap transaction-chart-wrap">
      <div
        className={`chart-tooltip${activeId ? " chart-tooltip--active" : ""}`}
        style={{ left: `${tooltipLeft}%` }}
      >
        <span>{activePoint.transaction.date}</span>
        <strong>{activePoint.transaction.priceLabel}</strong>
        <small>{activePoint.transaction.area.toFixed(1)}㎡ · {activePoint.transaction.floor}층</small>
      </div>
      <svg
        className="chart transaction-chart"
        viewBox="0 0 680 220"
        role="img"
        aria-label="건별 실거래가 추이"
        onMouseLeave={() => setActiveId(null)}
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
        {geometry.points.map((point) => {
          const isActive = activeId === point.id || (!activeId && point.id === activePoint.id);
          return (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 7 : point.isRecord ? 6 : 4.5}
                fill={point.isRecord ? "#0c9b69" : "#3167ed"}
                stroke="#fff"
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={isActive ? 1 : 0.82}
                className="chart-point"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="14"
                fill="transparent"
                className="chart-hit"
                onMouseEnter={() => setActiveId(point.id)}
              />
            </g>
          );
        })}
      </svg>
      <div className="x-axis transaction-chart-axis">
        <span>{geometry.startLabel}</span>
        <span>{geometry.count}건 · 건별 실거래</span>
        <span>{geometry.endLabel}</span>
      </div>
    </div>
  );
}
