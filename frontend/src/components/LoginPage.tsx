import { useState } from "react";
import { fetchCurrentUser, loginUser, registerUser, setToken } from "../api";
import type { User } from "../types";

interface LoginPageProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
}

export function LoginPage({ currentUser, onLogin, onLogout }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "register" && !trimmedNickname) {
      setError("Please enter a nickname.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await registerUser(trimmedNickname, trimmedEmail, password);
      }

      const tokenRes = await loginUser(trimmedEmail, password);
      setToken(tokenRes.access_token);
      const profile = await fetchCurrentUser();
      onLogin(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto pt-4 space-y-8">
      <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-5">
        <h1 className="text-3xl sm:text-4xl font-semibold text-white">
          Account Management
        </h1>
        {!currentUser && (
          <div className="inline-flex rounded-md bg-[#181a20] border border-white/20 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`px-4 py-1.5 text-sm font-semibold rounded-sm transition-colors cursor-pointer ${
                mode === "login"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`px-4 py-1.5 text-sm font-semibold rounded-sm transition-colors cursor-pointer ${
                mode === "register"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Register
            </button>
          </div>
        )}
      </div>

      {currentUser ? (
        <div className="p-6 rounded-md bg-[#181a20] border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
          <div className="space-y-1">
            <div className="text-xl font-semibold">{currentUser.name}</div>
            {currentUser.email && (
              <div className="text-sm font-mono text-white">
                {currentUser.email}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#121318] hover:bg-white/10 border border-white/20 rounded-md transition-transform active:scale-95 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="login-email-input"
                className="block text-xs font-semibold uppercase tracking-wider text-white mb-2"
              >
                Email
              </label>
              <input
                id="login-email-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {mode === "register" && (
              <div>
                <label
                  htmlFor="login-nickname-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-white mb-2"
                >
                  Nickname
                </label>
                <input
                  id="login-nickname-input"
                  type="text"
                  autoComplete="name"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Alice Nowak"
                  className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="login-password-input"
                className="block text-xs font-semibold uppercase tracking-wider text-white mb-2"
              >
                Password
              </label>
              <input
                id="login-password-input"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="px-4 py-3 text-sm text-white bg-[#181a20] border border-white/30 rounded-md"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 bg-white hover:bg-white/90 text-black text-base font-semibold rounded-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log In"
                : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
