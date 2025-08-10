.PHONY: run fmt lint

run:
	poetry run uvicorn app.main:app --reload

fmt:
	poetry run isort .
	poetry run black .

lint:
	poetry run mypy app || true
