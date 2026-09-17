import { Link } from "react-router-dom";
import Nav from "../components/Nav";

const STEPS = [
  {
    title: "Sign up & upload your resume",
    body: "Create an account here and upload your resume PDF once. We parse it into structured fields -- name, contact info, education, skills.",
  },
  {
    title: "Fill in your voluntary info",
    body: "Add optional EEO details -- veteran status, gender, race/ethnicity -- so the extension can answer those too. Every field defaults to “prefer not to say.”",
  },
  {
    title: "Click Fill Application",
    body: "Install the extension, open any job application, and click the green button. Review what filled in, then submit it yourself.",
  },
];

const FEATURES = [
  { icon: "\u{1F3AF}", title: "Smart field matching", body: "Matches inputs by label, name, id, and placeholder text -- not just exact matches." },
  { icon: "⚡", title: "Works on real ATS forms", body: "Dispatches real input events so React-driven forms (Greenhouse, Workday) actually register the fill." },
  { icon: "\u{1F9FE}", title: "EEO questions included", body: "Veteran status, disability, gender, race/ethnicity -- entered once, filled everywhere, always optional." },
  { icon: "✅", title: "You stay in control", body: "The extension fills fields. It never clicks submit for you." },
  { icon: "\u{1F4C4}", title: "One resume, everywhere", body: "Upload once, reuse across every application without retyping a thing." },
  { icon: "\u{1F192}", title: "Free & open source", body: "No ads, no premium tier. Read the code or contribute on GitHub." },
];

export default function Landing() {
  return (
    <>
      <Nav />

      <section className="hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="container hero-grid">
          <div>
            <span className="badge">Free & open source</span>
            <h1 style={{ marginTop: 16 }}>
              Stop retyping your resume. <span className="accent">Click once.</span>
            </h1>
            <p className="lede">
              Upload your resume and your voluntary info once. Then on any job application, click
              one button and watch the fields fill themselves -- name, contact info, education,
              skills, even the EEO questions.
            </p>
            <div className="hero-cta-row">
              <Link to="/signup" className="btn btn-primary">
                Get started free
              </Link>
              <a href="#how-it-works" className="btn btn-secondary">
                See how it works
              </a>
            </div>
          </div>

          <div className="mock-browser">
            <div className="mock-browser-bar">
              <span className="mock-dot" />
              <span className="mock-dot" />
              <span className="mock-dot" />
            </div>
            <div className="mock-browser-body">
              <div className="mock-line" style={{ width: "40%" }} />
              <div className="mock-field" />
              <div className="mock-field" style={{ width: "80%" }} />
              <div className="mock-field" style={{ width: "60%" }} />
              <span className="mock-pill">✓ Fill Application</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container">
          <div className="section-heading">
            <h2>How it works</h2>
            <p>Three steps, then you never copy-paste your resume again.</p>
          </div>
          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div className="step-card" key={step.title}>
                <div className="step-number">{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Everything an application asks for</h2>
            <p>Including the parts most autofillers skip.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card privacy-card">
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Where your data actually goes</h2>
            <p style={{ marginBottom: 10 }}>
              Your resume PDF is uploaded over HTTPS, parsed in memory, and discarded -- the raw
              file is never stored. What we keep is the structured fields extracted from it, plus
              any EEO info you choose to enter, so you don't have to re-upload every time.
            </p>
            <p>
              Filling itself happens entirely in your browser: the extension reads your stored
              profile and writes it into the page. No ads, no tracking, no selling data.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer" style={{ borderTop: "none", padding: 0 }}>
          <span>© 2026 Resume Auto-Filler -- MIT licensed</span>
          <a href="https://github.com/roridemonslayer/resume-auto-filler" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
