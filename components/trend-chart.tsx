"use client";

import { ChartSeries } from "@/components/chart-series";

type TrendChartProps = {
  values: number[];
  labels: string[];
  variant?: "line" | "bar";
  unit?: string;
  color?: string;
  gradientId: string;
  ariaLabel: string;
};

export function TrendChart({
  values,
  labels,
  variant = "line",
  unit = "",
  color = "#2f67ed",
  gradientId,
  ariaLabel,
}: TrendChartProps) {
  return (
    <ChartSeries
      values={values}
      labels={labels}
      variant={variant}
      unit={unit}
      color={color}
      gradientId={gradientId}
      ariaLabel={ariaLabel}
      compact
    />
  );
}

export type MarketListing = {
  id: string;
  dealType: "매매" | "전세" | "월세";
  area: number;
  floor: number;
  priceLabel: string;
  date: string;
};

export function ListingsPanel({ listings, dataSource }: { listings: MarketListing[]; dataSource?: "molit" | "sample" }) {
  if (!listings.length) {
    return (
      <div className="listings-empty">
        <b>표시할 매물 정보가 없어요</b>
        <span>실거래 데이터 연결 후 최근 거래를 확인할 수 있어요.</span>
      </div>
    );
  }

  return (
    <div className="listings-panel">
      <div className="listings-note">
        {dataSource === "molit"
          ? "국토교통부 신고 자료의 최근 거래 내역입니다. 실제 중개 매물과 다를 수 있어요."
          : "샘플 등록 매물 데이터입니다."}
      </div>
      <ul className="listings-list">
        {listings.map((listing) => (
          <li key={listing.id}>
            <span className={`listing-badge ${listing.dealType === "매매" ? "sale" : listing.dealType === "전세" ? "rent" : "monthly"}`}>
              {listing.dealType}
            </span>
            <div className="listing-main">
              <b>{listing.priceLabel}</b>
              <small>{listing.area.toFixed(1)}㎡ · {listing.floor}층</small>
            </div>
            <em>{listing.date}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
