import { formatAreaTypeLabel, type AreaTypeSnapshot, type SaleTransactionRecord } from "@/lib/area-type";
import { formatAmountManwon } from "@/lib/format-amount";

type SampleAreaInput = Omit<AreaTypeSnapshot, "label" | "saleTransactions"> & {
  saleTransactions?: SaleTransactionRecord[];
};

const parseAreaSqm = (area: string): number => {
  const match = area.match(/[\d.]+/);
  return match ? Number(match[0]) : 84;
};

export function buildSampleSaleTransactions(snapshot: SampleAreaInput): SaleTransactionRecord[] {
  if (snapshot.saleTransactions?.length) {
    return [...snapshot.saleTransactions].sort((a, b) => b.timestamp - a.timestamp);
  }

  const saleListings = snapshot.listings.filter((item) => item.dealType === "매매");
  const areaSqm = parseAreaSqm(snapshot.area);
  const floors = [3, 5, 7, 9, 11, 14, 16, 18, 20, 22, 25];
  const now = new Date(2026, 5, 22);
  const records: SaleTransactionRecord[] = [];

  for (let index = 0; index < snapshot.transactionCount; index += 1) {
    const listing = saleListings[index % Math.max(saleListings.length, 1)];
    const monthsAgo = index % 12;
    const day = 5 + (index % 20);
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
    const chartIndex = 11 - Math.min(monthsAgo, snapshot.chart.length - 1);
    const baseEok = snapshot.chart[chartIndex] ?? snapshot.chart.at(-1) ?? 0;
    const variance = ((index % 5) - 2) * 0.08;
    const amount = Math.max(10000, Math.round((baseEok + variance) * 10000));

    if (listing && index < saleListings.length) {
      records.push({
        id: listing.id,
        amount,
        priceLabel: listing.priceLabel,
        area: listing.area,
        floor: listing.floor,
        date: listing.date,
        timestamp: date.getTime(),
      });
      continue;
    }

    records.push({
      id: `sample-${snapshot.areaKey}-${index}`,
      amount,
      priceLabel: formatAmountManwon(amount),
      area: listing?.area ?? areaSqm,
      floor: floors[index % floors.length] ?? 10,
      date: `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")}`,
      timestamp: date.getTime(),
    });
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

export function withSampleAreaLabel(snapshot: SampleAreaInput): AreaTypeSnapshot {
  return {
    ...snapshot,
    saleTransactions: buildSampleSaleTransactions(snapshot),
    label: formatAreaTypeLabel(snapshot.areaKey),
  };
}
