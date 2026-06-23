import type { AreaTypeSnapshot, SaleTransactionRecord } from "@/lib/area-type";
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

export type BreakthroughStatus =
  | "already_broken"
  | "approaching"
  | "unlikely"
  | "at_record";

export type BreakthroughForecast = {
  status: BreakthroughStatus;
  referencePriceLabel: string;
  referenceDate: string;
  latestDealPriceLabel: string;
  latestDealDate: string;
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

type RecordAnalysis = {
  recordAmount: number;
  recordPriceLabel: string;
  recordDate: string;
  latest: SaleTransactionRecord;
  maxBeforeLatest: number;
  hasLatestBrokenRecord: boolean;
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

function parseDeltaPercent(delta: string): number {
  const match = delta.match(/[+-]?[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function monthlyMaxDealTrend(transactions: SaleTransactionRecord[]): number {
  const buckets = new Map<number, number>();
  for (const tx of transactions) {
    const date = new Date(tx.timestamp);
    const key = date.getFullYear() * 100 + (date.getMonth() + 1);
    buckets.set(key, Math.max(buckets.get(key) ?? 0, tx.amount));
  }
  const ordered = [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value);
  if (ordered.length < 2) return 0;
  const slice = ordered.slice(-4);
  return (slice.at(-1)! - slice[0]) / (slice.length - 1);
}

function analyzeRecordTransactions(transactions: SaleTransactionRecord[]): RecordAnalysis | null {
  if (!transactions.length) return null;

  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  const latest = sorted.at(-1)!;
  const beforeLatest = sorted.slice(0, -1);
  const maxBeforeLatest = beforeLatest.length ? Math.max(...beforeLatest.map((item) => item.amount)) : 0;

  let recordAmount = 0;
  let recordDate = latest.date;
  for (const tx of sorted) {
    if (tx.amount > recordAmount) {
      recordAmount = tx.amount;
      recordDate = tx.date;
    }
  }

  return {
    recordAmount,
    recordPriceLabel: formatAmountManwon(recordAmount),
    recordDate,
    latest,
    maxBeforeLatest,
    hasLatestBrokenRecord: latest.amount > maxBeforeLatest,
  };
}

function buildStatistics(
  area: AreaTypeSnapshot,
  supply: SupplyContext,
  record: RecordAnalysis | null,
): StatEvidence[] {
  const chart = area.chart;
  const recentTrendPct = chart.length >= 4 && chart.at(-4)! > 0
    ? Number((((chart.at(-1)! - chart.at(-4)!) / chart.at(-4)!) * 100).toFixed(1))
    : 0;
  const yearlyChange = parseDeltaPercent(area.delta);
  const rentRatio = area.signals.rent.ratio;

  const recordPriceLabel = record?.recordPriceLabel ?? "—";
  const gapPercent = record && record.recordAmount > 0
    ? Number((((record.latest.amount - record.recordAmount) / record.recordAmount) * 100).toFixed(1))
    : 0;

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
      label: "기준 신고가 대비",
      value: `${gapPercent >= 0 ? "+" : ""}${gapPercent.toFixed(1)}%`,
      impact: gapPercent >= 0 ? "positive" : gapPercent > -5 ? "neutral" : "negative",
      weight: 14,
      note: record
        ? `최근 1건 ${record.latest.priceLabel} · 기준 신고가 ${recordPriceLabel}(단일 거래 최고가)`
        : "거래 데이터 없음",
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
  transactions: SaleTransactionRecord[],
  now: Date,
): BreakthroughForecast {
  const empty: BreakthroughForecast = {
    status: "unlikely",
    referencePriceLabel: "—",
    referenceDate: "—",
    latestDealPriceLabel: area.price,
    latestDealDate: area.signals.latestDate,
    gapPercent: 0,
    breakthroughPeriodLabel: null,
    breakthroughMonths: null,
    breakthroughPriceLabel: "—",
    sentence: "매매 거래 표본이 없어 신고가 돌파 시점을 추정하지 못했어요.",
  };

  const record = analyzeRecordTransactions(transactions);
  if (!record) return empty;

  const dealTrendPerMonth = monthlyMaxDealTrend(transactions);
  const referencePriceLabel = record.recordPriceLabel;
  const referenceDate = record.recordDate;
  const latestDealPriceLabel = record.latest.priceLabel;
  const latestDealDate = record.latest.date;
  const gapPercent = record.recordAmount > 0
    ? Number((((record.latest.amount - record.recordAmount) / record.recordAmount) * 100).toFixed(1))
    : 0;

  const nextBreakthroughAmount = record.recordAmount + 1;
  const breakthroughPriceLabel = formatAmountManwon(nextBreakthroughAmount);

  if (record.hasLatestBrokenRecord) {
    const previousReferenceLabel = record.maxBeforeLatest > 0
      ? formatAmountManwon(record.maxBeforeLatest)
      : null;
    const breakthroughMonths = dealTrendPerMonth > 0
      ? Math.max(1, Math.ceil((nextBreakthroughAmount - record.latest.amount) / dealTrendPerMonth))
      : null;
    const breakthroughPeriodLabel = breakthroughMonths
      ? formatPeriod(new Date(now.getFullYear(), now.getMonth() + breakthroughMonths, 1))
      : null;

    return {
      status: "already_broken",
      referencePriceLabel,
      referenceDate,
      latestDealPriceLabel,
      latestDealDate,
      gapPercent: 0,
      breakthroughPeriodLabel,
      breakthroughMonths,
      breakthroughPriceLabel,
      sentence: previousReferenceLabel
        ? `${latestDealDate} ${latestDealPriceLabel} 1건이 이전 신고가 ${previousReferenceLabel}을(를) 돌파해 ${referencePriceLabel}으로 갱신됐어요.${breakthroughPeriodLabel ? ` 다음 돌파(1건이 ${breakthroughPriceLabel} 초과)는 ${breakthroughPeriodLabel}경(약 ${breakthroughMonths}개월 후)으로 추정돼요.` : " 다음 돌파 시점은 추가 거래 데이터가 필요해요."}`
        : `${latestDealDate} ${latestDealPriceLabel} 1건이 현재 기준 신고가예요.${breakthroughPeriodLabel ? ` 다음 돌파(1건이 ${breakthroughPriceLabel} 초과)는 ${breakthroughPeriodLabel}경(약 ${breakthroughMonths}개월 후)으로 추정돼요.` : ""}`,
    };
  }

  if (record.latest.amount >= record.recordAmount) {
    return {
      status: "at_record",
      referencePriceLabel,
      referenceDate,
      latestDealPriceLabel,
      latestDealDate,
      gapPercent: 0,
      breakthroughPeriodLabel: null,
      breakthroughMonths: null,
      breakthroughPriceLabel,
      sentence: `최근 1건 ${latestDealPriceLabel}(${latestDealDate})이(가) 기준 신고가 ${referencePriceLabel}(${referenceDate} 형성)과 같아요. 1건이라도 ${breakthroughPriceLabel}을(를) 넘기면 신고가가 돌파돼요.`,
    };
  }

  if (dealTrendPerMonth > 0) {
    const gapAmount = nextBreakthroughAmount - record.latest.amount;
    const monthsToBreak = Math.max(1, Math.ceil(gapAmount / dealTrendPerMonth));
    const breakthroughPeriodLabel = formatPeriod(new Date(now.getFullYear(), now.getMonth() + monthsToBreak, 1));

    return {
      status: monthsToBreak <= 8 ? "approaching" : "approaching",
      referencePriceLabel,
      referenceDate,
      latestDealPriceLabel,
      latestDealDate,
      gapPercent,
      breakthroughPeriodLabel,
      breakthroughMonths: monthsToBreak,
      breakthroughPriceLabel,
      sentence: `기준 신고가는 ${referencePriceLabel}(${referenceDate} 1건)이에요. 최근 1건 ${latestDealPriceLabel}이(가) ${Math.abs(gapPercent).toFixed(1)}% 낮아, 1건이라도 ${breakthroughPriceLabel}을(를) 넘기면 돌파예요. 예상 시점은 ${breakthroughPeriodLabel}경(약 ${monthsToBreak}개월 후)입니다.`,
    };
  }

  return {
    status: "unlikely",
    referencePriceLabel,
    referenceDate,
    latestDealPriceLabel,
    latestDealDate,
    gapPercent,
    breakthroughPeriodLabel: null,
    breakthroughMonths: null,
    breakthroughPriceLabel,
    sentence: `기준 신고가 ${referencePriceLabel}(${referenceDate} 1건) 대비 최근 1건 ${latestDealPriceLabel}이(가) ${Math.abs(gapPercent).toFixed(1)}% 낮아요. 단일 거래가 상승 추세가 약해 단기 돌파 가능성은 낮게 보여요.`,
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

  const record = analyzeRecordTransactions(area.saleTransactions);

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
      ? `최근 실거래 추세·거래량·전세가율·주변 공급을 반영해 ${horizonMonths}개월 뒤 가격을 추정했어요. 신고가 돌파는 1건이라도 기준가를 넘을 때로 판단합니다.`
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
  if (record?.hasLatestBrokenRecord) factors.push("최근 1건 신고가 갱신");

  const statistics = buildStatistics(area, supply, record);
  const breakthrough = buildBreakthroughForecast(area, area.saleTransactions, now);

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
