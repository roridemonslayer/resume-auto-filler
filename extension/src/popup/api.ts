import type { ResumeProfile } from "./types";

// Point this at your deployed backend before publishing to the Web
// Store; defaults to the local FastAPI dev server. Must also be listed
// in manifest.json's host_permissions.
export const API_BASE_URL = "http://localhost:8000";

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

export async function fetchProfile(token: string): Promise<ResumeProfile | null> {
  const response = await fetch(`${API_BASE_URL}/resume/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response));
  }
  return (await response.json()) as ResumeProfile;
}
