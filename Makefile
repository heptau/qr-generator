.PHONY: help install lint format format-check check clean

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  install       Install dependencies (npm install)"
	@echo "  lint          Run ESLint"
	@echo "  format        Format code with Prettier"
	@echo "  format-check  Check formatting with Prettier"
	@echo "  check         Run lint + format-check"
	@echo "  clean         Remove node_modules"

install:
	npm install

lint:
	npm run lint

format:
	npm run format

format-check:
	npm run format:check

check: lint format-check

clean:
	rm -rf node_modules

.DEFAULT_GOAL := help
