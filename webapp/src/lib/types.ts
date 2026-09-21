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

export type YesNo = "yes" | "no";

export interface AnswerProfile {
  country: string | null;
  location: string | null;
  authorized_to_work: YesNo | null;
  requires_sponsorship: YesNo | null;
  willing_to_relocate: YesNo | null;
  open_to_in_person: YesNo | null;
  earliest_start: string | null;
  desired_salary: string | null;
  how_did_you_hear: string | null;
}

export interface ResumeFileInfo {
  name: string;
  size: number;
  updated_at: string;
}

export interface FullProfile {
  resume: ResumeProfile;
  eeo: EeoProfile;
  has_resume: boolean;
  resume_file: ResumeFileInfo | null;
  answers: AnswerProfile;
}

export type ApplicationStatus = "filled" | "applied" | "interviewing" | "offer" | "rejected";

export interface Application {
  id: number;
  company: string;
  role: string | null;
  url: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationInput {
  company: string;
  role?: string | null;
  url?: string | null;
  status?: ApplicationStatus;
  notes?: string | null;
}
