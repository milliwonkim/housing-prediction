import {
  type AreaTypeSnapshot,
  formatAreaTypeLabel,
  matchesAreaType,
} from "@/lib/area-type";

type SaleTransaction = {
  amount: number;
  area: number;
  year: number;
  month: number;
  day: number;
  floor: number;
};

type RentTransaction = {
  deposit: number;
  monthlyRent: number;
  area: number;
  year: number;
  month: number;
  day: number;
  floor: number;
};

type MarketListing = AreaTypeSnapshot["listings"][number];

const monthKey = (year: number, month: number) => `${year}${String(month).padStart(2, "0")}`;

const forwardFill = (values: Array<number | null>) => {
  let last: number | null = null;
  return values.map((value) => {
    if (value !== null) last = value;
    return last;
  });
};

const formatDate = (year: number, month: number, day: number) =>
  `${year}. ${String(month).padStart(2, "0")}. ${String(day).padStart(2, "0")}`;

export function buildAreaSnapshot({
  areaKey,
  transactions,
  rentTransactions,
  months,
  now,
  formatAmount,
  rentError,
}: {
  areaKey: number;
  transactions: SaleTransaction[];
  rentTransactions: RentTransaction[];
  months: string[];
  now: Date;
  formatAmount: (amount: number) => string;
  rentError?: string;
}): AreaTypeSnapshot | null {
  const sales = transactions.filter((item) => matchesAreaType(item.area, areaKey));
  if (!sales.length) return null;

  const rents = rentTransactions.filter((item) => matchesAreaType(item.area, areaKey));
  const monthLabels = months.map((month) => `${Number(month.slice(4))}월`);

  const monthlyAverages = months.map((month) => {
    const values = sales
      .filter((item) => monthKey(item.year, item.month) === month)
      .map((item) => item.amount / 10000);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  });

  let lastValue = monthlyAverages.find((value) => value !== null) ?? 0;
  const chart = monthlyAverages.map((value) => {
    if (value !== null) lastValue = value;
    return Number(lastValue.toFixed(2));
  });

  const volumeChart = months.map(
    (month) => sales.filter((item) => monthKey(item.year, item.month) === month).length,
  );

  const rentRatioRaw = months.map((month) => {
    const monthSales = sales.filter((item) => monthKey(item.year, item.month) === month);
    const monthRents = rents.filter((item) => monthKey(item.year, item.month) === month && item.monthlyRent === 0);
    if (!monthSales.length || !monthRents.length) return null;
    const saleAverage = monthSales.reduce((sum, item) => sum + item.amount, 0) / monthSales.length;
    const rentAverage = monthRents.reduce((sum, item) => sum + item.deposit, 0) / monthRents.length;
    return Number(((rentAverage / saleAverage) * 100).toFixed(1));
  });
  const rentRatioChart = forwardFill(rentRatioRaw).filter((value): value is number => value !== null);

  const latest = sales.at(-1)!;
  const recent = sales.filter(
    (item) => new Date(item.year, item.month - 1, item.day) >= new Date(now.getFullYear(), now.getMonth() - 2, 1),
  );
  const previous = sales.filter((item) => {
    const date = new Date(item.year, item.month - 1, item.day);
    return date >= new Date(now.getFullYear(), now.getMonth() - 5, 1) && date < new Date(now.getFullYear(), now.getMonth() - 2, 1);
  });

  const firstChart = chart[0] || chart.at(-1) || 0;
  const lastChart = chart.at(-1) || firstChart;
  const priceChange = firstChart ? ((lastChart - firstChart) / firstChart) * 100 : 0;
  const volumeChange = previous.length ? ((recent.length - previous.length) / previous.length) * 100 : 0;
  const score = Math.max(10, Math.min(90, Math.round(50 + priceChange * 2 + volumeChange * 0.1)));

  const pureRents = rents.filter((item) => item.monthlyRent === 0);
  let rentSignal: AreaTypeSnapshot["signals"]["rent"] = { ratio: null, count: 0, latestDeposit: null, error: rentError };
  if (!rentError && pureRents.length) {
    const averageDeposit = pureRents.reduce((sum, item) => sum + item.deposit, 0) / pureRents.length;
    rentSignal = {
      ratio: Number(((averageDeposit / latest.amount) * 100).toFixed(1)),
      count: pureRents.length,
      latestDeposit: pureRents.at(-1)?.deposit ?? null,
    };
  }

  const saleTransactions = sales
    .map((item) => ({
      id: `sale-${areaKey}-${monthKey(item.year, item.month)}-${item.day}-${item.floor}-${item.amount}`,
      amount: item.amount,
      priceLabel: formatAmount(item.amount),
      area: item.area,
      floor: item.floor,
      date: formatDate(item.year, item.month, item.day),
      timestamp: new Date(item.year, item.month - 1, item.day).getTime(),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  const listingCutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const saleListings: MarketListing[] = sales
    .filter((item) => new Date(item.year, item.month - 1, item.day) >= listingCutoff)
    .sort((a, b) => new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime())
    .map((item) => ({
      id: `sale-${areaKey}-${monthKey(item.year, item.month)}-${item.day}-${item.floor}`,
      dealType: "매매",
      area: item.area,
      floor: item.floor,
      priceLabel: formatAmount(item.amount),
      date: formatDate(item.year, item.month, item.day),
    }));

  const rentListings: MarketListing[] = rents
    .filter((item) => new Date(item.year, item.month - 1, item.day) >= listingCutoff)
    .sort((a, b) => new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime())
    .map((item) => ({
      id: `rent-${areaKey}-${monthKey(item.year, item.month)}-${item.day}-${item.area}`,
      dealType: item.monthlyRent > 0 ? "월세" : "전세",
      area: item.area,
      floor: item.floor,
      priceLabel: item.monthlyRent > 0
        ? `${formatAmount(item.deposit)} / ${item.monthlyRent.toLocaleString("ko-KR")}만`
        : formatAmount(item.deposit),
      date: formatDate(item.year, item.month, item.day),
    }));

  const listings = [...saleListings, ...rentListings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return {
    areaKey,
    label: formatAreaTypeLabel(areaKey),
    transactionCount: sales.length,
    price: formatAmount(latest.amount),
    delta: `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(1)}%`,
    score,
    confidence: sales.length >= 10 ? "높음" : sales.length >= 4 ? "보통" : "낮음",
    forecast: priceChange > 2 ? "실거래 상승 흐름" : priceChange < -2 ? "실거래 하락 흐름" : "실거래 보합 흐름",
    chart: chart.length === 1 ? [chart[0], chart[0]] : chart,
    volumeChart,
    rentRatioChart: rentRatioChart.length === 1 ? [rentRatioChart[0], rentRatioChart[0]] : rentRatioChart,
    saleTransactions,
    listings,
    area: `${latest.area.toFixed(1)}㎡`,
    signals: {
      transactionCount: recent.length,
      volumeChange,
      latestDate: formatDate(latest.year, latest.month, latest.day),
      latestFloor: latest.floor,
      totalCount: sales.length,
      rent: rentSignal,
    },
  };
}
