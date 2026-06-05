import { useEffect, useState } from "react";
import { api } from "../api/client";
import { apiUrl, getApiBaseUrl } from "../api/config";

type GoogleStatus = {
  enabled: boolean;
  envFileExists: boolean;
  clientIdSet: boolean;
  secretSet: boolean;
  redirectUri?: string;
  setupCommand: string;
};

type HealthResponse = {
  ok: boolean;
  google?: GoogleStatus;
};

export default function GoogleSignInButton() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const base = getApiBaseUrl();
    if (!base) {
      setStatus(null);
      setLoadError(
        "VITE_API_URL is not set. In Vercel → Settings → Environment Variables, add VITE_API_URL = your Railway URL, then Redeploy.",
      );
      return;
    }

    api<HealthResponse>("/health")
      .then((data) => {
        if (data.google) {
          setStatus(data.google);
          setLoadError("");
        } else {
          return api<GoogleStatus>("/auth/google/status").then((s) => {
            setStatus(s);
            setLoadError("");
          });
        }
      })
      .catch(() => {
        setStatus(null);
        setLoadError(
          `Cannot reach API at ${base}. Check Railway is running and open ${base}/api/health in your browser.`,
        );
      });
  }, []);

  const showSetupHint = status !== null && !status.enabled;

  return (
    <div className="google-signin-wrap">
      <a href={apiUrl("/auth/google")} className="btn btn-google">
        <GoogleIcon />
        Continue with Google
      </a>
      {loadError && (
        <p className="google-setup-hint setup-missing">{loadError}</p>
      )}
      {status?.enabled && status.redirectUri && (
        <p className="google-redirect-hint">
          If Google shows <strong>redirect_uri_mismatch</strong>, add this exact URI in{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
          >
            Google Cloud Console
          </a>{" "}
          → OAuth client → <strong>Authorized redirect URIs</strong>:
          <code className="redirect-uri-code">{status.redirectUri}</code>
        </p>
      )}
      {showSetupHint && (
        <div className="google-setup-hint">
          <p>
            <strong>Google OAuth not configured.</strong> Set{" "}
            <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> on Railway.
          </p>
          {!status.envFileExists && (
            <p className="setup-missing">Locally: run <code>npm run setup:google</code></p>
          )}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
