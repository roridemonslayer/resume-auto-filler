/**
 * Content script: no imports/exports on purpose (kept as a classic
 * script, not an ES module, per tsconfig.scripts.json / manifest).
 * Duplicates the ResumeProfile shape locally rather than importing it
 * from the popup code.
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

type ProfileKey =
  | "email"
  | "phone"
  | "first_name"
  | "last_name"
  | "full_name"
  | "education"
  | "skills"
  | "work_history";

const FIELD_PATTERNS: Array<{ key: ProfileKey; patterns: RegExp[] }> = [
  { key: "email", patterns: [/e[-\s]?mail/i] },
  { key: "phone", patterns: [/phone|mobile|cell/i] },
  { key: "first_name", patterns: [/first[\s_-]?name|given[\s_-]?name|fname\b/i] },
  { key: "last_name", patterns: [/last[\s_-]?name|surname|family[\s_-]?name|lname\b/i] },
  { key: "full_name", patterns: [/\bfull[\s_-]?name\b|^name$|\bname\b/i] },
  { key: "education", patterns: [/education|degree|university|school/i] },
  { key: "skills", patterns: [/skills|competenc/i] },
  { key: "work_history", patterns: [/experience|employer|company|work[\s_-]?history/i] },
];

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

  return parts.join(" ").trim();
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

function valueForKey(key: ProfileKey, profile: ResumeProfile): string | null {
  switch (key) {
    case "email":
      return profile.email;
    case "phone":
      return profile.phone;
    case "first_name":
      return profile.first_name;
    case "last_name":
      return profile.last_name;
    case "full_name":
      return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null;
    case "education":
      return profile.education[0] ?? null;
    case "skills":
      return profile.skills.length ? profile.skills.join(", ") : null;
    case "work_history":
      return profile.work_history[0] ?? null;
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

function fillForm(profile: ResumeProfile): number {
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
      const profile = result.profile as ResumeProfile | undefined;
      if (!profile) {
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
    const count = fillForm(message.profile as ResumeProfile);
    sendResponse({ filled: count });
  }
  return true;
});

if (document.body) {
  injectFillButton();
} else {
  document.addEventListener("DOMContentLoaded", injectFillButton);
}
