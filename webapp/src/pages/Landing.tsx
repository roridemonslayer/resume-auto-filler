import { motion } from "framer-motion";
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
  { icon: "\u{1F513}", title: "Free & open source", body: "No ads, no premium tier. Read the code or contribute on GitHub." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function RevealGrid({ items, className }: { items: { icon?: string; title: string; body: string }[]; className: string }) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <motion.div
          className={className === "steps-grid" ? "step-card" : "feature-card"}
          key={item.title}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
          whileHover={{ y: -6, boxShadow: "0 12px 32px rgba(15,107,60,0.12)" }}
        >
          {className === "steps-grid" ? (
            <div className="step-number">{i + 1}</div>
          ) : (
            <div className="feature-icon">{item.icon}</div>
          )}
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <Nav />

      <section className="hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="container hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <span className="badge badge-dark">
              <span className="badge-dot" />
              Free & open source
            </span>
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
              <a href="#how-it-works" className="btn btn-outline-dark">
                See how it works
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          >
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
          </motion.div>
        </div>

        <div className="wave-divider">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0,32 C240,80 480,0 720,24 C960,48 1200,88 1440,40 L1440,80 L0,80 Z"
              fill="var(--bg)"
            />
          </svg>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container">
          <div className="section-heading">
            <h2>How it works</h2>
            <p>Three steps, then you never copy-paste your resume again.</p>
          </div>
          <RevealGrid items={STEPS} className="steps-grid" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Everything an application asks for</h2>
            <p>Including the parts most autofillers skip.</p>
          </div>
          <RevealGrid items={FEATURES} className="features-grid" />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <motion.div
            className="card privacy-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
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
          </motion.div>
        </div>
      </section>

      <section className="statement-band">
        <div className="container">
          <h2>Your resume, typed once. Applied everywhere.</h2>
          <Link to="/signup" className="btn btn-primary">
            Get started free
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span>© 2026 Resume Auto-Filler -- MIT licensed</span>
          <a href="https://github.com/roridemonslayer/resume-auto-filler" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
