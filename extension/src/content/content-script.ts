/**
 * Content script: no imports/exports on purpose (kept as a classic
 * script, not an ES module, per tsconfig.scripts.json / manifest).
 * Duplicates the profile shape locally rather than importing it from
 * the popup code.
 */

interface ResumeProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  education: string[];
  skills: string[];
  work_history: string[];
}

interface EeoProfile {
  veteran_status: string | null;
  disability_status: string | null;
  gender: string | null;
  race_ethnicity: string | null;
  sexual_orientation: string | null;
}

interface FullProfile {
  resume: ResumeProfile;
  eeo: EeoProfile;
  has_resume: boolean;
}

type ProfileKey =
  | "email"
  | "phone"
  | "first_name"
  | "last_name"
  | "full_name"
  | "education"
  | "skills"
  | "work_history"
  | "veteran_status"
  | "disability_status"
  | "gender"
  | "race_ethnicity"
  | "sexual_orientation";

// Order matters: matchProfileKey returns the first match, so more
// specific patterns (e.g. "School Name" -> education) must come before
// the generic full_name catch-all, or "name"-containing labels for
// other fields would get misclassified as the person's name.
const FIELD_PATTERNS: Array<{ key: ProfileKey; patterns: RegExp[] }> = [
  { key: "email", patterns: [/e[-\s]?mail/i] },
  { key: "phone", patterns: [/phone|mobile|cell/i] },
  { key: "first_name", patterns: [/first[\s_-]?name|given[\s_-]?name|fname\b/i] },
  { key: "last_name", patterns: [/last[\s_-]?name|surname|family[\s_-]?name|lname\b/i] },
  { key: "veteran_status", patterns: [/veteran/i] },
  { key: "disability_status", patterns: [/disabilit/i] },
  { key: "sexual_orientation", patterns: [/sexual[\s_-]?orientation/i] },
  { key: "gender", patterns: [/\bgender\b|\bsex\b(?!ual)/i] },
  { key: "race_ethnicity", patterns: [/\brace\b|ethnicit/i] },
  { key: "education", patterns: [/education|degree|university|school/i] },
  { key: "skills", patterns: [/skills|competenc/i] },
  { key: "work_history", patterns: [/experience|employer|company|work[\s_-]?history/i] },
  { key: "full_name", patterns: [/\bfull[\s_-]?name\b|^name$|\bname\b/i] },
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function getFieldSignal(el: HTMLElement): string {
  const parts: string[] = [];

  const attrs = ["name", "id", "placeholder", "aria-label", "autocomplete"];
  for (const attr of attrs) {
    const value = el.getAttribute(attr);
    if (value) parts.push(value);
  }

  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) parts.push(label.textContent);
  }

  const wrappingLabel = el.closest("label");
  if (wrappingLabel?.textContent) parts.push(wrappingLabel.textContent);

  return normalizeText(parts.join(" "));
}

function matchProfileKey(signal: string): ProfileKey | null {
  if (!signal) return null;
  for (const { key, patterns } of FIELD_PATTERNS) {
    if (patterns.some((p) => p.test(signal))) {
      return key;
    }
  }
  return null;
}

function valueForKey(key: ProfileKey, profile: FullProfile): string | null {
  switch (key) {
    case "email":
      return profile.resume.email;
    case "phone":
      return profile.resume.phone;
    case "first_name":
      return profile.resume.first_name;
    case "last_name":
      return profile.resume.last_name;
    case "full_name":
      return [profile.resume.first_name, profile.resume.last_name].filter(Boolean).join(" ") || null;
    case "education":
      return profile.resume.education[0] ?? null;
    case "skills":
      return profile.resume.skills.length ? profile.resume.skills.join(", ") : null;
    case "work_history":
      return profile.resume.work_history[0] ?? null;
    case "veteran_status":
      return profile.eeo.veteran_status;
    case "disability_status":
      return profile.eeo.disability_status;
    case "gender":
      return profile.eeo.gender;
    case "race_ethnicity":
      return profile.eeo.race_ethnicity;
    case "sexual_orientation":
      return profile.eeo.sexual_orientation;
    default:
      return null;
  }
}

// Setting .value directly doesn't notify frameworks like React that
// listen for native input events (Greenhouse, many custom ATS forms).
// This uses the native property setter so the framework's own change
// detection fires correctly.
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(el);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function highlight(el: HTMLElement) {
  const original = el.style.outline;
  el.style.outline = "2px solid #229954";
  el.style.transition = "outline 0.2s ease";
  setTimeout(() => {
    el.style.outline = original;
  }, 1200);
}

function trySelectOption(select: HTMLSelectElement, value: string): boolean {
  const lowerValue = value.toLowerCase();
  for (const option of Array.from(select.options)) {
    if (option.text.toLowerCase().includes(lowerValue) || option.value.toLowerCase() === lowerValue) {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }
  return false;
}

function fillTextAndSelectFields(profile: FullProfile): number {
  const fields = document.querySelectorAll<HTMLElement>("input, textarea, select");
  let filledCount = 0;

  fields.forEach((field) => {
    const tag = field.tagName.toLowerCase();
    if (tag === "input") {
      const type = (field as HTMLInputElement).type;
      if (["hidden", "submit", "button", "checkbox", "radio", "file", "password"].includes(type)) {
        return;
      }
    }

    const signal = getFieldSignal(field);
    const key = matchProfileKey(signal);
    if (!key) return;

    const value = valueForKey(key, profile);
    if (!value) return;

    if (tag === "select") {
      if (trySelectOption(field as HTMLSelectElement, value)) {
        highlight(field);
        filledCount++;
      }
      return;
    }

    setNativeValue(field as HTMLInputElement | HTMLTextAreaElement, value);
    highlight(field);
    filledCount++;
  });

  return filledCount;
}

// EEO questions (veteran/disability/gender/race/orientation) are often
// rendered as radio-button groups rather than text inputs or selects
// (Workday-style forms in particular), so they need their own matching
// path: group same-name radios, figure out what question the group is
// asking, then click the option whose own label matches the profile
// value.
function getRadioGroupSignal(radios: HTMLInputElement[]): string {
  for (const radio of radios) {
    const fieldset = radio.closest("fieldset");
    const legend = fieldset?.querySelector("legend");
    if (legend?.textContent) return normalizeText(legend.textContent);
  }

  for (const radio of radios) {
    const group = radio.closest('[role="radiogroup"], [role="group"]');
    if (!group) continue;
    const ariaLabel = group.getAttribute("aria-label");
    if (ariaLabel) return normalizeText(ariaLabel);
    const labelledBy = group.getAttribute("aria-labelledby");
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl?.textContent) return normalizeText(labelEl.textContent);
    }
  }

  return normalizeText(radios[0].name.replace(/[-_]/g, " "));
}

function getRadioOptionLabel(radio: HTMLInputElement): string {
  const id = radio.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) return normalizeText(label.textContent);
  }

  const wrapping = radio.closest("label");
  if (wrapping?.textContent) return normalizeText(wrapping.textContent);

  const ariaLabel = radio.getAttribute("aria-label");
  if (ariaLabel) return normalizeText(ariaLabel);

  if (radio.nextSibling?.textContent) return normalizeText(radio.nextSibling.textContent);

  return radio.value || "";
}

function fillRadioGroups(profile: FullProfile): number {
  const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const groups = new Map<string, HTMLInputElement[]>();

  for (const radio of radios) {
    if (!radio.name) continue;
    if (!groups.has(radio.name)) groups.set(radio.name, []);
    groups.get(radio.name)!.push(radio);
  }

  let filledCount = 0;

  for (const groupRadios of groups.values()) {
    if (groupRadios.some((r) => r.checked)) continue; // don't override an existing answer

    const key = matchProfileKey(getRadioGroupSignal(groupRadios));
    if (!key) continue;

    const value = valueForKey(key, profile);
    if (!value) continue;

    const lowerValue = value.toLowerCase();
    const match = groupRadios.find((r) => getRadioOptionLabel(r).toLowerCase().includes(lowerValue));
    if (match) {
      match.click();
      highlight(match.closest("label") ?? match);
      filledCount++;
    }
  }

  return filledCount;
}

function fillForm(profile: FullProfile): number {
  return fillTextAndSelectFields(profile) + fillRadioGroups(profile);
}

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 76px; right: 20px; z-index: 2147483647;
    background: #1b7a43; color: white; padding: 8px 14px; border-radius: 6px;
    font: 13px -apple-system, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function injectFillButton() {
  if (document.getElementById("resume-autofiller-button")) return;

  const button = document.createElement("button");
  button.id = "resume-autofiller-button";
  button.textContent = "Fill Application";
  button.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
    background: #229954; color: white; border: none; border-radius: 999px;
    padding: 12px 18px; font: 600 13px -apple-system, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.25); cursor: pointer;
  `;

  button.addEventListener("click", () => {
    chrome.storage.local.get(["profile"], (result) => {
      const profile = result.profile as FullProfile | undefined;
      if (!profile || !profile.has_resume) {
        showToast("Upload your resume in the extension popup first.");
        return;
      }
      const count = fillForm(profile);
      showToast(count > 0 ? `Filled ${count} field${count === 1 ? "" : "s"}. Review and submit.` : "No matching fields found on this page.");
    });
  });

  document.body.appendChild(button);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "FILL_FORM" && message.profile) {
    const count = fillForm(message.profile as FullProfile);
    sendResponse({ filled: count });
  }
  return true;
});

if (document.body) {
  injectFillButton();
} else {
  document.addEventListener("DOMContentLoaded", injectFillButton);
}
