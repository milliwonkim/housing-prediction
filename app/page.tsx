import { Dashboard } from "@/components/dashboard";
import { clusterAreaKeys } from "@/lib/area-type";
import { buildAreaSnapshot } from "@/lib/real-estate-metrics";
import { normalizeLawdCode } from "@/lib/lawd-code";

type RealEstateQuery = { apartmentName: string; lawdCode: string };
type Transaction = { name: string; amount: number; area: number; year: number; month: number; day: number; floor: number; bjdongCode: string };
type RentTransaction = { name: string; deposit: number; monthlyRent: number; area: number; year: number; month: number; day: number; floor: number };

const readTag = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
};

const normalizeName = (value: string) => value.replace(/[\s·・()\-]/g, "").toLocaleLowerCase("ko");

const formatAmount = (amount: number) => {
  const billion = Math.floor(amount / 10000);
  const remainder = amount % 10000;
  if (!billion) return `${amount.toLocaleString("ko-KR")}만`;
  return remainder ? `${billion}억 ${remainder.toLocaleString("ko-KR")}만` : `${billion}억`;
};

async function loadRealEstateData({ apartmentName, lawdCode }: RealEstateQuery) {
  "use server";

  const rawKey = process.env.MOLIT_SERVICE_KEY;
  if (!rawKey) throw new Error("MOLIT_SERVICE_KEY가 설정되지 않았습니다.");
  const serviceKey = (() => {
    try { return decodeURIComponent(rawKey); } catch { return rawKey; }
  })();
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  }).reverse();
  const monthLabels = months.map((month) => `${Number(month.slice(4))}월`);

  const responses = await Promise.all(months.map(async (dealMonth) => {
    const url = new URL("http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev");
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("LAWD_CD", lawdCode.slice(0, 5));
    url.searchParams.set("DEAL_YMD", dealMonth);
    url.searchParams.set("numOfRows", "9999");
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/xml",
        "User-Agent": "Mozilla/5.0 (compatible; ZipwiseDashboard/1.0)",
      },
    });
    if (!response.ok) throw new Error(`실거래가 API 응답 오류 (${response.status})`);
    return { dealMonth, xml: await response.text() };
  }));

  const requestedName = normalizeName(apartmentName);
  const transactions: Transaction[] = responses.flatMap(({ xml }) => {
    const resultCode = readTag(xml, "resultCode");
    if (resultCode && resultCode !== "000" && resultCode !== "00") {
      throw new Error(readTag(xml, "resultMsg") || "실거래가 API 조회에 실패했습니다.");
    }
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
      const item = match[1];
      return {
        name: readTag(item, "aptNm"),
        amount: Number(readTag(item, "dealAmount").replace(/,/g, "")),
        area: Number(readTag(item, "excluUseAr")),
        year: Number(readTag(item, "dealYear")),
        month: Number(readTag(item, "dealMonth")),
        day: Number(readTag(item, "dealDay")),
        floor: Number(readTag(item, "floor")),
        bjdongCode: readTag(item, "umdCd"),
      };
    }).filter((item) => {
      const resultName = normalizeName(item.name);
      return item.amount > 0 && (resultName === requestedName || resultName.includes(requestedName) || requestedName.includes(resultName));
    });
  }).sort((a, b) => new Date(a.year, a.month - 1, a.day).getTime() - new Date(b.year, b.month - 1, b.day).getTime());

  if (!transactions.length) throw new Error("최근 12개월 실거래가를 찾지 못했습니다. 주소 검색에서 정확한 건물명을 선택해 주세요.");

  const fetchRentMonth = async (dealMonth: string) => {
    const url = new URL("http://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent");
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("LAWD_CD", lawdCode.slice(0, 5));
    url.searchParams.set("DEAL_YMD", dealMonth);
    url.searchParams.set("numOfRows", "9999");
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/xml", "User-Agent": "Mozilla/5.0 (compatible; ZipwiseDashboard/1.0)" } });
    if (response.status === 403) throw new Error("전월세 실거래 API 활용신청이 필요합니다.");
    if (!response.ok) throw new Error(`전월세 실거래 API 응답 오류 (${response.status})`);
    return response.text();
  };

  let rentTransactions: RentTransaction[] = [];
  let rentError: string | undefined;

  try {
    const rentXmlByMonth = await Promise.all(months.map(async (dealMonth) => ({ dealMonth, xml: await fetchRentMonth(dealMonth) })));
    rentTransactions = rentXmlByMonth.flatMap(({ xml }) =>
      [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
        const item = match[1];
        return {
          name: readTag(item, "aptNm"),
          deposit: Number(readTag(item, "deposit").replace(/,/g, "")),
          monthlyRent: Number(readTag(item, "monthlyRent").replace(/,/g, "")),
          area: Number(readTag(item, "excluUseAr")),
          year: Number(readTag(item, "dealYear")),
          month: Number(readTag(item, "dealMonth")),
          day: Number(readTag(item, "dealDay")),
          floor: Number(readTag(item, "floor")) || 0,
        };
      }).filter((item) => {
        const resultName = normalizeName(item.name);
        return item.deposit > 0 && (resultName === requestedName || resultName.includes(requestedName) || requestedName.includes(resultName));
      }),
    );
  } catch (error) {
    rentError = error instanceof Error ? error.message : "전월세 데이터를 불러오지 못했습니다.";
  }

  const areaKeys = clusterAreaKeys([
    ...transactions.map((item) => item.area),
    ...rentTransactions.map((item) => item.area),
  ]);

  const areaTypes = areaKeys
    .map((areaKey) => buildAreaSnapshot({
      areaKey,
      transactions,
      rentTransactions,
      months,
      now,
      formatAmount,
      rentError,
    }))
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot !== null);

  if (!areaTypes.length) throw new Error("평형별 실거래 데이터를 만들지 못했습니다.");

  const defaultAreaKey = areaTypes.reduce((best, current) =>
    current.transactionCount > best.transactionCount ? current : best,
  ).areaKey;

  const latest = transactions.at(-1)!;
  let supplySignal: { households: number | null; projectCount: number; error?: string } = { households: null, projectCount: 0 };

  try {
    if (!latest.bjdongCode) throw new Error("법정동 상세 코드를 찾지 못했습니다.");
    const url = new URL("http://apis.data.go.kr/1613000/HsPmsHubService/getHpBasisOulnInfo");
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("sigunguCd", lawdCode.slice(0, 5));
    url.searchParams.set("bjdongCd", latest.bjdongCode);
    url.searchParams.set("numOfRows", "9999");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("_type", "json");
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; ZipwiseDashboard/1.0)" } });
    if (response.status === 403) throw new Error("주택인허가 API 활용신청이 필요합니다.");
    if (!response.ok) throw new Error(`주택인허가 API 응답 오류 (${response.status})`);
    const data = await response.json();
    const rawItems = data?.response?.body?.items?.item;
    const items: Array<{ totHhldCnt?: string | number; useInsptDay?: string; useInsptSchedDay?: string; apprvDay?: string }> = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    const today = Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);
    const horizon = Number(`${now.getFullYear() + 2}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);
    const pipeline = items.filter((item) => {
      const completion = Number((item.useInsptSchedDay || item.useInsptDay || "0").replace(/-/g, ""));
      const approved = Number((item.apprvDay || "0").replace(/-/g, ""));
      return (completion >= today && completion <= horizon) || (!item.useInsptDay && approved > 0);
    });
    supplySignal = { households: pipeline.reduce((sum, item) => sum + Number(item.totHhldCnt || 0), 0), projectCount: pipeline.length };
  } catch (error) {
    supplySignal = { households: null, projectCount: 0, error: error instanceof Error ? error.message : "주택인허가 데이터를 불러오지 못했습니다." };
  }

  return {
    areaTypes,
    defaultAreaKey,
    monthLabels,
    supply: supplySignal,
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ apt?: string; address?: string; lawd?: string }> }) {
  const params = await searchParams;
  const address = params.address ?? "주소 정보 미등록";
  const lawdCode = params.apt && address !== "주소 정보 미등록" ? normalizeLawdCode(params.lawd ?? "") ?? undefined : undefined;
  const initialSelection = params.apt ? {
    apartmentName: params.apt,
    address,
    lawdCode,
  } : undefined;
  return <Dashboard loadRealEstateData={loadRealEstateData} initialSelection={initialSelection} />;
}
