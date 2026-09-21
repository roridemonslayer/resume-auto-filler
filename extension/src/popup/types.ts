export interface ResumeProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  education: string[];
  skills: string[];
  work_history: string[];
}

export interface EeoProfile {
  veteran_status: string | null;
  disability_status: string | null;
  gender: string | null;
  race_ethnicity: string | null;
  sexual_orientation: string | null;
}

export interface AnswerProfile {
  country: string | null;
  location: string | null;
  authorized_to_work: "yes" | "no" | null;
  requires_sponsorship: "yes" | "no" | null;
  willing_to_relocate: "yes" | "no" | null;
  open_to_in_person: "yes" | "no" | null;
  earliest_start: string | null;
  desired_salary: string | null;
  how_did_you_hear: string | null;
}

export interface FullProfile {
  resume: ResumeProfile;
  eeo: EeoProfile;
  answers: AnswerProfile;
  has_resume: boolean;
  resume_file: { name: string; size: number; updated_at: string } | null;
}

export type ApplicationStatus = "filled" | "applied" | "interviewing" | "offer" | "rejected";

export interface Application {
  id: number;
  company: string;
  role: string | null;
  url: string | null;
  status: ApplicationStatus;
}

// What the content script reports about the active tab.
export interface PageInfo {
  looksLikeApplication: boolean;
  fields: number;
  hasResumeInput: boolean;
  company: string;
  role: string | null;
  url: string | null;
  host: string;
}
