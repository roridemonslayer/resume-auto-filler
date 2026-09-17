import type { EeoProfile } from "./types";

export const DECLINE = "I don't wish to answer";

export const EEO_FIELDS: Array<{
  key: keyof EeoProfile;
  label: string;
  hint: string;
  options: string[];
}> = [
  {
    key: "veteran_status",
    label: "Veteran status",
    hint: "Some applications are required to ask this for federal compliance reporting.",
    options: [
      "I am not a protected veteran",
      "I identify as one or more classifications of protected veteran",
      DECLINE,
    ],
  },
  {
    key: "disability_status",
    label: "Disability status",
    hint: "Also part of standard voluntary self-identification sections.",
    options: [
      "Yes, I have a disability, or have had one in the past",
      "No, I do not have a disability and have not had one in the past",
      DECLINE,
    ],
  },
  {
    key: "gender",
    label: "Gender",
    hint: "",
    options: ["Male", "Female", "Non-binary", DECLINE],
  },
  {
    key: "race_ethnicity",
    label: "Race / ethnicity",
    hint: "",
    options: [
      "American Indian or Alaska Native",
      "Asian",
      "Black or African American",
      "Hispanic or Latino",
      "Native Hawaiian or Other Pacific Islander",
      "White",
      "Two or more races",
      DECLINE,
    ],
  },
  {
    key: "sexual_orientation",
    label: "Sexual orientation",
    hint: "Less common, but some DEI-focused applications ask.",
    options: ["Heterosexual/Straight", "Gay", "Lesbian", "Bisexual", "Another sexual orientation", DECLINE],
  },
];
