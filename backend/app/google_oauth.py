"""Verifies Google Identity Services credential tokens.

The frontend uses Google's One Tap / button flow, which returns a
signed ID token directly to the browser -- no client secret or
redirect-based authorization code exchange needed. We just verify that
token's signature and audience server-side.
"""

import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

_google_request = google_requests.Request()


class GoogleAuthNotConfigured(Exception):
    pass


class GoogleTokenInvalid(Exception):
    pass


def verify_google_credential(credential: str) -> str:
    """Returns the verified email address from a Google ID token."""
    if not GOOGLE_CLIENT_ID:
        raise GoogleAuthNotConfigured("GOOGLE_CLIENT_ID is not set on the backend")

    try:
        payload = id_token.verify_oauth2_token(credential, _google_request, GOOGLE_CLIENT_ID)
    except ValueError as e:
        raise GoogleTokenInvalid(str(e)) from e

    email = payload.get("email")
    if not email:
        raise GoogleTokenInvalid("Google token did not include an email address")

    return email
