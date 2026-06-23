"use client";

import { useMemo, useState } from "react";

const VIEW_WIDTH = 680;
const BASE_Y = 190;
const PLOT_HEIGHT = 155;

type ChartSeriesProps = {
  values: number[];
  labels: string[];
  variant: "line" | "bar";
  unit?: string;
  formatValue?: (value: number) => string;
  color?: string;
  gradientId: string;
  ariaLabel: string;
  compact?: boolean;
};

type LinePoint = { x: number; y: number; value: number; index: number };
type BarItem = { x: number; y: number; width: number; height: number; value: number; index: number };

function formatDefaultValue(value: number, unit: string) {
  return unit === "억" ? `${value.toFixed(1)}${unit}` : `${value}${unit}`;
}

export function ChartSeries({
  values,
  labels,
  variant,
  unit = "",
  formatValue,
  color = "#2f67ed",
  gradientId,
  ariaLabel,
  compact = false,
}: ChartSeriesProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (!values.length) return null;

    if (variant === "bar") {
      const barMax = Math.max(...values, 1);
      const barWidth = Math.max(18, VIEW_WIDTH / values.length - 10);
      const gap = (VIEW_WIDTH - barWidth * values.length) / (values.length + 1);
      const bars: BarItem[] = values.map((value, index) => {
        const barHeight = (value / barMax) * PLOT_HEIGHT;
        const x = gap + index * (barWidth + gap);
        return { x, y: BASE_Y - barHeight, width: barWidth, height: barHeight, value, index };
      });
      return { bars };
    }

    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const range = max - min || 1;
    const linePoints: LinePoint[] = values.map((value, index) => ({
      x: values.length === 1 ? VIEW_WIDTH : (index / (values.length - 1)) * VIEW_WIDTH,
      y: BASE_Y - ((value - min) / range) * PLOT_HEIGHT,
      value,
      index,
    }));
    const polyline = linePoints.map((point) => `${point.x},${point.y}`).join(" ");
    const area = `0,${BASE_Y + 20} ${polyline} ${VIEW_WIDTH},${BASE_Y + 20}`;
    return { linePoints, polyline, area };
  }, [values, variant]);

  if (!geometry || !values.length) {
    return (
      <div className="chart-empty chart-empty--compact">
        <b>표시할 데이터가 없어요</b>
      </div>
    );
  }

  const hoverIndex = activeIndex ?? values.length - 1;
  const hoverValue = values[hoverIndex] ?? 0;
  const hoverLabel = labels[hoverIndex] ?? "";
  const displayValue = formatValue ? formatValue(hoverValue) : formatDefaultValue(hoverValue, unit);
  const tooltipLeft = variant === "bar" && geometry.bars
    ? ((geometry.bars[hoverIndex]?.x ?? 0) + (geometry.bars[hoverIndex]?.width ?? 0) / 2) / VIEW_WIDTH * 100
    : ((geometry.linePoints?.[hoverIndex]?.x ?? VIEW_WIDTH) / VIEW_WIDTH) * 100;

  const wrapClass = compact ? "chart-wrap chart-wrap--compact" : "chart-wrap";

  return (
    <div className={wrapClass}>
      <div
        className={`chart-tooltip${activeIndex !== null ? " chart-tooltip--active" : ""}`}
        style={{ left: `${tooltipLeft}%` }}
      >
        <span>{hoverLabel}</span>
        <strong>{displayValue}</strong>
      </div>
      <svg
        className="chart"
        viewBox="0 0 680 220"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {[40, 90, 140, 190].map((y) => (
          <line key={y} x1="0" x2={VIEW_WIDTH} y1={y} y2={y} className="grid-line" />
        ))}
        {variant === "bar" && geometry.bars ? (
          geometry.bars.map((bar) => (
            <g key={`bar-${bar.index}`}>
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx="4"
                fill={color}
                opacity={hoverIndex === bar.index ? 1 : 0.55}
                className="chart-bar"
              />
              <rect
                x={bar.x - 4}
                y={40}
                width={bar.width + 8}
                height={BASE_Y + 20}
                fill="transparent"
                className="chart-hit"
                onMouseEnter={() => setActiveIndex(bar.index)}
              />
            </g>
          ))
        ) : (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity=".24" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={geometry.area} fill={`url(#${gradientId})`} />
            <polyline
              points={geometry.polyline}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {geometry.linePoints?.map((point) => (
              <g key={`point-${point.index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoverIndex === point.index ? 6 : 0}
                  fill="#fff"
                  stroke={color}
                  strokeWidth="3"
                  className="chart-point"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="14"
                  fill="transparent"
                  className="chart-hit"
                  onMouseEnter={() => setActiveIndex(point.index)}
                />
              </g>
            ))}
          </>
        )}
      </svg>
      <div className="x-axis">
        {labels
          .filter((_, index) => index === 0 || index === labels.length - 1 || index % 2 === 0)
          .map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
      </div>
    </div>
  );
}
