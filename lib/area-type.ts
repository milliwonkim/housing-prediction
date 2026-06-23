export const AREA_TOLERANCE = 2.5;

export type AreaTypeSnapshot = {
  areaKey: number;
  label: string;
  transactionCount: number;
  price: string;
  delta: string;
  score: number;
  confidence: string;
  forecast: string;
  chart: number[];
  volumeChart: number[];
  rentRatioChart: number[];
  listings: Array<{
    id: string;
    dealType: "매매" | "전세" | "월세";
    area: number;
    floor: number;
    priceLabel: string;
    date: string;
  }>;
  area: string;
  signals: {
    transactionCount: number;
    volumeChange: number;
    latestDate: string;
    latestFloor: number;
    totalCount: number;
    rent: { ratio: number | null; count: number; latestDeposit: number | null; error?: string };
  };
};

export function clusterAreaKeys(areas: number[]): number[] {
  const clusters: number[] = [];
  for (const area of [...areas].sort((a, b) => a - b)) {
    if (!clusters.some((key) => Math.abs(key - area) <= AREA_TOLERANCE)) clusters.push(area);
  }
  return clusters.sort((a, b) => a - b);
}

export function matchesAreaType(area: number, areaKey: number): boolean {
  return Math.abs(area - areaKey) <= AREA_TOLERANCE;
}

export function formatAreaTypeLabel(areaKey: number): string {
  return `${Math.round(areaKey)}㎡형`;
}
