# app/services/analyze.py
import re
from typing import List, Dict

FILLERS = {"음", "어", "그", "음...", "어...", "약간", "뭐랄까", "그러니까"}

def tokenize_ko(text: str) -> List[str]:
    # 단순 토크나이저(공백/구두점 기준)
    return [t for t in re.split(r"[\\s\\,\\.\\!\\?\\-\\:;\\(\\)\\[\\]\\{\\}]+", text) if t]

def calc_filler_ratio(tokens: List[str]) -> float:
    if not tokens: return 0.0
    filler_count = sum(1 for t in tokens if t in FILLERS)
    return min(1.0, filler_count / max(1, len(tokens)))

def calc_wpm(tokens: List[str], duration_sec: float) -> float:
    if duration_sec <= 0:
        # 길이 모르면 대략 150 wpm 가정으로 역산하지 않고 0 처리
        return 0.0
    minutes = duration_sec / 60.0
    return len(tokens) / minutes if minutes > 0 else 0.0

def calc_keyword_hit_rate(transcript: str, rubric_keywords: List[str]) -> float:
    if not rubric_keywords:
        return 0.0
    t = transcript.lower()
    hits = 0
    for kw in rubric_keywords:
        kw = kw.strip().lower()
        if not kw: continue
        if kw in t:
            hits += 1
    return hits / len(rubric_keywords)

def simple_sentiment(transcript: str) -> str:
    # 아주 단순한 룰(placeholder) – 나중에 koBERT 등으로 교체
    pos_words = {"성공", "해결", "개선", "달성", "최적화", "확장"}
    neg_words = {"문제", "실패", "어려움", "이슈", "장애"}
    score = 0
    low = transcript.lower()
    for w in pos_words:
        if w in low: score += 1
    for w in neg_words:
        if w in low: score -= 1
    return "pos" if score > 0 else ("neg" if score < 0 else "neu")

def calc_quality_scores(filler_ratio: float, wpm: float, keyword_hit_rate: float) -> Dict[str, float]:
    # 간단 점수: 0~5
    # 명확성: 말더듬 적을수록+, wpm이 너무 느리거나 빠르면 감점
    clarity = 5.0 - (filler_ratio * 3.0)
    if wpm > 220 or wpm < 60: clarity -= 1.0
    clarity = max(0.0, min(5.0, clarity))

    # 일관성: 키워드 매칭율 기반
    coherence = 2.0 + (keyword_hit_rate * 3.0)
    coherence = max(0.0, min(5.0, coherence))
    return {"clarity": clarity, "coherence": coherence}

def analyze(transcript: str, rubric_keywords: List[str], duration_sec: float) -> Dict[str, float | str]:
    tokens = tokenize_ko(transcript)
    filler_ratio = calc_filler_ratio(tokens)
    wpm = calc_wpm(tokens, duration_sec)
    khr = calc_keyword_hit_rate(transcript, rubric_keywords)
    sent = simple_sentiment(transcript)
    qs = calc_quality_scores(filler_ratio, wpm, khr)
    return {
        "filler_ratio": round(filler_ratio, 3),
        "wpm": round(wpm, 1),
        "keyword_hit_rate": round(khr, 3),
        "sentiment": sent,
        "clarity_score": round(qs["clarity"], 2),
        "coherence_score": round(qs["coherence"], 2),
    }
