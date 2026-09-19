import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/Nav";
import { OptionalToggleDiagram, ResumeToFieldsDiagram, ReviewSubmitDiagram } from "../components/Diagrams";
import { ArrowUpRightIcon } from "../components/Icons";

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

const FACTS = [
  { tone: "tone-lime", num: "1", text: "click to fill a whole application" },
  { tone: "tone-lilac", num: "0", text: "applications submitted on your behalf" },
  { tone: "tone-peach", num: "5", text: "voluntary EEO fields, every one opt-in" },
];

const MARQUEE_ITEMS = [
  "Name",
  "Email",
  "Phone",
  "Education",
  "Skills",
  "Work history",
  "Veteran status",
  "Gender",
  "Race / ethnicity",
  "Disability status",
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <div className="marquee">
        <div className="marquee-track">
          {[0, 1].map((copy) =>
            items.map((item, i) => (
              <span className="marquee-item" key={`${copy}-${i}`}>
                {item}
                <span className="marquee-star">✦</span>
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

function MockBrowser() {
  return (
    <div className="mock-browser">
      <div className="mock-browser-bar">
        <span className="mock-dot" />
        <span className="mock-dot" />
        <span className="mock-dot" />
        <span className="mock-url">jobs.example.com/apply</span>
      </div>
      <div className="mock-browser-body">
        <div className="mock-title">Apply for this role</div>
        <div className="mock-label">Full name</div>
        <div className="mock-field" style={{ "--w": "46%", "--d": "0.4s" } as React.CSSProperties} />
        <div className="mock-label">Email</div>
        <div className="mock-field" style={{ "--w": "62%", "--d": "0.9s" } as React.CSSProperties} />
        <div className="mock-label">Phone</div>
        <div className="mock-field" style={{ "--w": "38%", "--d": "1.4s" } as React.CSSProperties} />
        <div className="mock-label">Veteran status</div>
        <div className="mock-field" style={{ "--w": "54%", "--d": "1.9s" } as React.CSSProperties} />
        <span className="mock-pill">✓ Fill Application</span>
      </div>
    </div>
  );
}

function CurtainSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 40%"] });
  const radius = useTransform(scrollYProgress, [0, 1], [72, 0]);

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
            transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
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

      <header className="hero">
        <div className="hero-glow" />
        <div className="container hero-inner">
          <motion.span
            className="badge"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <span className="badge-dot" />
            Free & open source
          </motion.span>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="line">Stop retyping</span>
            <span className="line">your resume.</span>
            <span className="line">
              <span className="accent">Click once.</span>
            </span>
          </motion.h1>

          <div className="hero-bottom">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            >
              <p className="lede">
                Upload your resume and your voluntary info once. Then on any job application, click
                one button and watch the fields fill themselves -- name, contact info, education,
                skills, even the EEO questions.
              </p>
              <div className="hero-cta-row">
                <Link to="/signup" className="btn btn-primary">
                  Get started free
                  <span className="btn-icon">
                    <ArrowUpRightIcon />
                  </span>
                </Link>
                <a href="#how-it-works" className="btn btn-secondary">
                  See how it works
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
            >
              <MockBrowser />
            </motion.div>
          </div>
        </div>
      </header>

      <Marquee />

      <section className="section" id="how-it-works">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">How it works</span>
            <h2>Three steps. Then never again.</h2>
            <p>Set it up once, and every application after that is a single click.</p>
          </div>

          <div className="steps-list">
            {STEPS.map((step, i) => (
              <motion.div
                className="step-row"
                key={step.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
              >
                <div className="step-number">0{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 96 }}>
        <div className="facts-grid">
          {FACTS.map((fact, i) => (
            <motion.div
              className={`fact-tile ${fact.tone}`}
              key={fact.text}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -8 }}
            >
              <div className="fact-num">{fact.num}</div>
              <p>{fact.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <CurtainSection />

      <section className="section">
        <div className="container">
          <motion.div
            className="card privacy-card"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <h2>Where your data actually goes.</h2>
            <div>
              <p>
                Your resume PDF is uploaded over HTTPS and parsed. We keep the PDF itself so the
                extension can attach it to applications for you, along with the fields extracted
                from it and any EEO info you choose to enter. You can delete the file any time.
              </p>
              <p>
                Filling itself happens entirely in your browser: the extension reads your stored
                profile and writes it into the page. No ads, no tracking, no selling data.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="statement-band">
        <div className="container">
          <h2>Typed once. Applied everywhere.</h2>
          <Link to="/signup" className="btn btn-dark">
            Get started free
            <span className="btn-icon">
              <ArrowUpRightIcon />
            </span>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span>© 2026 Resume Auto-Filler -- MIT licensed</span>
          <a href="https://github.com/roridemonslayer/resume-auto-filler" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
