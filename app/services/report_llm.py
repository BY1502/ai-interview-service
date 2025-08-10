# app/services/report_llm.py
from typing import Any, Dict
from app.core.config import settings

def _fallback_report(payload: Dict[str, Any]) -> Dict[str, Any]:
    """LLM 실패/미사용 시 간단 규칙기반 리포트 생성"""
    qas = payload["qas"]
    total = 0.0
    strengths, improvements = [], []

    for qa in qas:
        an = qa.get("analytics", {})
        total += (an.get("clarity_score", 2.5) + an.get("coherence_score", 2.5)) * 10
        if an.get("keyword_hit_rate", 0) >= 0.6:
            strengths.append(f"- `{qa['question'][:28]}...`: 키워드 충족률 양호")
        else:
            improvements.append(f"- `{qa['question'][:28]}...`: 핵심 키워드 언급 강화 필요")
        if an.get("filler_ratio", 0) > 0.08:
            improvements.append("- 충전어(음/어) 줄이기")

    total_score = round(min(100.0, max(0.0, total / max(1, len(qas)))), 1)

    summary_md = f"""## 요약
- 총평: **{total_score}/100**
- 강점: 키워드 중심 설명, 사례 기반 답변(일부)
- 개선: 불필요한 완충어 축소, 질문 의도에 맞춘 키워드 가시화
"""
    suggestions_md = """## 다음 연습 질문
- 최근 장애 원인 분석 과정을 1분 내로 요약해 보세요.
- 서비스 확장성 개선 사례를 지표와 함께 설명해 보세요.
- 협업 갈등 상황을 STAR 기법으로 정리해 보세요.
"""
    return {
        "total_score": total_score,
        "summary_md": summary_md + "\n### 강점\n" + ("\n".join(strengths) or "- (분석 데이터 부족)") + "\n\n### 개선점\n" + ("\n".join(improvements) or "- (분석 데이터 부족)"),
        "suggestions_md": suggestions_md,
    }

def _responses_json(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    OpenAI Responses API + Structured Outputs 로 JSON 스키마 강제
    """
    import os, json, httpx

    api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_report(payload)

    # 모델이 반드시 지켜야 하는 JSON 스키마
    json_schema = {
        "name": "InterviewReport",
        "schema": {
            "type": "object",
            "properties": {
                "total_score": {"type": "number"},
                "summary_md": {"type": "string"},
                "suggestions_md": {"type": "string"}
            },
            "required": ["total_score", "summary_md", "suggestions_md"],
            "additionalProperties": False
        },
        "strict": True
    }

    system = (
        "You are a Korean interview coach. Write concise, actionable Markdown.\n"
        "- Use STAR when helpful.\n"
        "- Keep within the JSON schema strictly."
    )
    user = (
        "세션 메타와 Q/A+분석 데이터를 바탕으로 최종 리포트를 생성하세요.\n"
        "출력은 JSON 스키마(총점/요약/다음연습)만 반환하세요.\n\n"
        f"[입력 데이터]\n{payload}"
    )

    req = {
        "model": settings.LLM_MODEL,  # 예: gpt-5-mini
        "input": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_schema", "json_schema": json_schema},
        "temperature": 0.2,
    }

    url = "https://api.openai.com/v1/responses"
    headers = {"Authorization": f"Bearer {api_key}"}

    with httpx.Client(timeout=60) as client:
        r = client.post(url, json=req, headers=headers)
        r.raise_for_status()
        out = r.json()
        # Structured Outputs 사용 시 JSON 문자열이 content에 들어옵니다.
        # (Responses API 포맷: output[0].content[0].text)
        if "output" in out:
            text = out["output"][0]["content"][0]["text"]
        else:
            # (호환) chat.completions 경로로 응답이 온 경우
            text = out["choices"][0]["message"]["content"]
        return json.loads(text)

def generate_report(payload: Dict[str, Any]) -> Dict[str, Any]:
    if settings.LLM_PROVIDER != "openai":
        return _fallback_report(payload)
    try:
        return _chat_json(payload)   # ✅ 우선 JSON 모드로 안정 실행
    except Exception:
        return _fallback_report(payload)
    # """
    # payload = {
    #   "session": {...},
    #   "qas": [
    #     {"question": str, "answer": str, "analytics": {...}},
    #     ...
    #   ]
    # }
    # """
    # # 공급자 스위치
    # if settings.LLM_PROVIDER != "openai":
    #     return _fallback_report(payload)

    # # OpenAI Responses API 경로
    # try:
    #     return _responses_json(payload)
    # except Exception:
    #     # 문제가 생기면 언제나 폴백
    #     return _fallback_report(payload)

def _chat_json(payload: Dict[str, Any]) -> Dict[str, Any]:
    import os, json, httpx
    api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_report(payload)

    system = (
        "You are a Korean interview coach. Write concise, actionable Markdown. "
        "Return ONLY JSON with keys: total_score(number), summary_md(string), suggestions_md(string)."
    )
    user = (
        "세션 메타와 Q/A+분석 데이터를 바탕으로 최종 리포트를 생성하세요.\n"
        "반드시 JSON만 반환하세요. 마크다운은 값 내부에서만 사용하세요.\n\n"
        f"[입력 데이터]\n{payload}"
    )
    req = {
        "model": settings.LLM_MODEL,  # 예: gpt-4o-mini
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    url = "https://api.openai.com/v1/chat/completions"

    with httpx.Client(timeout=60) as client:
        r = client.post(url, json=req, headers=headers)
        r.raise_for_status()
        out = r.json()
        text = out["choices"][0]["message"]["content"]
        return json.loads(text)
