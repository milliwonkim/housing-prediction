# housing-prediction

아파트 실거래가·전월세·거래량 데이터를 기반으로 집값 흐름을 분석하는 Next.js 대시보드입니다.

## 로컬 실행

```bash
pnpm install
pnpm dev
```

## 환경 변수

`.env.local`에 아래 값을 설정하세요.

```
MOLIT_SERVICE_KEY=공공데이터포털_서비스키
```

## 배포

Vercel에 연결 후 `MOLIT_SERVICE_KEY`를 프로젝트 환경 변수로 등록하면 됩니다.
