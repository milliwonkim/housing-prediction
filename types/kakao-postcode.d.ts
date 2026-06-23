interface DaumPostcodeData {
  address: string;
  addressType: "R" | "J";
  bcode: string;
  buildingName: string;
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeData) => void;
  onclose?: (state: "FORCE_CLOSE" | "COMPLETE") => void;
  width?: string | number;
  height?: string | number;
}

interface DaumPostcodeConstructor {
  new (options: DaumPostcodeOptions): { open: () => void; embed: (element: HTMLElement) => void };
}

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcodeConstructor;
    };
  }
}

export {};
