"""Transactional email via Resend's HTTP API.

Sending is best-effort: a missing RESEND_API_KEY or a delivery failure
is logged and swallowed rather than raised, so signup never fails just
because email isn't configured yet or Resend has a hiccup.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Resume Auto-Filler <onboarding@resend.dev>")
RESEND_API_URL = "https://api.resend.com/emails"


def send_welcome_email(to_email: str) -> None:
    if not RESEND_API_KEY:
        logger.info("RESEND_API_KEY not set; skipping welcome email to %s", to_email)
        return

    payload = {
        "from": EMAIL_FROM,
        "to": [to_email],
        "subject": "Welcome to Resume Auto-Filler",
        "html": (
            "<p>Your Resume Auto-Filler account is set up.</p>"
            "<p>Upload your resume and set any voluntary EEO info in the dashboard, "
            "then install the Chrome extension to start filling applications.</p>"
        ),
    }

    try:
        response = httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        logger.exception("Failed to send welcome email to %s", to_email)
