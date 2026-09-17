import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/Nav";
import { OptionalToggleDiagram, ResumeToFieldsDiagram, ReviewSubmitDiagram } from "../components/Diagrams";

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

const CURTAIN_ROWS = [
  {
    title: "One click, every field.",
    body: "Matches inputs by label, name, and placeholder -- not just exact field names -- and dispatches real input events so React-driven ATS forms like Greenhouse actually register the fill.",
    Diagram: ResumeToFieldsDiagram,
  },
  {
    title: "You stay in control.",
    body: "The extension fills fields. It never clicks submit for you -- you review every answer first, then submit it yourself.",
    Diagram: ReviewSubmitDiagram,
  },
  {
    title: "Optional means optional.",
    body: "Veteran status, gender, race/ethnicity -- every EEO field defaults to unset. Nothing is guessed or pre-selected for you.",
    Diagram: OptionalToggleDiagram,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function StepsGrid() {
  return (
    <div className="steps-grid">
      {STEPS.map((step, i) => (
        <motion.div
          className="step-card"
          key={step.title}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
          whileHover={{ y: -6, boxShadow: "0 12px 32px rgba(15,107,60,0.12)" }}
        >
          <div className="step-number">{i + 1}</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

function CurtainSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 40%"] });
  const radius = useTransform(scrollYProgress, [0, 1], [56, 0]);

  return (
    <motion.section className="curtain-section" ref={ref} style={{ borderTopLeftRadius: radius, borderTopRightRadius: radius }}>
      <div className="container">
        <div className="curtain-heading">
          <h2>What actually happens when you click Fill.</h2>
          <p>The mechanics, not just the pitch.</p>
        </div>

        {CURTAIN_ROWS.map((row, i) => (
          <motion.div
            className="curtain-row"
            key={row.title}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
          >
            <div>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
            </div>
            <div className="curtain-diagram">
              <row.Diagram />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
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
          <StepsGrid />
        </div>
      </section>

      <CurtainSection />

      <section className="section">
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
