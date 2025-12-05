.PHONY: install
install:
	pip install -e ".[dev]"
	pre-commit install
	@echo "✅ Setup complete - hooks installed"

.PHONY: format
format:
	black . && ruff check . --fix

.PHONY: lint
lint:
	black --check . && ruff check . && mypy src/

.PHONY: test
test:
	pytest tests/ -v

.PHONY: test-watch
test-watch:
	ptw tests/

.PHONY: test-coverage
test-coverage:
	pytest tests/ --cov=src/texere --cov-report=html

.PHONY: check
check: lint test
	@echo "✅ All checks passed"
