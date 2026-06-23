"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SaleTransactionRecord } from "@/lib/area-type";

const VIRTUALIZE_THRESHOLD = 20;
const ROW_HEIGHT = 54;

type TransactionListProps = {
  transactions: SaleTransactionRecord[];
  dataSource?: "molit" | "sample";
  compact?: boolean;
};

function TransactionRow({ transaction, isLatest }: { transaction: SaleTransactionRecord; isLatest?: boolean }) {
  return (
    <div className={`transaction-row${isLatest ? " transaction-row--latest" : ""}`}>
      <div className="transaction-row__main">
        <b>{transaction.priceLabel}</b>
        <small>{transaction.area.toFixed(1)}㎡ · {transaction.floor}층</small>
      </div>
      <em>{transaction.date}</em>
    </div>
  );
}

export function TransactionList({ transactions, dataSource, compact = false }: TransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = transactions.length >= VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  if (!transactions.length) {
    return (
      <div className="transaction-list-empty">
        <b>표시할 매매 거래가 없어요</b>
        <span>선택한 평형의 최근 12개월 실거래가 없습니다.</span>
      </div>
    );
  }

  return (
    <div className={`transaction-list-panel${compact ? " transaction-list-panel--compact" : ""}`}>
      {!compact ? (
        <div className="transaction-list-note">
          {dataSource === "molit"
            ? `최근 12개월 매매 신고 ${transactions.length}건 · 월평균이 아닌 건별 실거래가입니다.`
            : `샘플 매매 거래 ${transactions.length}건입니다.`}
        </div>
      ) : null}

      {shouldVirtualize ? (
        <div ref={parentRef} className={`transaction-list-viewport${compact ? " transaction-list-viewport--compact" : ""}`} aria-label="실거래가 목록">
          <div
            className="transaction-list-virtual"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const transaction = transactions[virtualRow.index];
              return (
                <div
                  key={transaction.id}
                  className="transaction-list-virtual-row"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <TransactionRow
                    transaction={transaction}
                    isLatest={virtualRow.index === 0}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ul className={`transaction-list${compact ? " transaction-list--compact" : ""}`}>
          {transactions.map((transaction, index) => (
            <li key={transaction.id}>
              <TransactionRow transaction={transaction} isLatest={index === 0} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function filterTransactionsByPeriod(
  transactions: SaleTransactionRecord[],
  period: "3m" | "1y" | "3y",
  now = new Date(),
): SaleTransactionRecord[] {
  const months = period === "3m" ? 3 : period === "1y" ? 12 : 36;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1).getTime();
  return transactions.filter((item) => item.timestamp >= cutoff);
}
