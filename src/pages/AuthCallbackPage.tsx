import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");

    if (err) {
      setError(decodeURIComponent(err));
      return;
    }

    if (!token) {
      setError("Missing sign-in token. Please try again.");
      return;
    }

    completeOAuth(token)
      .then(() => navigate("/", { replace: true }))
      .catch(() => setError("Could not complete sign-in. Please try again."));
  }, [searchParams, completeOAuth, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Sign-in failed</h1>
          <p className="form-error">{error}</p>
          <Link to="/login" className="btn btn-primary">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <p className="page-loading">Completing Google sign-in…</p>
    </div>
  );
}
