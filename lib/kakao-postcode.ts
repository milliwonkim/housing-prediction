import { lawdCodeFromBcode } from "@/lib/lawd-code";

type DaumPostcodeData = {
  address: string;
  bcode: string;
  buildingName: string;
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
};

export type KakaoAddressSelection = {
  displayAddress: string;
  lawdCode: string;
  buildingName: string;
  zonecode: string;
  bcode: string;
};

const POSTCODE_SCRIPT_SRC = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let scriptPromise: Promise<void> | null = null;

function loadKakaoPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("브라우저 환경에서만 주소 검색을 사용할 수 있습니다."));
  if (window.daum?.Postcode) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${POSTCODE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("카카오 주소 검색 스크립트를 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("카카오 주소 검색 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function toKakaoAddressSelection(data: DaumPostcodeData): KakaoAddressSelection {
  const lawdCode = lawdCodeFromBcode(data.bcode);
  if (!lawdCode) throw new Error("선택한 주소에서 시군구 코드를 확인하지 못했습니다.");

  return {
    displayAddress: data.roadAddress || data.jibunAddress || data.address,
    lawdCode,
    buildingName: data.buildingName.trim(),
    zonecode: data.zonecode,
    bcode: data.bcode,
  };
}

export async function openKakaoAddressSearch(): Promise<KakaoAddressSelection> {
  await loadKakaoPostcodeScript();

  if (!window.daum?.Postcode) {
    throw new Error("카카오 주소 검색을 초기화하지 못했습니다.");
  }

  const Postcode = window.daum.Postcode;

  return new Promise((resolve, reject) => {
    let settled = false;

    new Postcode({
      oncomplete: (data) => {
        settled = true;
        try {
          resolve(toKakaoAddressSelection(data));
        } catch (error) {
          reject(error instanceof Error ? error : new Error("주소 정보를 처리하지 못했습니다."));
        }
      },
      onclose: () => {
        if (!settled) reject(new Error("ADDRESS_SEARCH_CANCELLED"));
      },
    }).open();
  });
}
