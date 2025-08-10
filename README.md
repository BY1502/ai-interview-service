# AI Interview Service (Backend + AI)

Minimal FastAPI skeleton to start building an AI-powered interview Q&A and feedback service.

## Quickstart (Local, Poetry)
```bash
# 1) install poetry if needed
# curl -sSL https://install.python-poetry.org | python3 -

# 2) create venv & install
poetry install

# 3) run dev server
poetry run uvicorn app.main:app --reload
```

Open: http://127.0.0.1:8000/docs

## Next Steps
- Step 2: Add DB (SQLAlchemy + Alembic) and models
- Step 3: Implement /sessions, /answers endpoints with real logic
- Step 4: Add STT and LLM adapters
