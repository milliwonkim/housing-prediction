"use client";

import {
  BarChart3, CalendarDays, CircleHelp, Flag, Percent, Sparkles, Target, TrendingDown, TrendingUp,
} from "lucide-react";
import type { PredictionSummary, StatEvidence } from "@/lib/prediction-summary";

type PredictionSummaryCardProps = {
  apartmentName: string;
  areaLabel: string;
  prediction: PredictionSummary | null;
  isPending?: boolean;
  isLoading?: boolean;
  dataSource?: "molit" | "sample";
};

function StatRow({ stat }: { stat: StatEvidence }) {
  return (
    <article className={`prediction-stat prediction-stat--${stat.impact}`}>
      <div className="prediction-stat__top">
        <span>{stat.label}</span>
        <b>{stat.value}</b>
      </div>
      <div className="prediction-stat__meter" aria-hidden="true">
        <i style={{ width: `${stat.weight}%` }} />
      </div>
      <small>{stat.note}</small>
    </article>
  );
}

export function PredictionSummaryCard({
  apartmentName,
  areaLabel,
  prediction,
  isPending = false,
  isLoading = false,
  dataSource,
}: PredictionSummaryCardProps) {
  if (isPending) {
    return (
      <section className="prediction-summary prediction-summary--pending" aria-label="가격 예측 요약">
        <div className="prediction-summary__head">
          <span className="eyebrow"><Sparkles size={14}/>PREDICTION</span>
          <span className="prediction-summary__badge">분석 중</span>
        </div>
        <h2 className="prediction-summary__title">
          {isLoading ? "실거래 데이터를 분석하고 있어요" : "아파트를 선택하면 예측 요약이 표시돼요"}
        </h2>
        <p className="prediction-summary__desc">
          {isLoading
            ? "통계 근거와 신고가 돌파 시점을 계산 중입니다."
            : "카카오 주소 검색으로 단지를 등록하면 예측 요약을 볼 수 있어요."}
        </p>
      </section>
    );
  }

  if (!prediction) return null;

  const DirectionIcon = prediction.direction === "하락" ? TrendingDown : TrendingUp;
  const toneClass =
    prediction.direction === "상승" ? "up" :
    prediction.direction === "하락" ? "down" : "neutral";

  const breakthroughTone =
    prediction.breakthrough.status === "unlikely" ? "down" :
    prediction.breakthrough.status === "already_broken" ? "up" : "neutral";

  return (
    <section className={`prediction-summary prediction-summary--${toneClass}`} aria-label="가격 예측 요약">
      <div className="prediction-summary__head">
        <span className="eyebrow"><Sparkles size={14}/>PREDICTION</span>
        <span className={`prediction-summary__badge ${toneClass}`}>
          <DirectionIcon size={14}/>
          {prediction.direction} 전망
        </span>
      </div>

      <h2 className="prediction-summary__title">
        <em>{apartmentName}</em> {areaLabel}은(는)<br/>
        <strong>{prediction.targetPeriodLabel}경</strong>{" "}
        <strong className="prediction-summary__price">{prediction.targetPriceLabel}</strong>
        {" "}수준까지
      </h2>

      <p className="prediction-summary__sentence">{prediction.sentence}</p>

      <div className="prediction-summary__metrics">
        <article>
          <span><CalendarDays size={16}/>예상 시기</span>
          <b>{prediction.targetPeriodLabel}</b>
          <small>{prediction.horizonMonths}개월 후</small>
        </article>
        <article>
          <span><Target size={16}/>목표 가격</span>
          <b>{prediction.targetPriceLabel}</b>
          <small>
            현재 {prediction.currentPriceLabel}
            {" · "}
            {prediction.expectedChangePercent >= 0 ? "+" : ""}
            {prediction.expectedChangePercent}%
          </small>
        </article>
        <article>
          <span><Percent size={16}/>{prediction.direction} 확률</span>
          <b className={`prediction-summary__prob ${toneClass}`}>{prediction.probabilityPercent}%</b>
          <small>{dataSource === "molit" ? "실거래 기반 추정" : "샘플 모델 추정"}</small>
        </article>
      </div>

      <div className={`prediction-breakthrough prediction-breakthrough--${breakthroughTone}`}>
        <div className="prediction-breakthrough__head">
          <span><Flag size={16}/>신고가 돌파 전망</span>
          {prediction.breakthrough.breakthroughPeriodLabel ? (
            <b>{prediction.breakthrough.breakthroughPeriodLabel}</b>
          ) : (
            <b>—</b>
          )}
        </div>
        <p>{prediction.breakthrough.sentence}</p>
        <div className="prediction-breakthrough__chips">
          <span>12개월 최고 {prediction.breakthrough.peakPriceLabel}</span>
          <span>{prediction.breakthrough.peakPeriodLabel} 형성</span>
          {prediction.breakthrough.breakthroughMonths ? (
            <span>돌파까지 약 {prediction.breakthrough.breakthroughMonths}개월</span>
          ) : null}
          {prediction.breakthrough.status === "already_broken" ? (
            <span>현재 신고가 갱신 구간</span>
          ) : null}
        </div>
      </div>

      <div className="prediction-stats">
        <div className="prediction-stats__head">
          <span><BarChart3 size={16}/>통계 근거</span>
          <small>아래 지표가 예측·확률 산출에 반영됐어요</small>
        </div>
        <div className="prediction-stats__grid">
          {prediction.statistics.map((stat) => (
            <StatRow key={stat.id} stat={stat} />
          ))}
        </div>
      </div>

      {prediction.factors.length ? (
        <div className="prediction-summary__factors">
          {prediction.factors.map((factor) => (
            <span key={factor}>{factor}</span>
          ))}
        </div>
      ) : null}

      <p className="prediction-summary__footnote">
        <CircleHelp size={13}/>
        {prediction.detail} 본 수치는 투자 권유가 아니며, 실제 가격을 보장하지 않습니다.
      </p>
    </section>
  );
}
