export interface ResumeProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  education: string[];
  skills: string[];
  work_history: string[];
}

export interface StoredSession {
  token: string | null;
  profile: ResumeProfile | null;
}
