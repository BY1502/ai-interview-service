from typing import List, Dict

# Temporary stub until real LLM integration
def generate_questions(role: str, job_title: str, level: str, stack: List[str], difficulty: str) -> List[Dict]:
    base = [
        "자기소개 및 최근 프로젝트에서 맡은 역할을 설명해 주세요.",
        "해당 직무에서 가장 중요하다고 생각하는 역량은 무엇이며, 어떻게 증명하셨나요?",
        "문제가 발생했을 때 원인 분석부터 해결까지의 과정을 구체적으로 설명해 주세요.",
        f"{', '.join(stack) or '주요 기술'} 중 하나를 선택해 내부 동작 원리를 설명해 주세요.",
        "동료와의 협업에서 갈등이 있었던 경험과 해결 방법을 공유해 주세요.",
        "서비스의 안정성과 확장성을 위해 어떤 설계를 했는지 사례를 들어 설명해 주세요.",
        "장애나 성능 이슈를 발견했을 때 모니터링/로깅으로 어떻게 추적했나요?",
        "최근 학습하거나 흥미롭게 본 기술/논문 한 가지를 설명해 주세요."
    ]
    return [
        {
            "text": q,
            "rubric_keywords": ["원인-해결", "구체성", "영향도"] if i in (2,6) else ["핵심키워드", "경험근거"],
            "difficulty": difficulty,
        }
        for i, q in enumerate(base, 1)
    ]
