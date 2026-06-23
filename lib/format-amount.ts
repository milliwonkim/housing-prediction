export function formatAmountManwon(amount: number): string {
  const billion = Math.floor(amount / 10000);
  const remainder = amount % 10000;
  if (!billion) return `${amount.toLocaleString("ko-KR")}만`;
  return remainder ? `${billion}억 ${remainder.toLocaleString("ko-KR")}만` : `${billion}억`;
}
