export interface ResumeProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
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

export interface FullProfile {
  resume: ResumeProfile;
  eeo: EeoProfile;
  has_resume: boolean;
  resume_file: { name: string; size: number; updated_at: string } | null;
}
