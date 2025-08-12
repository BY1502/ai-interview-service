# app/services/stt.py
from faster_whisper import WhisperModel
from typing import Optional, Tuple
from app.core.config import settings

_model: Optional[WhisperModel] = None

def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(
            settings.WHISPER_MODEL_SIZE,
            device=settings.WHISPER_DEVICE if settings.WHISPER_DEVICE != "auto" else "cpu",
            compute_type="int8",  # mac CPU에서 빠르고 충분히 정확
        )
    return _model

def transcribe_audio(path: str, language: str = "ko") -> Tuple[str, float]:
    """
    Returns: (full_text, duration_sec)
    """
    model = get_model()
    segments, info = model.transcribe(path, language=language, vad_filter=True)
    texts = []
    for seg in segments:
        texts.append(seg.text.strip())
    full = " ".join([t for t in texts if t])
    return full.strip(), float(info.duration)
