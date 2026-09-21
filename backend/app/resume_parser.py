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
# North American style: optional +1, optional parentheses around the area code,
# and space/dot/dash separators. Bounded so it can't start or end mid-number, and
# the area code can't start with 0/1 (the exchange is left loose so placeholder
# numbers like 555-123-4567 still parse).
PHONE_NANP_RE = re.compile(r"(?<![\w.])(?:\+?1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w])")
# Anything else that starts with a country code.
PHONE_INTL_RE = re.compile(r"(?<![\w.])\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}(?![\w])")

LINKEDIN_RE = re.compile(r"(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/in/([A-Za-z0-9_%-]+)", re.I)
GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9-]+)(?![A-Za-z0-9-])", re.I)
# A personal site: an explicit scheme or www., or a bare domain on a TLD people use for portfolios.
WEBSITE_RE = re.compile(
    r"(?:https?://|www\.)[^\s<>\"'|,;]+|(?<![@\w.-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:dev|io|me|app|design|tech|site|xyz|codes|page|work)(?:/[^\s<>\"'|,;]*)?",
    re.I,
)
NOT_A_WEBSITE = re.compile(r"linkedin\.com|github\.com|mailto:|gmail\.com|outlook\.com|yahoo\.com|google\.com/(?:docs|drive)", re.I)

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


def extract_hyperlinks(pdf_bytes: bytes) -> list[tuple[str, float]]:
    """Link annotations on the first page as (uri, vertical position 0..1)."""
    links: list[tuple[str, float]] = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            page = pdf.pages[0]
            for link in page.hyperlinks:
                uri = link.get("uri")
                if uri:
                    links.append((uri, float(link.get("top", 0)) / float(page.height or 1)))
    except Exception:
        pass  # links are a bonus; never fail the upload over them
    return links


def _find_email(text: str) -> str | None:
    match = EMAIL_RE.search(text)
    return match.group(0) if match else None


def _find_phone(text: str) -> str | None:
    """Prefer a number in the header (first lines), where contact info lives,
    and keep looking past look-alikes instead of giving up on the first one."""
    lines = [line for line in text.splitlines() if line.strip()]
    header = "\n".join(lines[:15])

    for haystack in (header, text):
        for pattern in (PHONE_NANP_RE, PHONE_INTL_RE):
            for match in pattern.finditer(haystack):
                digits = re.sub(r"\D", "", match.group(0))
                if pattern is PHONE_NANP_RE and len(digits) not in (10, 11):
                    continue
                if pattern is PHONE_INTL_RE and not 8 <= len(digits) <= 15:
                    continue
                return match.group(0).strip()
    return None


def _normalize_url(url: str) -> str:
    url = url.strip().rstrip(".,;:)]}>")
    return url if re.match(r"https?://", url, re.I) else f"https://{url}"


def _find_links(text: str, hyperlinks: list[tuple[str, float]]) -> dict[str, str | None]:
    """LinkedIn / GitHub / personal site. `hyperlinks` are the PDF's real link
    annotations as (uri, vertical position 0=top..1=bottom of page 1); they beat
    text matches because resumes often show only the word "LinkedIn"."""
    linkedin = github = website = None

    for uri, _ in hyperlinks:
        if linkedin is None and (m := LINKEDIN_RE.search(uri)):
            linkedin = f"https://www.linkedin.com/in/{m.group(1)}"
        if github is None and (m := GITHUB_RE.search(uri)):
            github = f"https://github.com/{m.group(1)}"

    lines = [line for line in text.splitlines() if line.strip()]
    header = "\n".join(lines[:20])
    if linkedin is None and (m := LINKEDIN_RE.search(text)):
        linkedin = f"https://www.linkedin.com/in/{m.group(1)}"
    if github is None and (m := GITHUB_RE.search(text)):
        github = f"https://github.com/{m.group(1)}"

    # Only header links count as "my website": links further down are usually
    # individual projects.
    for uri, top in hyperlinks:
        if top <= 0.2 and not NOT_A_WEBSITE.search(uri) and re.match(r"https?://", uri, re.I):
            website = _normalize_url(uri)
            break
    if website is None:
        without_emails = EMAIL_RE.sub(" ", header)
        for m in WEBSITE_RE.finditer(without_emails):
            if not NOT_A_WEBSITE.search(m.group(0)):
                website = _normalize_url(m.group(0))
                break

    return {"linkedin_url": linkedin, "github_url": github, "website_url": website}


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


def _split_outside_brackets(text: str) -> list[str]:
    """Split a skills line on , ; | bullets, but not inside "(S3, SQS, ECS)"."""
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for ch in text:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth = max(0, depth - 1)
        if ch in ",;|•·" and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


SKILL_LABEL_RE = re.compile(r"^([A-Za-z][A-Za-z &/+.-]{1,40}):\s*(.*)$")


def _guess_skills(lines: list[str]) -> list[str]:
    section = _section_lines(lines, SECTION_HEADERS["skills"])

    # PDF text wraps lines, so re-join any line that opened a bracket it didn't close.
    joined: list[str] = []
    pending = ""
    for line in section:
        pending = f"{pending} {line}".strip() if pending else line
        if pending.count("(") > pending.count(")"):
            continue
        joined.append(pending)
        pending = ""
    if pending:
        joined.append(pending)

    skills: list[str] = []
    seen: set[str] = set()
    for line in joined:
        # Drop a category label like "Languages:" or "Frameworks & Libraries:".
        if (m := SKILL_LABEL_RE.match(line)) and len(m.group(1).split()) <= 5:
            line = m.group(2)
        for skill in _split_outside_brackets(line):
            key = skill.lower()
            if key not in seen:
                seen.add(key)
                skills.append(skill)
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
        **_find_links(text, extract_hyperlinks(pdf_bytes)),
    }
