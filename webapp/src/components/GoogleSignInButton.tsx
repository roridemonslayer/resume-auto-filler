import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const GOOGLE_SIGNIN_ENABLED = Boolean(GOOGLE_CLIENT_ID);
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in script"));
    document.head.appendChild(script);
  });
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
}

export default function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 332,
          text: "continue_with",
        });
      })
      .catch(() => setLoadError(true));

    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  // Not configured yet -- this is expected until GOOGLE_CLIENT_ID is set up
  // (see webapp/DEV.md), so stay quiet rather than showing a broken button.
  if (!GOOGLE_CLIENT_ID) return null;

  if (loadError) {
    return <div className="hint">Google sign-in is temporarily unavailable.</div>;
  }

  return <div ref={containerRef} style={{ display: "flex", justifyContent: "center" }} />;
}
