# AdmitRoute Source Snapshots

Each monitored official source gets a historical snapshot.

A snapshot should preserve:

- Source URL
- University ID
- Source type
- Retrieved date/time
- Original file when applicable
- Extracted text when available
- Content hash
- Extraction method
- Verification state

Supported source types:

- html
- pdf
- scanned-pdf
- image

Extraction methods may include:

- html-text
- pdftotext
- tesseract-ocr
- pdf-to-image-ocr

Important:

Snapshots are evidence only. They must not directly modify public university data.

Any detected change must go through the AdmitRoute verification workflow.

OCR output must be treated as extracted evidence, not automatically trusted as fact.
