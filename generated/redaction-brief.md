# Patient data redaction

User: Health information team

Problem: Identifiers can appear unexpectedly inside free-text health data.

Workflow: Highlight possible identifiers and propose redactions for manual review.

Input: Synthetic notes with deliberately inserted names, addresses and identifiers.

Output: Marked text, proposed redacted copy and a review log.

Measure: Missed identifiers and incorrectly removed useful text.

Review: Human approval before live action. Clinical outputs require a qualified reviewer.

Source: HHS AI Use Case Inventory FY25, CSV records 90, 117 (header counted as record 1)
https://www.hhs.gov/programs/topic-sites/ai/use-cases/index.html

Adaptation: Adapted from HHS health-record PII detection. The prototype is a review aid and does not certify anonymisation.

Score: 95/100. Initial analyst judgement, not validated ROI.
