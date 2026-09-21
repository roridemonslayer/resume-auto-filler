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
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
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

interface AnswerProfile {
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

interface FullProfile {
  resume: ResumeProfile;
  eeo: EeoProfile;
  answers?: AnswerProfile;
  has_resume: boolean;
  resume_file: { name: string; size: number; updated_at: string } | null;
}

type ProfileKey =
  | "email"
  | "phone"
  | "first_name"
  | "last_name"
  | "linkedin"
  | "github"
  | "website"
  | "full_name"
  | "education"
  | "skills"
  | "work_history"
  | "veteran_status"
  | "disability_status"
  | "gender"
  | "race_ethnicity"
  | "sexual_orientation"
  | "country"
  | "location"
  | "authorized_to_work"
  | "requires_sponsorship"
  | "willing_to_relocate"
  | "open_to_in_person"
  | "earliest_start"
  | "desired_salary"
  | "how_did_you_hear";

// Order matters: matchProfileKey returns the first match, so more
// specific patterns (e.g. "School Name" -> education) must come before
// the generic full_name catch-all, or "name"-containing labels for
// other fields would get misclassified as the person's name.
const FIELD_PATTERNS: Array<{ key: ProfileKey; patterns: RegExp[] }> = [
  { key: "email", patterns: [/e[-\s]?mail/i] },
  { key: "phone", patterns: [/phone|mobile|cell/i] },
  { key: "first_name", patterns: [/first[\s_-]?name|given[\s_-]?name|fname\b/i] },
  { key: "last_name", patterns: [/last[\s_-]?name|surname|family[\s_-]?name|lname\b/i] },
  { key: "linkedin", patterns: [/linked[\s_-]?in/i] },
  { key: "github", patterns: [/git[\s_-]?hub/i] },
  { key: "website", patterns: [/web[\s_-]?site|portfolio|personal[\s_-]?(site|page|url|link)|home[\s_-]?page|other[\s_-]?(link|url)/i] },
  { key: "veteran_status", patterns: [/veteran/i] },
  { key: "disability_status", patterns: [/disabilit/i] },
  { key: "sexual_orientation", patterns: [/sexual[\s_-]?orientation/i] },
  { key: "gender", patterns: [/\bgender\b|\bsex\b(?!ual)/i] },
  { key: "race_ethnicity", patterns: [/\brace\b|ethnicit/i] },
  // Screening questions. Sponsorship is checked before work authorization
  // because "authorized to work ... require sponsorship?" is really the former.
  { key: "requires_sponsorship", patterns: [/sponsor|\bvisa\b/i] },
  {
    key: "authorized_to_work",
    patterns: [/(legally |currently |lawfully )?(authori[sz]ed|eligible|permitted|allowed|able) to work|work authori[sz]ation|right to work/i],
  },
  { key: "willing_to_relocate", patterns: [/relocat/i] },
  {
    key: "open_to_in_person",
    patterns: [/in[\s-]?person|on[\s-]?site|hybrid|work(ing)? from (the |our |an )?office|days (per|a|in the) (week|office)/i],
  },
  {
    key: "earliest_start",
    patterns: [/earliest.*start|start(ing)? date|when (can|could|would|are) you .*(start|begin|available)|available to start|how soon/i],
  },
  { key: "desired_salary", patterns: [/salary|compensation expectation|desired (pay|compensation)|pay expectation/i] },
  {
    key: "how_did_you_hear",
    patterns: [/how did you (hear|find|learn)|where did you (hear|find|learn)|referral source/i],
  },
  { key: "country", patterns: [/\bcountry\b(?!.*(citizen|birth|origin))/i] },
  { key: "location", patterns: [/\bcity\b|current location|where are you (located|based)|^location$/i] },
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

// Loose keys like "company" or "name" are fine for short labels ("Current
// company") but would otherwise fire on long questions such as "Why do you want
// to work at this company?" and paste an employer into an essay box.
const LOOSE_KEYS: ProfileKey[] = ["education", "skills", "work_history", "full_name"];
const LOOSE_KEY_MAX_SIGNAL = 45;

function matchProfileKey(signal: string): ProfileKey | null {
  if (!signal) return null;
  for (const { key, patterns } of FIELD_PATTERNS) {
    if (patterns.some((p) => p.test(signal))) {
      if (LOOSE_KEYS.includes(key) && (signal.length > LOOSE_KEY_MAX_SIGNAL || signal.includes("?"))) return null;
      return key;
    }
  }
  return null;
}

const YES_NO_KEYS: ProfileKey[] = ["authorized_to_work", "requires_sponsorship", "willing_to_relocate", "open_to_in_person"];

function yesNo(value: "yes" | "no" | null | undefined): string | null {
  return value === "yes" ? "Yes" : value === "no" ? "No" : null;
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
    case "linkedin":
      return profile.resume.linkedin_url;
    case "github":
      return profile.resume.github_url;
    case "website":
      return profile.resume.website_url;
    case "full_name":
      return [profile.resume.first_name, profile.resume.last_name].filter(Boolean).join(" ") || null;
    case "education":
      return profile.resume.education[0] ?? null;
    case "skills":
      return profile.resume.skills.length ? profile.resume.skills.join(", ") : null;
    case "work_history":
      return profile.resume.work_history[0] ?? null;
    case "country":
      return profile.answers?.country ?? null;
    case "location":
      return profile.answers?.location ?? null;
    case "authorized_to_work":
      return yesNo(profile.answers?.authorized_to_work);
    case "requires_sponsorship":
      return yesNo(profile.answers?.requires_sponsorship);
    case "willing_to_relocate":
      return yesNo(profile.answers?.willing_to_relocate);
    case "open_to_in_person":
      return yesNo(profile.answers?.open_to_in_person);
    case "earliest_start":
      return profile.answers?.earliest_start ?? null;
    case "desired_salary":
      return profile.answers?.desired_salary ?? null;
    case "how_did_you_hear":
      return profile.answers?.how_did_you_hear ?? null;
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

function normalizeOption(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%$+' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "I don't wish to answer" is how the web app phrases declining; forms say
// "Decline to self-identify", "Prefer not to say", "I do not want to answer"...
const DECLINE_WANTED = /(don'?t|do not) (wish|want)|prefer not|decline|rather not/;
const DECLINE_OPTION = /decline|(don'?t|do not) (wish|want)|prefer not|rather not|not to (answer|say|disclose|identify|specify)/;

// Picks the option that best matches `wanted`, or -1. Order matters so "No"
// picks "No" (not "Not sure" or "Norway"): exact, then a leading whole word,
// then any whole word, then plain containment for long option sentences.
function bestOptionIndex(labels: string[], wanted: string): number {
  const norm = labels.map(normalizeOption);
  const w = normalizeOption(wanted);
  if (!w) return -1;

  if (DECLINE_WANTED.test(w)) {
    const i = norm.findIndex((l) => DECLINE_OPTION.test(l));
    if (i >= 0) return i;
  }

  let i = norm.findIndex((l) => l === w);
  if (i >= 0) return i;
  const escaped = escapeRegExp(w);
  const leading = new RegExp(`^${escaped}\\b`);
  i = norm.findIndex((l) => leading.test(l));
  if (i >= 0) return i;
  const anywhere = new RegExp(`\\b${escaped}\\b`);
  i = norm.findIndex((l) => anywhere.test(l));
  if (i >= 0) return i;
  if (w.length >= 6) {
    i = norm.findIndex((l) => l.length >= 6 && (l.includes(w) || w.includes(l)));
  }
  return i;
}

function trySelectOption(select: HTMLSelectElement, value: string): boolean {
  const options = Array.from(select.options).filter((o) => o.value !== "" || o.text.trim() !== "");
  const index = bestOptionIndex(options.map((o) => o.text), value);
  const byValue = options.findIndex((o) => o.value.toLowerCase() === value.toLowerCase());
  const chosen = index >= 0 ? options[index] : byValue >= 0 ? options[byValue] : null;
  if (!chosen) return false;
  select.value = chosen.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
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

    if (isCombobox(field)) return; // handled by fillComboboxes (needs the menu opened)

    const signal = getFieldSignal(field);
    const key = matchProfileKey(signal);
    if (!key) return;

    const value = valueForKey(key, profile);
    if (!value) return;

    // "Yes"/"No" belong in a select, radio or dropdown; a text box asking e.g.
    // for an address that happens to mention relocation must not get "Yes".
    if (tag !== "select" && YES_NO_KEYS.includes(key)) return;

    // Don't overwrite something the user (or the site) already put there.
    if (tag !== "select" && (field as HTMLInputElement | HTMLTextAreaElement).value.trim() !== "") return;

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

    const index = bestOptionIndex(groupRadios.map((r) => getRadioOptionLabel(r)), value);
    const match = index >= 0 ? groupRadios[index] : undefined;
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

// --- resume file attach ---------------------------------------------------
// Sets the stored PDF on the form's resume upload input the same way a
// drag-and-drop would (DataTransfer + input/change events), so frameworks and
// ATS uploaders that listen for a file selection pick it up.

const COVER_LETTER_WORD = /cover[\s_-]?letter/i;

// Decides what a file input is for by its own label first, then by the
// nearest ancestor whose text mentions exactly one of resume / cover letter.
// If a container mentions both it's ambiguous, so we don't guess.
function fileInputKind(input: HTMLInputElement): "resume" | "cover" | null {
  const own = getFieldSignal(input);
  if (RESUME_WORD.test(own) && !COVER_LETTER_WORD.test(own)) return "resume";
  if (COVER_LETTER_WORD.test(own) && !RESUME_WORD.test(own)) return "cover";

  let el: HTMLElement | null = input.parentElement;
  for (let depth = 0; el && depth < 6; depth++, el = el.parentElement) {
    const text = (el.textContent ?? "").slice(0, 500);
    const resume = RESUME_WORD.test(text);
    const cover = COVER_LETTER_WORD.test(text);
    if (resume && !cover) return "resume";
    if (cover && !resume) return "cover";
    if (resume && cover) return null;
  }
  return null;
}

function acceptsPdf(input: HTMLInputElement): boolean {
  const accept = (input.getAttribute("accept") ?? "").toLowerCase();
  return !accept || /pdf|application\/\*|\*\/\*/.test(accept);
}

function findResumeInput(): HTMLInputElement | null {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  return (
    inputs.find(
      (input) => !input.disabled && (input.files?.length ?? 0) === 0 && acceptsPdf(input) && fileInputKind(input) === "resume",
    ) ?? null
  );
}

function base64ToFile(base64: string, name: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: "application/pdf" });
}

async function attachResume(profile: FullProfile): Promise<boolean> {
  if (!profile.resume_file) return false;
  const input = findResumeInput();
  if (!input) return false;

  const response = await new Promise<{ name?: string; base64?: string } | undefined>((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_RESUME_FILE" }, (r) => resolve(chrome.runtime.lastError ? undefined : r));
  });
  if (!response?.base64) return false;

  const transfer = new DataTransfer();
  transfer.items.add(base64ToFile(response.base64, response.name ?? profile.resume_file.name));
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  highlight(input.closest("label") ?? input.parentElement ?? input);
  return true;
}

// --- custom dropdowns ------------------------------------------------------
// react-select (used by Greenhouse's newer forms) and similar widgets aren't
// <select>s: an <input role="combobox"> opens a menu of [role="option"]
// elements, and nothing is chosen until one is clicked.

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(find: () => T | null, timeoutMs = 1200, stepMs = 50): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = find();
    if (found) return found;
    if (Date.now() > deadline) return null;
    await sleep(stepMs);
  }
}

function isCombobox(el: HTMLElement): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.getAttribute("role") === "combobox";
}

function comboboxHasValue(input: HTMLInputElement): boolean {
  const control = input.closest('[class*="control"]') ?? input.parentElement?.parentElement;
  return Boolean(control?.querySelector('[class*="single-value"], [class*="multi-value"]'));
}

function comboboxOptions(input: HTMLInputElement): HTMLElement[] {
  const own = document.querySelectorAll<HTMLElement>(`[id^="react-select-${CSS.escape(input.id)}-option"]`);
  if (own.length) return Array.from(own);
  const scope = input.closest("div")?.parentElement?.parentElement ?? document.body;
  return Array.from(scope.querySelectorAll<HTMLElement>('[role="option"]')).filter((o) => !o.closest(".iti"));
}

async function fillCombobox(input: HTMLInputElement, wanted: string): Promise<boolean> {
  if (comboboxHasValue(input)) return false;

  // react-select ignores synthetic key events and plain click(), but opens on a
  // full pointer sequence on its control, like a real mouse press does.
  const control = input.closest<HTMLElement>('[class*="control"]') ?? input.parentElement ?? input;
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    const init = { bubbles: true, cancelable: true, button: 0 };
    control.dispatchEvent(type.startsWith("pointer") ? new PointerEvent(type, { ...init, pointerType: "mouse" }) : new MouseEvent(type, init));
  }
  input.focus();
  // Long lists (countries) need typing to narrow them; yes/no menus are already complete.
  if (!/^(yes|no)$/i.test(wanted)) setNativeValue(input, wanted);

  const options = await waitFor(() => {
    const found = comboboxOptions(input);
    return found.length ? found : null;
  });

  const index = options ? bestOptionIndex(options.map((o) => o.textContent ?? ""), wanted) : -1;
  if (!options || index < 0) {
    setNativeValue(input, "");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    input.blur();
    return false;
  }

  options[index].click();
  await sleep(60);
  input.blur();
  return comboboxHasValue(input);
}

async function fillComboboxes(profile: FullProfile): Promise<number> {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[role="combobox"]'));
  let filled = 0;
  for (const input of inputs) {
    if (input.disabled || input.readOnly) continue;
    const key = matchProfileKey(getFieldSignal(input));
    const value = key ? valueForKey(key, profile) : null;
    if (!value) continue;
    if (await fillCombobox(input, value)) {
      highlight(input.closest('[class*="control"]') ?? input);
      filled++;
    }
  }
  return filled;
}

// intl-tel-input (the phone field's country flag picker) has its own list.
async function fillPhoneCountry(profile: FullProfile): Promise<number> {
  const country = profile.answers?.country;
  if (!country) return 0;

  let filled = 0;
  for (const container of Array.from(document.querySelectorAll<HTMLElement>(".iti"))) {
    const button = container.querySelector<HTMLElement>(".iti__selected-country");
    if (!button || !container.querySelector(".iti__globe")) continue; // already has a country

    button.click();
    const listId = button.getAttribute("aria-controls");
    const items = await waitFor(() => {
      const list = listId ? document.getElementById(listId) : container;
      const found = Array.from(list?.querySelectorAll<HTMLElement>("li.iti__country") ?? []);
      return found.length ? found : null;
    });
    const names = (items ?? []).map((li) => li.querySelector(".iti__country-name")?.textContent ?? li.textContent ?? "");
    const index = items ? bestOptionIndex(names, country) : -1;
    if (items && index >= 0) {
      items[index].click();
      highlight(button);
      filled++;
    } else {
      button.click(); // close it again
    }
  }
  return filled;
}

async function fillEverything(profile: FullProfile): Promise<{ fields: number; attached: boolean }> {
  let fields = fillForm(profile);
  fields += await fillComboboxes(profile);
  fields += await fillPhoneCountry(profile);
  const attached = await attachResume(profile);
  return { fields, attached };
}

// The popup only refreshes its cached profile when opened, so ask the
// background worker for a fresh copy before each fill and fall back to the
// cache if the backend can't be reached.
function loadFreshProfile(): Promise<FullProfile | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "REFRESH_PROFILE" }, (response) => {
      if (chrome.runtime.lastError || !response?.profile) {
        chrome.storage.local.get(["profile"], (result) => resolve((result.profile as FullProfile) ?? null));
      } else {
        resolve(response.profile as FullProfile);
      }
    });
  });
}

// --- application tracking -------------------------------------------------
// After a successful fill we tell the backend which page it was so the web
// app's tracker can list it. This sends the page URL plus a guessed company
// and role to the user's own account; it can be turned off in the popup.

const TRACK_SETTING_KEY = "trackApplications";
const HOSTED_ATS_PATH_COMPANY = /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com|jobvite\.com)$/;
const HOSTED_ATS_SUBDOMAIN_COMPANY = /\.(myworkdayjobs\.com|icims\.com|taleo\.net|breezy\.hr|recruitee\.com|bamboohr\.com)$/;
// Query params that identify a specific posting; everything else (tracking
// params, session ids) is dropped so the same job dedupes to one row.
const JOB_ID_PARAMS = /^(gh_jid|jid|jobid|job_id|jobs?|id|reqid|req|requisition|posting)$/i;

function prettify(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
    .slice(0, 200);
}

function guessCompany(): string {
  const host = location.hostname.replace(/^www\./, "");
  const firstPathSegment = location.pathname.split("/").filter(Boolean)[0];

  if (HOSTED_ATS_PATH_COMPANY.test(host) && firstPathSegment) return prettify(firstPathSegment);
  if (HOSTED_ATS_SUBDOMAIN_COMPANY.test(host)) return prettify(host.split(".")[0]);

  const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
  if (siteName) return siteName.slice(0, 200);

  const labels = host.split(".");
  return prettify(labels.length >= 2 ? labels[labels.length - 2] : labels[0]) || host;
}

function guessRole(): string | null {
  const heading = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
  const raw = heading || document.title.replace(/\s+/g, " ").trim();
  return raw ? raw.slice(0, 300) : null;
}

function cleanPageUrl(): string | null {
  if (!/^https?:$/.test(location.protocol)) return null;
  const url = new URL(location.href);
  const keep = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (JOB_ID_PARAMS.test(key)) keep.set(key, value);
  });
  const query = keep.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

function maybeLogApplication(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TRACK_SETTING_KEY], (result) => {
      if (result[TRACK_SETTING_KEY] === false) {
        resolve(false);
        return;
      }
      const payload = { company: guessCompany(), role: guessRole(), url: cleanPageUrl(), status: "filled" };
      chrome.runtime.sendMessage({ type: "LOG_APPLICATION", payload }, (response) => {
        resolve(!chrome.runtime.lastError && Boolean(response?.ok));
      });
    });
  });
}

// --- submission tracking --------------------------------------------------
// A submit click or event only means the user *tried* to submit (validation
// can fail), so it's parked in the background worker and the application is
// only marked "applied" once a confirmation shows up -- on this page (SPA
// forms) or on the page the form navigates to. Page text is only read
// locally; the backend just receives the same URL/company/role as a fill.

const CONFIRM_TEXT =
  /thank(s| you)[^.]{0,40}(appl|submi)|application (has been |was |is )?(successfully )?(submitted|received|sent)|successfully (applied|submitted)|we('ve| have) received your (application|submission)|you('ve| have) (successfully )?applied/i;
const CONFIRM_URL = /(thank|confirm|submitted|success|applied|complete)/i;
const SUBMIT_LABEL = /^(submit( my)?( application)?|apply( now)?|send( my)? application|finish|complete application)$/i;
const CONFIRM_WATCH_MS = 30000;

let trackingEnabled = true;
chrome.storage.local.get([TRACK_SETTING_KEY], (result) => {
  trackingEnabled = result[TRACK_SETTING_KEY] !== false;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[TRACK_SETTING_KEY]) {
    trackingEnabled = changes[TRACK_SETTING_KEY].newValue !== false;
  }
});

function bodyText(): string {
  return (document.body?.innerText ?? "").slice(0, 30000);
}

function confirmSubmission(payload: unknown) {
  chrome.runtime.sendMessage({ type: "CONFIRM_SUBMIT", payload }, (response) => {
    if (!chrome.runtime.lastError && response?.ok) showToast("Application submitted. Tracked as Applied.");
  });
}

let stopWatching: (() => void) | null = null;

// Polls for a confirmation. With useBaseline, text that was already on the
// page when the user clicked submit (e.g. a footer saying "thank you") is
// ignored, so only newly appearing text or a URL change counts.
function watchForConfirmation(payload: unknown, durationMs: number, useBaseline: boolean) {
  stopWatching?.();
  const startUrl = location.href;
  const textAlreadyPresent = useBaseline && CONFIRM_TEXT.test(bodyText());
  const deadline = Date.now() + durationMs;

  const stop = () => {
    window.clearInterval(timer);
    if (stopWatching === stop) stopWatching = null;
  };
  const timer = window.setInterval(() => {
    const urlConfirmed = location.href !== startUrl && CONFIRM_URL.test(location.pathname);
    const textConfirmed = !textAlreadyPresent && CONFIRM_TEXT.test(bodyText());
    if (urlConfirmed || textConfirmed) {
      stop();
      confirmSubmission(payload);
    } else if (Date.now() > deadline) {
      stop();
    }
  }, 1000);
  stopWatching = stop;
}

function armSubmit() {
  const url = cleanPageUrl();
  if (!url) return;
  const payload = { company: guessCompany(), role: guessRole(), url, status: "applied" };
  chrome.runtime.sendMessage({ type: "SUBMIT_ATTEMPT", payload });
  watchForConfirmation(payload, CONFIRM_WATCH_MS, true);
}

function controlLabel(el: Element): string {
  const raw = el instanceof HTMLInputElement ? el.value : (el.textContent ?? "");
  return (raw || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
}

let submitWatcherStarted = false;

function startSubmitWatcher() {
  if (submitWatcherStarted) return;
  submitWatcherStarted = true;

  document.addEventListener(
    "submit",
    () => {
      if (trackingEnabled) armSubmit();
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      if (!trackingEnabled) return;
      const control = (event.target as Element | null)?.closest?.('button, input[type="submit"], [role="button"]');
      if (control && SUBMIT_LABEL.test(controlLabel(control))) armSubmit();
    },
    true,
  );
}

// Runs on every page load: if this tab just submitted a form and navigated
// here, check whether this is the confirmation page.
function checkPendingSubmission() {
  chrome.runtime.sendMessage({ type: "CHECK_PENDING" }, (response) => {
    if (chrome.runtime.lastError || !response?.payload || !trackingEnabled) return;
    if (CONFIRM_URL.test(location.pathname) || CONFIRM_TEXT.test(bodyText())) {
      confirmSubmission(response.payload);
    } else {
      watchForConfirmation(response.payload, 15000, false);
    }
  });
}

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 144px; right: 20px; z-index: 2147483647; max-width: 320px;
    background: #0a0a0b; color: #f6f5f0; padding: 10px 14px; border-radius: 12px;
    border-left: 4px solid #c8ff3d; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    font: 500 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// --- job application detection --------------------------------------------
// The button must only appear on real job applications, not on every signup
// or contact form that happens to have a name/email/phone field. So a page
// needs (1) at least a few fields we can fill, AND (2) a score of job-specific
// evidence: a known applicant-tracking-system host, a resume/CV upload,
// phrases job forms ask (cover letter, work authorization, EEO...), and
// "apply/careers/job" wording in the URL, title or heading.

const BUTTON_ID = "resume-autofiller-button";
const MIN_FILLABLE_FIELDS = 3;
const JOB_SCORE_THRESHOLD = 4;

const HOSTED_ATS_HOST =
  /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com|jobvite\.com|myworkdayjobs\.com|myworkdaysite\.com|icims\.com|taleo\.net|breezy\.hr|recruitee\.com|bamboohr\.com|applytojob\.com|teamtailor\.com|pinpointhq\.com|eightfold\.ai|dayforcehcm\.com|ultipro\.com|paylocity\.com|successfactors\.(com|eu))$/i;
const JOB_WORDS = /\b(apply|application|applicant|careers?|jobs?|positions?|openings?|hiring|recruit\w*|vacanc\w*)\b/i;
const JOB_FORM_PHRASES =
  /cover letter|authorized to work|work authorization|legally authorized|sponsorship|desired salary|salary expectations?|years of (relevant |professional )?experience|how did you hear (about|of) (us|this)|notice period|willing to relocate|linkedin (profile|url)|equal (employment )?opportunity/i;
const RESUME_WORD = /\b(resume|résumé|cv|curriculum vitae)\b/i;
const RESUME_UPLOAD_TEXT =
  /(upload|attach|add|drop|select)\s+(your\s+|a\s+|the\s+|my\s+)?(resume|résumé|cv|curriculum vitae)|(resume|résumé|cv)\s*(\/\s*cv)?\s*\*?\s*(upload|attach|file)|\bresume\/cv\b/i;

function fillableFieldKeys(): ProfileKey[] {
  const keys: ProfileKey[] = [];

  document.querySelectorAll<HTMLElement>("input, textarea, select").forEach((field) => {
    if (field.tagName.toLowerCase() === "input") {
      const type = (field as HTMLInputElement).type;
      if (["hidden", "submit", "button", "file", "radio"].includes(type)) return;
    }
    const key = matchProfileKey(getFieldSignal(field));
    if (key) keys.push(key);
  });

  const groups = new Map<string, HTMLInputElement[]>();
  document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((radio) => {
    if (!radio.name) return;
    if (!groups.has(radio.name)) groups.set(radio.name, []);
    groups.get(radio.name)!.push(radio);
  });
  groups.forEach((group) => {
    const key = matchProfileKey(getRadioGroupSignal(group));
    if (key) keys.push(key);
  });

  return keys;
}

function hasResumeUpload(text: string): boolean {
  const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  if (fileInputs.length === 0) return false;

  for (const input of Array.from(fileInputs)) {
    const container = input.closest("label, fieldset, div");
    const nearby = `${getFieldSignal(input)} ${input.getAttribute("accept") ?? ""} ${(container?.textContent ?? "").slice(0, 300)}`;
    if (RESUME_WORD.test(nearby)) return true;
  }
  // Some forms hide the real input behind an "Attach" button labelled elsewhere.
  return RESUME_UPLOAD_TEXT.test(text);
}

function jobApplicationScore(keys: ProfileKey[]): number {
  let score = 0;
  if (HOSTED_ATS_HOST.test(location.hostname)) score += 3;

  const heading = document.querySelector("h1")?.textContent ?? "";
  if (JOB_WORDS.test(`${location.pathname} ${document.title} ${heading}`)) score += 1;

  const text = bodyText();
  if (hasResumeUpload(text)) score += 3;
  if (JOB_FORM_PHRASES.test(text)) score += 2;
  if (keys.includes("veteran_status") || keys.includes("disability_status")) score += 2;

  return score;
}

function pageLooksLikeJobApplication(): boolean {
  const keys = fillableFieldKeys();
  if (keys.length < MIN_FILLABLE_FIELDS) return false;
  // A payment form is never a job application, whatever else it asks.
  if (document.querySelector('input[autocomplete^="cc-"]')) return false;
  return jobApplicationScore(keys) >= JOB_SCORE_THRESHOLD;
}

// --- floating logo button -------------------------------------------------
// Lives in a shadow root so the host page's CSS can't restyle it. Collapsed
// it's just the logo; on hover it expands to show what it does.

const LOGO_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M7.5 4.5h5.6a4.1 4.1 0 0 1 1.5 7.9l3.1 7.1h-3l-2.8-6.6H10v6.6H7.5V4.5zm2.5 2.4v3.6h2.9a1.8 1.8 0 0 0 0-3.6H10z"/></svg>`;
const CHECK_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" d="M5.5 12.5l4.2 4.2 8.8-9.2"/></svg>`;

const BUTTON_CSS = `
  :host { all: initial; }
  button {
    all: unset; box-sizing: border-box; position: absolute; right: 0; bottom: 0; height: 48px;
    display: flex; align-items: center; cursor: pointer; overflow: hidden; border-radius: 999px;
    background: #0a0a0b; color: #f6f5f0;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1);
    font: 600 13.5px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }
  button:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(200, 255, 61, 0.5); }
  button:focus-visible { outline: 2px solid #c8ff3d; outline-offset: 3px; }
  .label {
    max-width: 0; opacity: 0; padding-left: 0; white-space: nowrap;
    transition: max-width 0.25s ease, opacity 0.2s ease, padding 0.25s ease;
  }
  button:hover .label, button:focus-visible .label { max-width: 150px; opacity: 1; padding-left: 18px; }
  .logo {
    flex: 0 0 48px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
    background: #c8ff3d; color: #0a0a0b; border-radius: 50%;
  }
  button.busy .logo { animation: pulse 0.9s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.55; } }
`;

function injectFillButton() {
  if (document.getElementById(BUTTON_ID)) return;

  const host = document.createElement("div");
  host.id = BUTTON_ID;
  host.style.cssText = "position: fixed; bottom: 84px; right: 20px; width: 48px; height: 48px; z-index: 2147483647;";

  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${BUTTON_CSS}</style>
    <button type="button" aria-label="Fill this application with Resume Auto-Filler" title="Fill application">
      <span class="label">Fill application</span><span class="logo">${LOGO_SVG}</span>
    </button>`;

  const button = root.querySelector("button")!;
  const logo = root.querySelector(".logo")!;

  button.addEventListener("click", async () => {
    button.classList.add("busy");
    const profile = await loadFreshProfile();
    button.classList.remove("busy");
    if (!profile || !profile.has_resume) {
      showToast("Upload your resume in the extension popup first.");
      return;
    }
    const { fields, attached } = await fillEverything(profile);
    if (fields === 0 && !attached) {
      showToast("No matching fields found on this page.");
      return;
    }
    logo.innerHTML = CHECK_SVG;
    setTimeout(() => (logo.innerHTML = LOGO_SVG), 1600);
    const logged = await maybeLogApplication();
    const missingFile = !attached && !profile.resume_file && findResumeInput() !== null;
    showToast(
      `Filled ${fields} field${fields === 1 ? "" : "s"}${attached ? " and attached your resume" : ""}. Review and submit.` +
        `${logged ? " Added to your tracker." : ""}` +
        `${missingFile ? " Re-upload your PDF in the web app so I can attach it." : ""}`,
    );
  });

  document.body.appendChild(host);
  injectedHref = location.href;
  startSubmitWatcher();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_PAGE_INFO") {
    sendResponse({
      looksLikeApplication: pageLooksLikeJobApplication(),
      fields: fillableFieldKeys().length,
      hasResumeInput: Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]')).some(
        (input) => fileInputKind(input) === "resume",
      ),
      company: guessCompany(),
      role: guessRole(),
      url: cleanPageUrl(),
      host: location.hostname,
    });
  }
  if (message?.type === "FILL_FORM" && message.profile) {
    fillEverything(message.profile as FullProfile).then(({ fields, attached }) => {
      if (fields > 0 || attached) void maybeLogApplication();
      sendResponse({ filled: fields, attached });
    });
  }
  return true;
});

// Many ATS platforms render their form fields client-side after the initial
// page load, and single-page apps change routes without reloading, so keep
// watching DOM changes (debounced). Scans are capped per URL so a busy page
// that never turns out to be an application doesn't cost CPU forever, and the
// button is removed if the page navigates to something that isn't one.
const MAX_SCANS_PER_URL = 40;
let injectedHref = "";
let scanScheduled = false;
let scanCount = 0;
let lastScanHref = location.href;

function scheduleScan() {
  if (scanScheduled) return;
  scanScheduled = true;
  setTimeout(() => {
    scanScheduled = false;
    if (location.href !== lastScanHref) {
      lastScanHref = location.href;
      scanCount = 0;
    }

    const button = document.getElementById(BUTTON_ID);
    if (button) {
      if (location.href !== injectedHref) {
        injectedHref = location.href;
        if (!pageLooksLikeJobApplication()) button.remove();
      }
      return;
    }

    if (scanCount >= MAX_SCANS_PER_URL) return;
    scanCount++;
    if (pageLooksLikeJobApplication()) injectFillButton();
  }, 400);
}

function startWatching() {
  scheduleScan();
  const observer = new MutationObserver(() => {
    if (document.getElementById(BUTTON_ID) && location.href === injectedHref) return;
    scheduleScan();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// On the web app itself, hand its login token to the extension. Only the exact
// web app origin is trusted (keep in sync with WEBAPP_URL in popup/api.ts).
const WEBAPP_ORIGIN = "http://localhost:5173";
const WEBAPP_TOKEN_KEY = "resumeAutoFiller.token";

function syncTokenFromWebapp() {
  if (location.origin !== WEBAPP_ORIGIN) return;
  const push = (token: unknown) => {
    if (typeof token === "string" && token) chrome.runtime.sendMessage({ type: "SYNC_TOKEN", token });
  };
  push(localStorage.getItem(WEBAPP_TOKEN_KEY));
  window.addEventListener("message", (event) => {
    if (event.source === window && event.origin === WEBAPP_ORIGIN && event.data?.type === "resumeAutoFiller.token") {
      push(event.data.token);
    }
  });
}

syncTokenFromWebapp();
checkPendingSubmission();

if (document.body) {
  startWatching();
} else {
  document.addEventListener("DOMContentLoaded", startWatching);
}
