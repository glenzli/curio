PYTHON ?= python3
NODE ?= node

.PHONY: check
check:
	$(PYTHON) books/audit_oet_rigor.py --strict
	$(PYTHON) books/audit_textbook_narrative.py --all --strict
	$(PYTHON) books/photographic-imaging-science/validate.py
	$(NODE) --test books/photographic-imaging-science/interactives/*/model.test.js
	$(PYTHON) books/photographic-imaging-science/figures/generate_figures.py
	git diff --exit-code -- books/photographic-imaging-science/figures
	git diff --check
