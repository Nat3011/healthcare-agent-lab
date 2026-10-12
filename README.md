# Healthcare Strategy Agent

Prepared by Natasha. Updated 12 October 2026.

A healthcare dashboard and use-case library rebuilt from the HHS FY25 inventory CSV supplied through Google Drive. The source contains 446 records; 38 selected non-retired records inform 30 workflow candidates. Animal health, life-sciences research, general agency work and the former Other healthcare catalogue have been removed.

## Repository
https://github.com/Nat3011/healthcare-agent-lab

## Public site
https://nat3011.github.io/healthcare-agent-lab/

## Current shortlist
Medical record summary (97), patient data redaction (95), referral and document intake (95), clinical guidance search (93), and patient information translation (90). Scores are analyst estimates for fictional-data prototypes, not measured ROI or clinical effectiveness.

## What is implemented
- Search and filter the 30 use cases by workflow area and review burden.
- Review the top five, adjust ranking weights, compare up to three cases and download briefs.
- Inspect original HHS record names, CSV record numbers, source stages and explicit local adaptations.
- Run the retained fictional inbox demo. It uses keyword rules and sends nothing.

The source is https://www.hhs.gov/programs/topic-sites/ai/use-cases/index.html . The selected CSV was read through connected Drive, not automatically synced. The public app includes selected source descriptions and proposed briefs; it excludes source contact details, patient records and credentials. HHS-reported deployment stages do not describe our prototypes. US agency and payer processes need local adaptation.

## Run and verify
```sh
python3 discovery.py --output generated
python3 -m unittest test_discovery.py
node --test tests/logic.test.js
python3 -m http.server 8000 --directory dist
```
Open http://localhost:8000 . The application has no npm build step. Node is used for the JavaScript tests.

## Publish
Settings → Pages → GitHub Actions. The workflow `.github/workflows/pages.yml` runs both test suites and publishes `dist/` when main changes. Keep asset URLs relative to the repository path. Do not publish `.openai/hosting.json`.

## Files
`dist/catalogue.json` is the source of truth. `dist/source-mapping.csv` and `COMPLETE-MAPPING.md` preserve selected record-to-workflow links. `dist/logic.js` owns ranking, filtering and fictional inbox rules. `dist/app.js`, `dist/index.html` and `dist/styles.css` implement the blue-and-white healthcare platform, responsive navigation, use-case cards, source table and accessible dialogs. `discovery.py` validates and exports briefs. `prompts/discover.md` describes future model-assisted extraction; no live model or autonomous Drive ingestion is implemented.

## Reference version
Copied from sriharanmuthyala/healthcare-agent-lab at commit `70cd4831380cd9ab2b788200ba65c9b59c37058d`. The URLs above are the intended publication destinations; deployment must be verified after upload.

## Interface redesign review
The redesign uses self-hosted Inter, lightweight SVG icons, readable workflow cards and a labelled catalogue-driven chart. Ranking, catalogue data and the deterministic inbox rules are preserved. Sources clearly separate HHS deployment stages from proposed prototype status.

The UI supports reduced motion, visible keyboard focus, labelled form controls, skip navigation and keyboard-managed mobile navigation. The existing seven tests pass, and 38 DOM integration checks passed. Rendered desktop/mobile verification and screenshots remain pending because the preview infrastructure was unavailable; this is not a claim of WCAG certification. Do not merge this review branch into main until the redesign has been reviewed.
