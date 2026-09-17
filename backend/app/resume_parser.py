"""Best-effort extraction of structured fields from a resume PDF.

This is a heuristic parser, not an NLP model: it works well on common,
simply-formatted resumes and will miss fields on heavily designed ones.
Multi-job work history extraction is intentionally basic for now (see
README roadmap) -- it returns whatever lines look like job entries rather
than structured start/end dates per role.
"""

import io
import re

import pdfplumber

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(\+?\d[\d\-.\s()]{8,}\d)")

EDUCATION_KEYWORDS = (
    "bachelor", "master", "b.s.", "b.a.", "m.s.", "m.a.", "ph.d", "phd",
    "university", "college", "institute of technology", "associate degree",
)

SECTION_HEADERS = {
    "education": ("education",),
    "skills": ("skills", "technical skills", "core competencies"),
    "work_history": ("experience", "work experience", "employment history", "work history"),
}


def extract_text(pdf_bytes: bytes) -> str:
    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _find_email(text: str) -> str | None:
    match = EMAIL_RE.search(text)
    return match.group(0) if match else None


def _find_phone(text: str) -> str | None:
    match = PHONE_RE.search(text)
    if not match:
        return None
    digits = re.sub(r"\D", "", match.group(0))
    return match.group(0).strip() if 7 <= len(digits) <= 15 else None


def _guess_name(lines: list[str]) -> tuple[str | None, str | None]:
    for line in lines[:6]:
        candidate = line.strip()
        if not candidate or "@" in candidate or any(ch.isdigit() for ch in candidate):
            continue
        words = candidate.split()
        if 1 < len(words) <= 4 and all(w[0].isupper() for w in words if w):
            parts = candidate.split()
            first_name = parts[0]
            last_name = " ".join(parts[1:]) if len(parts) > 1 else None
            return first_name, last_name
    return None, None


def _section_lines(lines: list[str], header_aliases: tuple[str, ...]) -> list[str]:
    all_headers = [h for aliases in SECTION_HEADERS.values() for h in aliases]
    collected: list[str] = []
    in_section = False

    for line in lines:
        stripped = line.strip()
        lowered = stripped.lower().rstrip(":")

        if lowered in header_aliases:
            in_section = True
            continue

        if in_section and lowered in all_headers:
            break

        if in_section and stripped:
            collected.append(stripped)

    return collected


def _guess_education(lines: list[str], full_text: str) -> list[str]:
    section = _section_lines(lines, SECTION_HEADERS["education"])
    if section:
        return section

    return [
        line.strip()
        for line in lines
        if line.strip() and any(k in line.lower() for k in EDUCATION_KEYWORDS)
    ]


def _guess_skills(lines: list[str]) -> list[str]:
    section = _section_lines(lines, SECTION_HEADERS["skills"])
    skills: list[str] = []
    for line in section:
        parts = re.split(r"[,;|•]", line)
        skills.extend(p.strip() for p in parts if p.strip())
    return skills


def _guess_work_history(lines: list[str]) -> list[str]:
    return _section_lines(lines, SECTION_HEADERS["work_history"])


def parse_resume(pdf_bytes: bytes) -> dict:
    text = extract_text(pdf_bytes)
    lines = [line for line in text.splitlines()]

    first_name, last_name = _guess_name([l for l in lines if l.strip()])

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": _find_email(text),
        "phone": _find_phone(text),
        "education": _guess_education(lines, text),
        "skills": _guess_skills(lines),
        "work_history": _guess_work_history(lines),
    }
