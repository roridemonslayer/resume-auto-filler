const stroke = "rgba(255,255,255,0.85)";
const strokeDim = "rgba(255,255,255,0.35)";
const fillSoft = "rgba(255,255,255,0.12)";

// Resume document with dashed lines connecting to filled-in form fields.
export function ResumeToFieldsDiagram() {
  return (
    <svg viewBox="0 0 260 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="18" width="70" height="94" rx="8" stroke={stroke} strokeWidth="1.5" />
      <line x1="30" y1="38" x2="72" y2="38" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="52" x2="62" y2="52" stroke={strokeDim} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="66" x2="66" y2="66" stroke={strokeDim} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="80" x2="58" y2="80" stroke={strokeDim} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="94" x2="64" y2="94" stroke={strokeDim} strokeWidth="2" strokeLinecap="round" />

      {[30, 65, 100].map((y, i) => (
        <path
          key={y}
          className="flow-line"
          d={`M92,${45 + i * 4} C120,${45 + i * 4} 120,${y} 148,${y}`}
          stroke={strokeDim}
          strokeWidth="1.25"
          strokeDasharray="3 4"
        />
      ))}

      {[30, 65, 100].map((y) => (
        <rect key={y} x="150" y={y - 10} width="94" height="20" rx="6" fill={fillSoft} stroke={stroke} strokeWidth="1.5" />
      ))}
      <path d="M160 30 l4 4 l8 -8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160 65 l4 4 l8 -8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160 100 l4 4 l8 -8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Filled fields leading to an un-clicked "Submit" button -- the human clicks it.
export function ReviewSubmitDiagram() {
  return (
    <svg viewBox="0 0 260 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 1, 2].map((i) => (
        <rect key={i} x="16" y={24 + i * 34} width="90" height="20" rx="6" fill={fillSoft} stroke={stroke} strokeWidth="1.5" />
      ))}
      <path d="M26 34 l4 4 l8 -8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 68 l4 4 l8 -8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 102 l4 4 l8 -8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <path className="flow-line" d="M118 68 L150 68" stroke={strokeDim} strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M144 62 L150 68 L144 74" stroke={strokeDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="160" y="52" width="84" height="32" rx="8" stroke="white" strokeWidth="1.75" />
      <text x="202" y="72" textAnchor="middle" fill="white" fontSize="12" fontFamily="inherit" fontWeight="700">
        Submit
      </text>
      <text x="188" y="104" textAnchor="middle" fontSize="10" fill={strokeDim}>
        you click
      </text>
      <circle cx="222" cy="100" r="4" fill="white" opacity="0.9" />
      <path d="M222 100 L216 106" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// An "off" toggle labeled Not set, plus a chip for the explicit decline option.
export function OptionalToggleDiagram() {
  return (
    <svg viewBox="0 0 260 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="30" width="64" height="30" rx="15" stroke={stroke} strokeWidth="1.5" fill={fillSoft} />
      <circle className="toggle-knob" cx="36" cy="45" r="10" fill="white" />
      <text x="52" y="80" fontSize="12" fill="white" fontWeight="700">
        Not set
      </text>
      <text x="20" y="98" fontSize="11" fill={strokeDim}>
        won't be filled
      </text>

      <rect x="140" y="26" width="116" height="40" rx="18" stroke={stroke} strokeWidth="1.5" />
      <text x="198" y="42" textAnchor="middle" fontSize="10" fill="white">
        I don't wish
      </text>
      <text x="198" y="56" textAnchor="middle" fontSize="10" fill="white">
        to answer
      </text>
      <text x="140" y="84" fontSize="11" fill={strokeDim}>
        chosen deliberately,
      </text>
      <text x="140" y="98" fontSize="11" fill={strokeDim}>
        not guessed for you
      </text>
    </svg>
  );
}
