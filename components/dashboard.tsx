"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Building2,
  Check, ChevronDown, CircleHelp, Landmark, MapPin, Menu, Plus, Search,
  Sparkles, TrendingUp, Users, X,
} from "lucide-react";
import { ListingsPanel, TrendChart, type MarketListing } from "@/components/trend-chart";
import { ChartSeries } from "@/components/chart-series";
import { openKakaoAddressSearch, type KakaoAddressSelection } from "@/lib/kakao-postcode";
import { type AreaTypeSnapshot, formatAreaTypeLabel } from "@/lib/area-type";

type Signal = { label: string; value: string; change: string; score: number; tone: "up" | "down" | "neutral"; icon: typeof Activity; note: string };
type SupplySignal = { households: number | null; projectCount: number; error?: string };
type RealEstateData = {
  areaTypes: AreaTypeSnapshot[];
  defaultAreaKey: number;
  monthLabels: string[];
  supply: SupplySignal;
};
type Apartment = {
  id: string;
  name: string;
  address: string;
  areaTypes: AreaTypeSnapshot[];
  defaultAreaKey: number;
  monthLabels: string[];
  supply: SupplySignal;
  isCustom?: boolean;
  dataSource?: "molit" | "sample";
  dataError?: string;
  lawdCode?: string;
};

const MONTH_LABELS = ["7월", "8월", "9월", "10월", "11월", "12월", "1월", "2월", "3월", "4월", "5월", "6월"];

function makeSampleArea(snapshot: Omit<AreaTypeSnapshot, "label">): AreaTypeSnapshot {
  return { ...snapshot, label: formatAreaTypeLabel(snapshot.areaKey) };
}

const apartments: Apartment[] = [
  {
    id: "acropo",
    name: "아크로리버파크",
    address: "서울 서초구 반포동",
    defaultAreaKey: 84,
    monthLabels: MONTH_LABELS,
    supply: { households: 1240, projectCount: 3 },
    dataSource: "sample",
    areaTypes: [
      makeSampleArea({
        areaKey: 59,
        transactionCount: 8,
        price: "29억 2,000만",
        delta: "+1.9%",
        score: 72,
        confidence: "보통",
        forecast: "완만한 상승",
        chart: [24.1, 24.4, 24.8, 24.6, 25.2, 25.8, 26.1, 26.5, 27.0, 27.8, 28.5, 29.2],
        volumeChart: [1, 1, 2, 1, 2, 2, 1, 2, 2, 2, 3, 2],
        rentRatioChart: [58.2, 58.5, 58.8, 59.0, 59.2, 59.4, 59.5, 59.6, 59.8, 59.9, 60.0, 60.1],
        listings: [
          { id: "ac-59-1", dealType: "매매", area: 59.8, floor: 7, priceLabel: "29억 2,000만", date: "2026. 05. 29" },
          { id: "ac-59-2", dealType: "전세", area: 59.5, floor: 12, priceLabel: "17억 5,000만", date: "2026. 05. 10" },
        ],
        area: "59.8㎡",
        signals: { transactionCount: 5, volumeChange: 25, latestDate: "2026. 05. 29", latestFloor: 7, totalCount: 8, rent: { ratio: 60.1, count: 3, latestDeposit: 175000 } },
      }),
      makeSampleArea({
        areaKey: 84,
        transactionCount: 18,
        price: "41억 8,000만",
        delta: "+2.7%",
        score: 78,
        confidence: "높음",
        forecast: "상승 우세",
        chart: [31.2, 31.6, 32.1, 31.9, 33.2, 34.4, 34.1, 35.7, 36.2, 38.1, 39.0, 41.8],
        volumeChart: [1, 2, 1, 2, 3, 2, 2, 3, 2, 4, 3, 5],
        rentRatioChart: [51.2, 51.8, 52.1, 52.4, 52.9, 53.1, 53.4, 53.8, 54.0, 54.1, 54.0, 54.2],
        listings: [
          { id: "ac-84-1", dealType: "매매", area: 84.9, floor: 18, priceLabel: "42억 5,000만", date: "2026. 06. 18" },
          { id: "ac-84-2", dealType: "전세", area: 84.2, floor: 11, priceLabel: "22억 8,000만", date: "2026. 06. 12" },
        ],
        area: "84.9㎡",
        signals: { transactionCount: 8, volumeChange: 38, latestDate: "2026. 06. 18", latestFloor: 18, totalCount: 18, rent: { ratio: 54.2, count: 6, latestDeposit: 228000 } },
      }),
      makeSampleArea({
        areaKey: 114,
        transactionCount: 6,
        price: "56억",
        delta: "+3.4%",
        score: 81,
        confidence: "보통",
        forecast: "상승 신호",
        chart: [48.2, 48.8, 49.5, 49.1, 50.4, 51.2, 51.8, 52.6, 53.4, 54.2, 55.1, 56.0],
        volumeChart: [0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
        rentRatioChart: [47.5, 47.8, 48.0, 48.2, 48.4, 48.6, 48.8, 49.0, 49.1, 49.2, 49.3, 49.4],
        listings: [
          { id: "ac-114-1", dealType: "매매", area: 114.5, floor: 22, priceLabel: "56억", date: "2026. 05. 21" },
          { id: "ac-114-2", dealType: "전세", area: 114.1, floor: 16, priceLabel: "27억 6,000만", date: "2026. 04. 28" },
        ],
        area: "114.5㎡",
        signals: { transactionCount: 3, volumeChange: 50, latestDate: "2026. 05. 21", latestFloor: 22, totalCount: 6, rent: { ratio: 49.4, count: 2, latestDeposit: 276000 } },
      }),
    ],
  },
  {
    id: "heliocity",
    name: "헬리오시티",
    address: "서울 송파구 가락동",
    defaultAreaKey: 84,
    monthLabels: MONTH_LABELS,
    supply: { households: 2890, projectCount: 5 },
    dataSource: "sample",
    areaTypes: [
      makeSampleArea({
        areaKey: 59,
        transactionCount: 24,
        price: "17억 2,000만",
        delta: "+1.1%",
        score: 68,
        confidence: "보통",
        forecast: "완만한 상승",
        chart: [15.2, 15.4, 15.6, 15.5, 15.8, 16.0, 16.1, 16.3, 16.5, 16.8, 17.0, 17.2],
        volumeChart: [3, 4, 3, 5, 4, 6, 5, 6, 5, 7, 6, 8],
        rentRatioChart: [62.1, 62.3, 62.5, 62.6, 62.8, 62.9, 63.0, 63.1, 63.2, 63.3, 63.4, 63.5],
        listings: [
          { id: "he-59-1", dealType: "매매", area: 59.9, floor: 6, priceLabel: "17억 2,000만", date: "2026. 05. 30" },
        ],
        area: "59.9㎡",
        signals: { transactionCount: 12, volumeChange: 15, latestDate: "2026. 05. 30", latestFloor: 6, totalCount: 24, rent: { ratio: 63.5, count: 8, latestDeposit: 109000 } },
      }),
      makeSampleArea({
        areaKey: 84,
        transactionCount: 32,
        price: "23억 5,000만",
        delta: "+1.4%",
        score: 71,
        confidence: "보통",
        forecast: "완만한 상승",
        chart: [19.6, 20.1, 20.3, 20.0, 20.8, 21.2, 20.9, 21.4, 21.8, 22.1, 22.9, 23.5],
        volumeChart: [4, 5, 3, 6, 5, 7, 6, 8, 7, 9, 8, 10],
        rentRatioChart: [56.2, 56.5, 56.8, 57.0, 57.1, 57.3, 57.4, 57.5, 57.6, 57.7, 57.7, 57.8],
        listings: [
          { id: "he-84-1", dealType: "매매", area: 84.7, floor: 9, priceLabel: "23억 8,000만", date: "2026. 06. 16" },
          { id: "he-84-2", dealType: "전세", area: 84.1, floor: 14, priceLabel: "13억 5,000만", date: "2026. 06. 08" },
        ],
        area: "84.7㎡",
        signals: { transactionCount: 14, volumeChange: 19, latestDate: "2026. 06. 16", latestFloor: 9, totalCount: 32, rent: { ratio: 57.8, count: 11, latestDeposit: 135000 } },
      }),
    ],
  },
  {
    id: "raemian",
    name: "래미안 원베일리",
    address: "서울 서초구 반포동",
    defaultAreaKey: 84,
    monthLabels: MONTH_LABELS,
    supply: { households: 980, projectCount: 2 },
    dataSource: "sample",
    areaTypes: [
      makeSampleArea({
        areaKey: 84,
        transactionCount: 14,
        price: "44억 2,000만",
        delta: "+3.2%",
        score: 83,
        confidence: "높음",
        forecast: "상승 신호 강함",
        chart: [35.2, 35.8, 36.1, 36.8, 37.4, 38.0, 39.1, 39.7, 40.8, 41.2, 42.8, 44.2],
        volumeChart: [2, 2, 3, 2, 3, 4, 3, 4, 5, 4, 6, 5],
        rentRatioChart: [49.8, 50.1, 50.4, 50.6, 50.9, 51.0, 51.2, 51.3, 51.4, 51.5, 51.5, 51.6],
        listings: [
          { id: "ra-84-1", dealType: "매매", area: 84.6, floor: 20, priceLabel: "44억 5,000만", date: "2026. 06. 20" },
          { id: "ra-84-2", dealType: "전세", area: 84.3, floor: 15, priceLabel: "23억", date: "2026. 06. 11" },
        ],
        area: "84.6㎡",
        signals: { transactionCount: 7, volumeChange: 55, latestDate: "2026. 06. 20", latestFloor: 20, totalCount: 14, rent: { ratio: 51.6, count: 4, latestDeposit: 230000 } },
      }),
      makeSampleArea({
        areaKey: 101,
        transactionCount: 5,
        price: "52억 3,000만",
        delta: "+2.8%",
        score: 80,
        confidence: "보통",
        forecast: "상승 우세",
        chart: [46.8, 47.2, 47.6, 48.0, 48.5, 49.0, 49.6, 50.2, 50.8, 51.2, 51.8, 52.3],
        volumeChart: [0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
        rentRatioChart: [48.2, 48.4, 48.6, 48.7, 48.9, 49.0, 49.1, 49.2, 49.3, 49.4, 49.5, 49.6],
        listings: [
          { id: "ra-101-1", dealType: "매매", area: 101.2, floor: 17, priceLabel: "52억 3,000만", date: "2026. 05. 27" },
        ],
        area: "101.2㎡",
        signals: { transactionCount: 2, volumeChange: 40, latestDate: "2026. 05. 27", latestFloor: 17, totalCount: 5, rent: { ratio: 49.6, count: 1, latestDeposit: 259000 } },
      }),
    ],
  },
];

const PENDING_SIGNALS: Signal[] = [
  { label: "거래량", value: "—", change: "—", score: 0, tone: "neutral", icon: Activity, note: "실거래 데이터 연결이 필요해요." },
  { label: "최근 거래일", value: "—", change: "—", score: 0, tone: "neutral", icon: Building2, note: "실거래 데이터 연결이 필요해요." },
  { label: "전세가율", value: "—", change: "—", score: 0, tone: "neutral", icon: Users, note: "전월세 데이터 연결이 필요해요." },
  { label: "주변 입주 물량", value: "—", change: "—", score: 0, tone: "neutral", icon: Landmark, note: "공급 데이터 연결이 필요해요." },
];

function buildSignals(area: AreaTypeSnapshot, supply: SupplySignal, dataSource?: Apartment["dataSource"]): Signal[] {
  const volumeTone = area.signals.volumeChange > 0 ? "up" : area.signals.volumeChange < 0 ? "down" : "neutral";
  const rentRatio = area.signals.rent.ratio;
  const supplyHouseholds = supply.households;
  const volumeLabel = dataSource === "molit" ? "최근 3개월 거래량" : "거래량";
  return [
    {
      label: volumeLabel,
      value: `${area.signals.transactionCount}건`,
      change: `${area.signals.volumeChange >= 0 ? "+" : ""}${area.signals.volumeChange.toFixed(0)}%`,
      score: Math.min(100, area.signals.transactionCount * 10),
      tone: volumeTone,
      icon: Activity,
      note: dataSource === "molit"
        ? `최근 12개월 총 ${area.signals.totalCount}건이 신고됐어요.`
        : "3개월 평균 대비 거래 흐름을 반영했어요.",
    },
    {
      label: dataSource === "molit" ? "최근 거래일" : "매물 소진 속도",
      value: dataSource === "molit" ? area.signals.latestDate : dataSource === "sample" ? "21일" : area.signals.latestDate,
      change: dataSource === "molit" ? "실거래" : dataSource === "sample" ? "-9일" : "—",
      score: dataSource === "sample" ? 84 : 100,
      tone: dataSource === "sample" ? "up" : "neutral",
      icon: Building2,
      note: dataSource === "molit"
        ? `${area.signals.latestFloor}층 · 전용 ${area.area} 거래예요.`
        : dataSource === "sample"
          ? "등록 매물이 이전보다 빠르게 거래되고 있어요."
          : "실거래 데이터 연결이 필요해요.",
    },
    {
      label: "전세가율",
      value: rentRatio === null ? "—" : `${rentRatio}%`,
      change: rentRatio === null ? "권한 필요" : `${area.signals.rent.count}건 기준`,
      score: rentRatio ?? 0,
      tone: rentRatio !== null && rentRatio >= 50 ? "up" : "neutral",
      icon: Users,
      note: area.signals.rent.error
        || (area.signals.rent.latestDeposit
          ? `유사 면적 최근 전세 보증금 ${area.signals.rent.latestDeposit.toLocaleString("ko-KR")}만원을 반영했어요.`
          : "비교 가능한 전세 거래가 없어요."),
    },
    {
      label: "향후 2년 입주 물량",
      value: supplyHouseholds === null ? "—" : `${supplyHouseholds.toLocaleString("ko-KR")}세대`,
      change: supplyHouseholds === null ? "권한 필요" : `${supply.projectCount}개 사업`,
      score: supplyHouseholds === null ? 0 : Math.min(100, Math.round(supplyHouseholds / 20)),
      tone: supplyHouseholds !== null && supplyHouseholds > 1000 ? "down" : supplyHouseholds !== null && supplyHouseholds < 1200 ? "up" : "neutral",
      icon: Landmark,
      note: supply.error || "같은 법정동의 인허가·사용검사 예정 자료를 집계했어요.",
    },
  ];
}

function resolveActiveArea(apartment: Apartment, selectedAreaKey: number): AreaTypeSnapshot | null {
  if (!apartment.areaTypes.length) return null;
  return apartment.areaTypes.find((item) => item.areaKey === selectedAreaKey)
    ?? apartment.areaTypes.find((item) => item.areaKey === apartment.defaultAreaKey)
    ?? apartment.areaTypes[0]
    ?? null;
}

function createPendingApartment(name: string, address: string, lawdCode?: string): Apartment {
  return {
    id: `custom-${encodeURIComponent(name)}-${lawdCode || "manual"}`,
    name,
    address,
    areaTypes: [],
    defaultAreaKey: 0,
    monthLabels: MONTH_LABELS,
    supply: { households: null, projectCount: 0 },
    isCustom: true,
    lawdCode,
  };
}

function PriceChart({ values, labels }: { values: number[]; labels: string[] }) {
  return (
    <ChartSeries
      values={values}
      labels={labels}
      variant="line"
      unit="억"
      color="#2f67ed"
      gradientId="price-area"
      ariaLabel="최근 1년 실거래가 추이"
    />
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 46;
  return <div className="score-ring"><svg viewBox="0 0 108 108"><circle cx="54" cy="54" r="46" className="ring-bg"/><circle cx="54" cy="54" r="46" className="ring-value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} /></svg><div><strong>{score}</strong><span>/100</span></div></div>;
}

function SignalCard({ signal }: { signal: Signal }) {
  const Icon = signal.icon;
  const TrendIcon = signal.tone === "up" ? ArrowUpRight : signal.tone === "down" ? ArrowDownRight : ArrowRight;
  return <article className="signal-card"><div className="signal-top"><span className={`signal-icon ${signal.tone}`}><Icon size={18}/></span><span className={`signal-change ${signal.tone}`}><TrendIcon size={14}/>{signal.change}</span></div><p>{signal.label}</p><strong>{signal.value}</strong><div className="signal-meter"><i style={{ width: `${signal.score}%` }}/></div><small>{signal.note}</small></article>;
}

function AreaTypeTabs({
  areaTypes,
  selectedAreaKey,
  onSelect,
}: {
  areaTypes: AreaTypeSnapshot[];
  selectedAreaKey: number;
  onSelect: (areaKey: number) => void;
}) {
  if (areaTypes.length <= 1) return null;
  return (
    <section className="area-type-section" aria-label="평형 선택">
      <div className="area-type-tabs" role="tablist">
        {areaTypes.map((area) => (
          <button
            key={area.areaKey}
            type="button"
            role="tab"
            aria-selected={selectedAreaKey === area.areaKey}
            className={selectedAreaKey === area.areaKey ? "active" : undefined}
            onClick={() => onSelect(area.areaKey)}
          >
            <span>{area.label}</span>
            <small>{area.transactionCount}건 · {area.price}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Dashboard({ loadRealEstateData, initialSelection }: { loadRealEstateData: (query: { apartmentName: string; lawdCode: string }) => Promise<RealEstateData>; initialSelection?: { apartmentName: string; address: string; lawdCode?: string } }) {
  const restoredApartment = initialSelection ? apartments.find((item) => item.name === initialSelection.apartmentName) ?? createPendingApartment(initialSelection.apartmentName, initialSelection.address, initialSelection.lawdCode) : apartments[0];
  const [apartmentOptions, setApartmentOptions] = useState(() => apartments.some((item) => item.id === restoredApartment.id) ? apartments : [...apartments, restoredApartment]);
  const [selectedId, setSelectedId] = useState(restoredApartment.id);
  const [selectedAreaKey, setSelectedAreaKey] = useState(restoredApartment.defaultAreaKey);
  const [searchQuery, setSearchQuery] = useState(restoredApartment.name);
  const [selectedAddress, setSelectedAddress] = useState<KakaoAddressSelection | null>(() => {
    if (initialSelection?.lawdCode && initialSelection.address !== "주소 정보 미등록") {
      return {
        displayAddress: initialSelection.address,
        lawdCode: initialSelection.lawdCode,
        buildingName: initialSelection.apartmentName,
        zonecode: "",
        bcode: `${initialSelection.lawdCode}00000`,
      };
    }
    return null;
  });
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [isOpeningAddressSearch, setIsOpeningAddressSearch] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [loadingApartmentId, setLoadingApartmentId] = useState<string | null>(null);
  const [alerted, setAlerted] = useState(false);
  const [detailPanel, setDetailPanel] = useState<"analysis" | null>(null);
  const apartment = apartmentOptions.find((item) => item.id === selectedId) ?? apartmentOptions[0];
  const activeArea = resolveActiveArea(apartment, selectedAreaKey);
  const displaySignals = activeArea ? buildSignals(activeArea, apartment.supply, apartment.dataSource) : PENDING_SIGNALS;
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko");
  const matchingApartments = apartmentOptions.filter((item) => {
    if (!normalizedQuery || searchQuery === apartment.name) return true;
    return `${item.name} ${item.address}`.toLocaleLowerCase("ko").includes(normalizedQuery);
  });
  const hasExactMatch = apartmentOptions.some((item) => item.name.toLocaleLowerCase("ko") === normalizedQuery);
  const isLoading = loadingApartmentId === apartment.id;
  const isPending = apartment.isCustom && !activeArea;

  useEffect(() => {
    if (!detailPanel) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDetailPanel(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailPanel]);

  const updateUrl = (item: Apartment) => {
    const url = new URL(window.location.href);
    url.searchParams.set("apt", item.name);
    url.searchParams.set("address", item.address);
    if (item.lawdCode) url.searchParams.set("lawd", item.lawdCode);
    else url.searchParams.delete("lawd");
    window.history.replaceState({}, "", url);
  };

  const selectApartment = (item: Apartment) => {
    setSelectedId(item.id);
    setSelectedAreaKey(item.defaultAreaKey);
    setSearchQuery(item.name);
    setSelectedAddress(
      item.lawdCode && item.address !== "주소 정보 미등록"
        ? {
            displayAddress: item.address,
            lawdCode: item.lawdCode,
            buildingName: item.name,
            zonecode: "",
            bcode: `${item.lawdCode}00000`,
          }
        : null,
    );
    setAddressSearchError(null);
    setIsAutocompleteOpen(false);
    updateUrl(item);
  };

  const hydrateApartment = useCallback(async (id: string, name: string, lawdCode: string) => {
    setLoadingApartmentId(id);
    try {
      const data = await loadRealEstateData({ apartmentName: name, lawdCode });
      setSelectedAreaKey(data.defaultAreaKey);
      setApartmentOptions((current) => current.map((item) => item.id === id ? {
        ...item,
        areaTypes: data.areaTypes,
        defaultAreaKey: data.defaultAreaKey,
        monthLabels: data.monthLabels,
        supply: data.supply,
        isCustom: false,
        dataSource: "molit",
        dataError: undefined,
      } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "실거래가를 불러오지 못했습니다.";
      setApartmentOptions((current) => current.map((item) => item.id === id ? { ...item, dataError: message } : item));
    } finally {
      setLoadingApartmentId(null);
    }
  }, [loadRealEstateData]);

  useEffect(() => {
    updateUrl(restoredApartment);
    if (restoredApartment.isCustom && restoredApartment.lawdCode) {
      void hydrateApartment(restoredApartment.id, restoredApartment.name, restoredApartment.lawdCode);
    }
  }, [hydrateApartment, restoredApartment.id, restoredApartment.isCustom, restoredApartment.lawdCode, restoredApartment.name]);

  const addCustomApartment = (verifiedName?: string, verifiedAddress?: string, lawdCode?: string) => {
    const name = verifiedName?.trim() || searchQuery.trim();
    if (!name) return;
    const existing = apartmentOptions.find((item) => item.name.toLocaleLowerCase("ko") === name.toLocaleLowerCase("ko") && (!verifiedAddress || item.address === verifiedAddress));
    if (existing) {
      const updatedApartment = { ...existing, address: verifiedAddress || existing.address, lawdCode: lawdCode || existing.lawdCode, isCustom: lawdCode ? true : existing.isCustom, dataError: undefined };
      setApartmentOptions((current) => current.map((item) => item.id === existing.id ? updatedApartment : item));
      selectApartment(updatedApartment);
      if (lawdCode) void hydrateApartment(updatedApartment.id, name, lawdCode);
      return;
    }
    const customApartment = createPendingApartment(name, verifiedAddress || "주소 정보 미등록", lawdCode);
    setApartmentOptions((current) => [...current, customApartment]);
    selectApartment(customApartment);
    if (lawdCode) void hydrateApartment(customApartment.id, name, lawdCode);
  };

  const openAddressSearch = async () => {
    setIsOpeningAddressSearch(true);
    setAddressSearchError(null);
    try {
      const selection = await openKakaoAddressSearch();
      setSelectedAddress(selection);
      if (selection.buildingName) setSearchQuery((current) => current.trim() || selection.buildingName);
    } catch (error) {
      if (error instanceof Error && error.message !== "ADDRESS_SEARCH_CANCELLED") {
        setAddressSearchError(error.message);
      }
    } finally {
      setIsOpeningAddressSearch(false);
    }
  };

  const submitCustomApartment = () => {
    if (!searchQuery.trim()) {
      setAddressSearchError("아파트명을 입력해 주세요.");
      return;
    }
    if (!selectedAddress) {
      setAddressSearchError("카카오 주소 검색으로 주소를 선택해 주세요.");
      return;
    }
    setAddressSearchError(null);
    addCustomApartment(searchQuery, selectedAddress.displayAddress, selectedAddress.lawdCode);
  };

  const directApartmentForm = normalizedQuery && (!hasExactMatch || apartment.isCustom) ? (
    <div className="autocomplete-direct single">
      <strong><Plus size={16}/>{hasExactMatch ? "주소 수정" : "새 아파트 등록"}</strong>
      <label>
        아파트명
        <input
          value={searchQuery}
          placeholder="예: 아크로리버파크"
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setAddressSearchError(null);
          }}
        />
      </label>
      <div className="address-search-row">
        <button type="button" className="address-search-button" disabled={isOpeningAddressSearch} onClick={openAddressSearch}>
          <MapPin size={15}/>
          {isOpeningAddressSearch ? "주소 검색 여는 중..." : "카카오 주소 검색"}
        </button>
      </div>
      {selectedAddress ? (
        <div className="address-preview">
          <b>{selectedAddress.displayAddress}</b>
          <small>우편번호 {selectedAddress.zonecode || "—"} · 법정동 코드 {selectedAddress.lawdCode}</small>
        </div>
      ) : (
        <small className="address-help">주소 검색으로 도로명 주소와 법정동 코드를 자동으로 입력합니다.</small>
      )}
      {addressSearchError ? <p className="address-error">{addressSearchError}</p> : null}
      <div className="autocomplete-actions">
        <button type="button" disabled={!searchQuery.trim() || !selectedAddress || isOpeningAddressSearch} onClick={submitCustomApartment}>
          {hasExactMatch ? "주소 저장" : "분석 시작"}
        </button>
      </div>
    </div>
  ) : null;

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span><TrendingUp size={19}/></span>집값신호</a><nav><a className="active" href="#overview">대시보드</a><a href="#signals">상승 신호</a><a href="#method">분석 기준</a></nav><div className="header-actions"><button className="icon-button" aria-label="알림"><Bell size={19}/><i/></button><button className="account"><span>김</span><b>김키원</b><ChevronDown size={15}/></button><button className="mobile-menu" aria-label="메뉴"><Menu/></button></div></header>
    <main>
      <section className="welcome" id="overview"><div><span className="eyebrow"><Sparkles size={14}/>오늘의 시장 시그널</span><h1>이 아파트, 오를 가능성이<br className="mobile-only"/> 얼마나 될까요?</h1><p>공개된 시장 데이터를 조합해 가격 상승 징후를 한눈에 보여드려요.</p></div><div className="updated"><span></span>{apartment.dataSource === "molit" ? "국토교통부 실거래 신고 자료" : "샘플 데이터 기준 2026. 06. 22"}</div></section>

      <section className="search-panel"><div className="select-field"><label htmlFor="apartment-search">분석할 아파트</label><div className="autocomplete" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsAutocompleteOpen(false); }}><div className="autocomplete-input"><Search size={19}/><input id="apartment-search" role="combobox" aria-autocomplete="list" aria-expanded={isAutocompleteOpen} aria-controls="apartment-options" value={searchQuery} placeholder="아파트명 또는 지역 검색" onFocus={() => setIsAutocompleteOpen(true)} onChange={(event) => { setSearchQuery(event.target.value); setIsAutocompleteOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") setIsAutocompleteOpen(false); if (event.key === "Enter" && matchingApartments[0]) { event.preventDefault(); selectApartment(matchingApartments[0]); } }}/><ChevronDown size={18}/></div>{isAutocompleteOpen ? <div className="autocomplete-popup" id="apartment-options" role="listbox">{matchingApartments.map((item) => <button key={item.id} type="button" role="option" aria-selected={item.id === selectedId} className="autocomplete-option" onClick={() => selectApartment(item)}><span>{item.name}<small>{item.address}</small></span>{item.id === selectedId ? <Check size={16}/> : null}</button>)}{directApartmentForm}{!matchingApartments.length && !normalizedQuery ? <p className="autocomplete-empty">아파트명을 입력해 주세요.</p> : null}</div> : null}</div></div><div className="property-meta"><span><MapPin size={15}/>{apartment.address}</span><i/><span>전용 {activeArea?.area ?? "—"}</span><button onClick={() => { setSearchQuery(apartment.name); setIsAutocompleteOpen(true); }}>조건 변경</button></div></section>

      <AreaTypeTabs
        areaTypes={apartment.areaTypes}
        selectedAreaKey={selectedAreaKey}
        onSelect={setSelectedAreaKey}
      />

      <section className="summary-grid">
        <article className="forecast-card"><div className="card-heading"><span>{apartment.dataSource === "molit" ? "실거래 흐름 점수" : "AI 상승 가능성"}</span><button aria-label="산정 기준 도움말"><CircleHelp size={17}/></button></div><div className="forecast-body"><ScoreRing score={activeArea?.score ?? 0}/><div className="forecast-copy"><span className="status"><TrendingUp size={15}/>{activeArea?.forecast ?? "분석 대기"}</span><h2>{apartment.dataSource === "molit" ? "최근 12개월" : "향후 6개월"}<br/><em>{isPending ? "실거래 데이터를 불러오는 중이에요" : apartment.dataSource === "molit" ? "신고 가격 흐름을 반영했어요" : (activeArea?.score ?? 0) >= 80 ? "상승 가능성이 높아요" : "상승 가능성이 우세해요"}</em></h2><p>신뢰도 <b>{activeArea?.confidence ?? "대기"}</b> · {isPending ? "분석 데이터 대기 중" : apartment.dataSource === "molit" ? "국토교통부 신고 자료 기반" : "12개 핵심 지표 분석"}</p></div></div><div className="summary-note"><Sparkles size={16}/><p><b>핵심 요약</b> {isPending ? "선택한 단지의 최근 12개월 실거래가를 조회하고 있어요." : apartment.dataSource === "molit" ? `${activeArea?.label ?? "선택 평형"} 기준으로 매매 실거래가와 거래량을 계산하고, 전세가율과 향후 입주 물량은 보조 지표로 함께 표시합니다.` : "거래 회복과 매물 감소가 동시에 나타나고 있어요. 다만 금리와 주변 공급 계획은 계속 확인하세요."}</p></div></article>
        <article className="price-card"><div className="price-head"><div><span>최근 실거래가 {activeArea ? `· ${activeArea.label}` : ""}</span><h2>{isPending ? (isLoading ? "실거래 조회 중" : "데이터 연결 전") : activeArea?.price}{isPending ? "" : "원"}</h2>{isPending ? <p>{isLoading ? "국토교통부 자료 조회 중이에요." : apartment.dataError || "아직 연결된 실거래가 없어요."}</p> : <p><b><ArrowUpRight size={14}/>{activeArea?.delta}</b> 12개월 첫 거래 대비</p>}</div>{isPending ? null : <Tabs.Root defaultValue="1y"><Tabs.List className="period-tabs"><Tabs.Tab value="3m">3개월</Tabs.Tab><Tabs.Tab value="1y">1년</Tabs.Tab><Tabs.Tab value="3y">3년</Tabs.Tab><Tabs.Indicator/></Tabs.List></Tabs.Root>}</div>{isPending ? <div className="chart-empty"><Building2 size={26}/><b>{isLoading ? "실거래가 조회 중" : "실거래 데이터를 연결하지 못했어요"}</b><span>{apartment.dataError || "공공데이터 API 설정을 확인해 주세요."}</span></div> : <PriceChart values={activeArea?.chart ?? []} labels={apartment.monthLabels}/>}</article>
      </section>

      <section className="trends-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">TRENDS</span>
            <h2>거래량 · 전세가율 추이</h2>
            <p>{activeArea ? `${activeArea.label} 기준 최근 12개월 월별 흐름입니다.` : "최근 12개월 월별 흐름을 확인해 보세요."}</p>
          </div>
        </div>
        <div className="trends-grid">
          <article className="trend-card">
            <div className="card-heading"><span>월별 거래량</span><b>{activeArea?.volumeChart.at(-1) ?? 0}건</b></div>
            {isPending ? (
              <div className="chart-empty chart-empty--compact"><Activity size={24}/><b>{isLoading ? "거래량 조회 중" : "거래량 데이터 없음"}</b></div>
            ) : (
              <TrendChart
                values={activeArea?.volumeChart ?? []}
                labels={apartment.monthLabels}
                variant="bar"
                unit="건"
                color="#3167ed"
                gradientId={`volume-${apartment.id}-${selectedAreaKey}`}
                ariaLabel="최근 12개월 거래량 추이"
              />
            )}
          </article>
          <article className="trend-card">
            <div className="card-heading"><span>월별 전세가율</span><b>{activeArea?.rentRatioChart.at(-1) ? `${activeArea.rentRatioChart.at(-1)}%` : "—"}</b></div>
            {isPending ? (
              <div className="chart-empty chart-empty--compact"><Users size={24}/><b>{isLoading ? "전세가율 조회 중" : "전세가율 데이터 없음"}</b></div>
            ) : (
              <TrendChart
                values={activeArea?.rentRatioChart ?? []}
                labels={apartment.monthLabels}
                variant="line"
                unit="%"
                color="#0c9b69"
                gradientId={`rent-${apartment.id}-${selectedAreaKey}`}
                ariaLabel="최근 12개월 전세가율 추이"
              />
            )}
          </article>
        </div>
      </section>

      <section className="listings-section" id="listings">
        <div className="section-head">
          <div>
            <span className="eyebrow">LISTINGS</span>
            <h2>현재 매물 · 최근 거래</h2>
            <p>{apartment.dataSource === "molit" ? `${activeArea?.label ?? "선택 평형"} · 최근 6개월 신고 거래를 매물 참고 정보로 보여드려요.` : `${activeArea?.label ?? "선택 평형"} · 단지 내 등록 매물 샘플입니다.`}</p>
          </div>
        </div>
        <article className="listings-card">
          <ListingsPanel listings={activeArea?.listings ?? []} dataSource={apartment.dataSource} />
        </article>
      </section>

      <section className="signals-section" id="signals"><div className="section-head"><div><span className="eyebrow">MARKET SIGNALS</span><h2>집값이 오르기 전 나타나는 신호</h2><p>{activeArea ? `${activeArea.label} 기준으로 감지된 주요 선행 지표예요.` : "현재 단지에서 감지된 주요 선행 지표예요."}</p></div><button className={alerted ? "alert-button active" : "alert-button"} onClick={() => setAlerted((value) => !value)}>{alerted ? <Check size={17}/> : <Bell size={17}/>} {alerted ? "알림 설정됨" : "변화 알림 받기"}</button></div><div className="signals-grid">{displaySignals.map((signal) => <SignalCard key={signal.label} signal={signal}/>)}</div></section>

      <section className="insight-section" id="method"><article className="insight-card"><div className="insight-title"><span><Sparkles size={19}/></span><div><small>{apartment.dataSource === "molit" ? "실거래 데이터 인사이트" : "이번 주 AI 인사이트"}</small><h3>{apartment.dataSource === "molit" ? `${activeArea?.forecast ?? "흐름"}이 관찰돼요` : "매수세가 실수요 중심으로 전환되고 있어요"}</h3></div></div><p>{apartment.dataSource === "molit" ? `${activeArea?.label ?? "선택 평형"} 기준 최근 12개월 신고가와 최근 3개월 거래량으로 흐름 점수 ${activeArea?.score ?? 0}점, 신뢰도 ${activeArea?.confidence ?? "—"}으로 계산됐어요.` : "거래량은 늘었지만 급매물 위주가 아닌 중간 가격대 거래가 확산되는 중이에요. 전세 계약 갱신률도 높아 단기 투기 수요보다 거주 수요가 시장을 지지하는 흐름으로 분석됩니다."}</p><button onClick={() => setDetailPanel("analysis")}>상세 분석 보기 <ArrowRight size={16}/></button></article><div className="micro-stats"><article><span><Landmark size={18}/></span><div><small>기준금리</small><b>2.50%</b></div><em className="neutral">보합</em></article></div></section>
    </main>
    <footer><div><a className="brand" href="#"><span><TrendingUp size={17}/></span>집값신호</a><p>데이터로 더 현명한 주거 결정을 돕습니다.</p></div><p>본 서비스의 분석 결과는 투자 권유가 아니며, 실제 가격을 보장하지 않습니다.<br/>직접 검색한 단지는 국토교통부 신고 자료를 사용합니다.</p></footer>
    {detailPanel ? <div className="detail-backdrop" onMouseDown={() => setDetailPanel(null)}><section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}><header><div><small>{apartment.name}{activeArea ? ` · ${activeArea.label}` : ""}</small><h2 id="detail-title">상세 분석</h2></div><button type="button" onClick={() => setDetailPanel(null)} aria-label="닫기"><X size={19}/></button></header>
      <div className="analysis-detail"><div className="detail-metrics"><span><small>흐름 점수</small><b>{activeArea?.score ?? 0}점</b></span><span><small>최근 실거래가</small><b>{activeArea?.price ?? "—"}{isPending ? "" : "원"}</b></span><span><small>가격 변화</small><b>{activeArea?.delta ?? "—"}</b></span></div><h3>판단 근거</h3><ul>{displaySignals.map((signal) => <li key={signal.label}><b>{signal.label} · {signal.value}</b><span>{signal.note}</span></li>)}</ul><div className="detail-notice">{apartment.dataSource === "molit" ? "흐름 점수는 선택 평형의 최근 12개월 매매 신고가와 거래량으로 계산합니다. 전세가율과 입주 물량은 보조 지표이며 현재 점수에는 포함되지 않습니다." : "현재 선택한 기본 단지는 프로토타입 샘플 데이터로 분석됩니다."}</div></div>
    </section></div> : null}
    {alerted ? <div className="toast"><Check size={16}/><span>가격 신호가 바뀌면 알려드릴게요.</span><button onClick={() => setAlerted(false)} aria-label="닫기"><X size={16}/></button></div> : null}
  </div>;
}
