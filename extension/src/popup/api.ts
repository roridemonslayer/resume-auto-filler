import type { FullProfile, ResumeProfile } from "./types";

// Point these at your deployed backend/web app before publishing to
// the Web Store; both default to local dev servers. API_BASE_URL must
// also be listed in manifest.json's host_permissions.
export const API_BASE_URL = "http://localhost:8000";
export const WEBAPP_URL = "http://localhost:5173";

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function signup(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response));
  }
}

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response));
  }
  const data = await response.json();
  return data.access_token as string;
}

export async function uploadResume(token: string, file: File): Promise<ResumeProfile> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/resume/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response));
  }
  return (await response.json()) as ResumeProfile;
}

export async function fetchProfile(token: string): Promise<FullProfile> {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response));
  }
  return (await response.json()) as FullProfile;
}
