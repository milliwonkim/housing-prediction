import type { AreaTypeSnapshot } from "@/lib/area-type";
import { formatAmountManwon } from "@/lib/format-amount";

export type PredictionDirection = "상승" | "하락" | "보합";

export type StatEvidence = {
  id: string;
  label: string;
  value: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  note: string;
};

export type BreakthroughStatus = "already_broken" | "approaching" | "unlikely" | "at_peak";

export type BreakthroughForecast = {
  status: BreakthroughStatus;
  peakPriceLabel: string;
  peakPeriodLabel: string;
  gapPercent: number;
  breakthroughPeriodLabel: string | null;
  breakthroughMonths: number | null;
  breakthroughPriceLabel: string;
  sentence: string;
};

export type PredictionSummary = {
  direction: PredictionDirection;
  probabilityPercent: number;
  horizonMonths: number;
  targetPeriodLabel: string;
  currentPriceLabel: string;
  targetPriceLabel: string;
  expectedChangePercent: number;
  headline: string;
  sentence: string;
  detail: string;
  factors: string[];
  statistics: StatEvidence[];
  breakthrough: BreakthroughForecast;
};

type SupplyContext = {
  households: number | null;
  projectCount: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function monthlyTrend(chart: number[]): number {
  const slice = chart.slice(-4);
  if (slice.length < 2) return 0;
  return (slice.at(-1)! - slice[0]) / (slice.length - 1);
}

function formatPeriod(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function periodLabelFromIndex(index: number, chartLength: number, now: Date): string {
  const monthsAgo = chartLength - 1 - index;
  const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return formatPeriod(date);
}

function parseDeltaPercent(delta: string): number {
  const match = delta.match(/[+-]?[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function buildStatistics(
  area: AreaTypeSnapshot,
  supply: SupplyContext,
  peakPriceLabel: string,
  gapPercent: number,
): StatEvidence[] {
  const chart = area.chart;
  const recentTrendPct = chart.length >= 4 && chart.at(-4)! > 0
    ? Number((((chart.at(-1)! - chart.at(-4)!) / chart.at(-4)!) * 100).toFixed(1))
    : 0;
  const yearlyChange = parseDeltaPercent(area.delta);
  const rentRatio = area.signals.rent.ratio;

  return [
    {
      id: "yearly-change",
      label: "12개월 가격 변화",
      value: area.delta,
      impact: yearlyChange > 1 ? "positive" : yearlyChange < -1 ? "negative" : "neutral",
      weight: 22,
      note: "최근 12개월 첫 거래 대비 최신 신고가 변화율",
    },
    {
      id: "recent-trend",
      label: "최근 3개월 추세",
      value: `${recentTrendPct >= 0 ? "+" : ""}${recentTrendPct}%`,
      impact: recentTrendPct > 1 ? "positive" : recentTrendPct < -1 ? "negative" : "neutral",
      weight: 20,
      note: "단기 모멘텀 — 예측 시점·목표가 산출의 핵심 입력값",
    },
    {
      id: "volume",
      label: "최근 3개월 거래량",
      value: `${area.signals.transactionCount}건`,
      impact: area.signals.volumeChange > 10 ? "positive" : area.signals.volumeChange < -10 ? "negative" : "neutral",
      weight: 18,
      note: `직전 3개월 대비 ${area.signals.volumeChange >= 0 ? "+" : ""}${area.signals.volumeChange.toFixed(0)}%`,
    },
    {
      id: "sample-size",
      label: "12개월 총 거래",
      value: `${area.signals.totalCount}건`,
      impact: area.confidence === "높음" ? "positive" : area.confidence === "낮음" ? "negative" : "neutral",
      weight: 12,
      note: `신뢰도 ${area.confidence} · 표본 ${area.transactionCount}건(해당 평형)`,
    },
    {
      id: "rent-ratio",
      label: "전세가율",
      value: rentRatio === null ? "—" : `${rentRatio}%`,
      impact: rentRatio !== null && rentRatio >= 55 ? "positive" : rentRatio !== null && rentRatio < 50 ? "negative" : "neutral",
      weight: 14,
      note: rentRatio === null
        ? "전월세 데이터 없음"
        : `${area.signals.rent.count}건 기준 · 실수요 지지력 반영`,
    },
    {
      id: "peak-gap",
      label: "최고 신고가 대비",
      value: `${gapPercent >= 0 ? "+" : ""}${gapPercent.toFixed(1)}%`,
      impact: gapPercent >= 0 ? "positive" : gapPercent > -5 ? "neutral" : "negative",
      weight: 14,
      note: `12개월 최고 ${peakPriceLabel} 대비 현재가`,
    },
    {
      id: "flow-score",
      label: "흐름 점수",
      value: `${area.score}점`,
      impact: area.score >= 65 ? "positive" : area.score <= 45 ? "negative" : "neutral",
      weight: 16,
      note: "가격·거래량 추세를 종합한 상승 가능성 지표",
    },
    {
      id: "supply",
      label: "향후 2년 입주",
      value: supply.households === null ? "—" : `${supply.households.toLocaleString("ko-KR")}세대`,
      impact: supply.households !== null && supply.households > 1500 ? "negative" : supply.households !== null && supply.households < 1000 ? "positive" : "neutral",
      weight: 10,
      note: supply.households === null
        ? "인허가 데이터 없음"
        : `${supply.projectCount}개 사업 · 공급 부담 반영`,
    },
  ];
}

function buildBreakthroughForecast(
  area: AreaTypeSnapshot,
  chart: number[],
  currentEok: number,
  trendPerMonth: number,
  now: Date,
): BreakthroughForecast {
  const peakEok = Math.max(...chart);
  const peakIndex = chart.indexOf(peakEok);
  const peakPriceLabel = formatAmountManwon(Math.round(peakEok * 10000));
  const peakPeriodLabel = periodLabelFromIndex(peakIndex, chart.length, now);
  const gapPercent = peakEok > 0 ? Number((((currentEok - peakEok) / peakEok) * 100).toFixed(1)) : 0;
  const isCurrentPeak = Math.abs(currentEok - peakEok) < 0.02;

  if (isCurrentPeak) {
    const nextTargetEok = currentEok * 1.03;
    const breakthroughPriceLabel = formatAmountManwon(Math.round(nextTargetEok * 10000));
    const breakthroughMonths = trendPerMonth > 0.02
      ? Math.max(1, Math.ceil((nextTargetEok - currentEok) / trendPerMonth))
      : null;
    const breakthroughPeriodLabel = breakthroughMonths
      ? formatPeriod(new Date(now.getFullYear(), now.getMonth() + breakthroughMonths, 1))
      : null;

    return {
      status: peakIndex === chart.length - 1 ? "already_broken" : "at_peak",
      peakPriceLabel,
      peakPeriodLabel,
      gapPercent: 0,
      breakthroughPeriodLabel,
      breakthroughMonths,
      breakthroughPriceLabel,
      sentence: peakIndex === chart.length - 1
        ? `현재 ${area.price}이(가) 최근 12개월 최고 신고가예요.${breakthroughPeriodLabel ? ` 다음 구간(${breakthroughPriceLabel}) 돌파는 ${breakthroughPeriodLabel}경(${breakthroughMonths}개월 후)으로 추정돼요.` : " 다음 구간 돌파는 추가 거래 데이터가 필요해요."}`
        : `${peakPeriodLabel}에 형성된 최고 신고가 ${peakPriceLabel}와 동일한 수준이에요. 추가 상승 시 신고가 갱신이 이어질 수 있어요.`,
    };
  }

  if (trendPerMonth > 0.02) {
    const monthsToBreak = Math.max(1, Math.ceil((peakEok - currentEok) / trendPerMonth));
    const breakthroughPeriodLabel = formatPeriod(new Date(now.getFullYear(), now.getMonth() + monthsToBreak, 1));

    return {
      status: monthsToBreak <= 8 ? "approaching" : "approaching",
      peakPriceLabel,
      peakPeriodLabel,
      gapPercent,
      breakthroughPeriodLabel,
      breakthroughMonths: monthsToBreak,
      breakthroughPriceLabel: peakPriceLabel,
      sentence: `최근 12개월 최고 신고가 ${peakPriceLabel}(${peakPeriodLabel}) 돌파 예상 시점은 ${breakthroughPeriodLabel}경, 약 ${monthsToBreak}개월 후예요. 현재가는 최고가 대비 ${Math.abs(gapPercent).toFixed(1)}% 낮아요.`,
    };
  }

  return {
    status: "unlikely",
    peakPriceLabel,
    peakPeriodLabel,
    gapPercent,
    breakthroughPeriodLabel: null,
    breakthroughMonths: null,
    breakthroughPriceLabel: peakPriceLabel,
    sentence: `최고 신고가 ${peakPriceLabel}(${peakPeriodLabel}) 대비 ${Math.abs(gapPercent).toFixed(1)}% 낮아요. 현재 하락·보합 추세라 단기 돌파 가능성은 낮게 보여요.`,
  };
}

export function buildPredictionSummary(
  area: AreaTypeSnapshot,
  supply: SupplyContext,
  now = new Date(),
): PredictionSummary {
  const chart = area.chart;
  const currentEok = chart.at(-1) ?? 0;
  const trendPerMonth = monthlyTrend(chart);

  const direction: PredictionDirection =
    trendPerMonth > 0.04 ? "상승" :
    trendPerMonth < -0.04 ? "하락" : "보합";

  const trendStrength = Math.abs(trendPerMonth) / Math.max(currentEok, 1);
  const horizonMonths =
    trendStrength > 0.015 ? 3 :
    trendStrength > 0.006 ? 4 :
    direction === "보합" ? 6 : 5;

  const projectedEok = Math.max(0.1, currentEok + trendPerMonth * horizonMonths);
  const targetManwon = Math.round(projectedEok * 10000);
  const expectedChangePercent = currentEok > 0
    ? Number((((projectedEok - currentEok) / currentEok) * 100).toFixed(1))
    : 0;

  const peakEok = Math.max(...chart);
  const gapPercent = peakEok > 0 ? Number((((currentEok - peakEok) / peakEok) * 100).toFixed(1)) : 0;
  const peakPriceLabel = formatAmountManwon(Math.round(peakEok * 10000));

  let probability = area.score;
  if (direction === "상승") {
    if (area.signals.volumeChange > 15) probability += 6;
    if (area.signals.volumeChange < -15) probability -= 8;
    if (area.signals.rent.ratio !== null && area.signals.rent.ratio >= 55) probability += 4;
    if (supply.households !== null && supply.households > 1800) probability -= 10;
    if (supply.households !== null && supply.households < 1100) probability += 5;
    if (area.confidence === "낮음") probability -= 12;
    else if (area.confidence === "높음") probability += 5;
  } else if (direction === "하락") {
    probability = clamp(100 - area.score, 8, 35);
  } else {
    probability = clamp(area.score - 5, 35, 58);
  }
  probability = clamp(Math.round(probability), 5, 92);

  const targetDate = new Date(now.getFullYear(), now.getMonth() + horizonMonths, 1);
  const targetPeriodLabel = formatPeriod(targetDate);
  const targetPriceLabel = formatAmountManwon(targetManwon);

  const headline =
    direction === "상승"
      ? `${targetPeriodLabel}경 ${targetPriceLabel} 수준까지 상승 전망`
      : direction === "하락"
        ? `${targetPeriodLabel}경 ${targetPriceLabel} 수준까지 하락 전망`
        : `${targetPeriodLabel}경 ${targetPriceLabel} 근처 보합 전망`;

  const sentence =
    direction === "상승"
      ? `이 아파트(${area.label})는 ${targetPeriodLabel}경 ${targetPriceLabel} 수준까지 ${expectedChangePercent >= 0 ? "+" : ""}${expectedChangePercent}% ${direction}할 가능성이 ${probability}%입니다.`
      : direction === "하락"
        ? `이 아파트(${area.label})는 ${targetPeriodLabel}경 ${targetPriceLabel} 수준까지 ${expectedChangePercent}% ${direction}할 가능성이 ${probability}%입니다.`
        : `이 아파트(${area.label})는 ${targetPeriodLabel}경 ${targetPriceLabel} 근처에서 ${direction}할 가능성이 ${probability}%입니다.`;

  const detail =
    direction === "상승"
      ? `최근 실거래 추세·거래량·전세가율·주변 공급을 반영해 ${horizonMonths}개월 뒤 가격을 추정했어요.`
      : direction === "하락"
        ? `최근 실거래가 하락 흐름이 감지돼 단기 상승 가능성은 낮게 산출됐어요.`
        : `뚜렷한 상승·하락 신호 없이 횡보할 가능성이 커요.`;

  const factors: string[] = [];
  if (area.signals.volumeChange > 10) factors.push("거래량 회복");
  if (area.signals.volumeChange < -10) factors.push("거래량 감소");
  if (area.signals.rent.ratio !== null && area.signals.rent.ratio >= 55) factors.push("전세가율 양호");
  if (area.signals.rent.ratio !== null && area.signals.rent.ratio < 50) factors.push("전세가율 낮음");
  if (supply.households !== null && supply.households > 1500) factors.push("주변 입주 물량 부담");
  if (supply.households !== null && supply.households < 1000) factors.push("공급 제한");
  if (area.confidence === "높음") factors.push("거래 표본 충분");
  if (area.confidence === "낮음") factors.push("거래 표본 부족");

  const statistics = buildStatistics(area, supply, peakPriceLabel, gapPercent);
  const breakthrough = buildBreakthroughForecast(area, chart, currentEok, trendPerMonth, now);

  return {
    direction,
    probabilityPercent: probability,
    horizonMonths,
    targetPeriodLabel,
    currentPriceLabel: area.price,
    targetPriceLabel,
    expectedChangePercent,
    headline,
    sentence,
    detail,
    factors,
    statistics,
    breakthrough,
  };
}
