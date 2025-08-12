from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "AI Interview Service"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./app.db"

     # STT
    WHISPER_MODEL_SIZE: str = "small"
    WHISPER_DEVICE: str = "auto"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    LLM_PROVIDER: str = "none"
    OPENAI_API_KEY: str | None = None
    LLM_MODEL: str = "gpt-4o-mini"

settings = Settings()
