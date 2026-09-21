import type { AnswerProfile, Application, ApplicationInput, EeoProfile, FullProfile, ResumeProfile } from "./types";

// Point this at your deployed backend before deploying the web app;
// defaults to the local FastAPI dev server.
export const API_BASE_URL = "http://localhost:8000";

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body.detail;
    if (Array.isArray(detail)) {
      // FastAPI validation errors arrive as a list of {msg, loc, ...}.
      return detail.map((d) => String(d.msg ?? d).replace(/^Value error, /, "")).join(". ");
    }
    return detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

function authHeaders(token: string, json = false): HeadersInit {
  return json
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { Authorization: `Bearer ${token}` };
}

export async function signup(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
}

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  const data = await response.json();
  return data.access_token as string;
}

export async function loginWithGoogle(
  credential: string,
): Promise<{ token: string; isNewUser: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  const data = await response.json();
  return { token: data.access_token as string, isNewUser: Boolean(data.is_new_user) };
}

export async function uploadResume(token: string, file: File): Promise<ResumeProfile> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/resume/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as ResumeProfile;
}

export async function fetchProfile(token: string): Promise<FullProfile> {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as FullProfile;
}

export async function updateDemographics(
  token: string,
  demographics: EeoProfile,
): Promise<EeoProfile> {
  const response = await fetch(`${API_BASE_URL}/profile/demographics`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(demographics),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as EeoProfile;
}

export async function updateResume(token: string, resume: ResumeProfile): Promise<ResumeProfile> {
  const response = await fetch(`${API_BASE_URL}/profile/resume`, {
    method: "PUT",
    headers: authHeaders(token, true),
    body: JSON.stringify(resume),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as ResumeProfile;
}

export async function listApplications(token: string): Promise<Application[]> {
  const response = await fetch(`${API_BASE_URL}/applications`, { headers: authHeaders(token) });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as Application[];
}

export async function createApplication(token: string, input: ApplicationInput): Promise<Application> {
  const response = await fetch(`${API_BASE_URL}/applications`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as Application;
}

export async function updateApplication(
  token: string,
  id: number,
  changes: Partial<ApplicationInput>,
): Promise<Application> {
  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify(changes),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as Application;
}

export async function deleteApplication(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
}

export async function deleteResumeFile(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/resume/file`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
}

export async function updateAnswers(token: string, answers: AnswerProfile): Promise<AnswerProfile> {
  const response = await fetch(`${API_BASE_URL}/profile/answers`, {
    method: "PUT",
    headers: authHeaders(token, true),
    body: JSON.stringify(answers),
  });
  if (!response.ok) throw new Error(await parseErrorDetail(response));
  return (await response.json()) as AnswerProfile;
}
