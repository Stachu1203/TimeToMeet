import { useEffect, useRef, useState } from "react";

interface IdentityModalProps {
  title: string;
  onSelectGuestName: (guestName: string) => void;
  onGoToLogin: () => void;
  onClose?: () => void;
}

export function IdentityModal({
  title,
  onSelectGuestName,
  onGoToLogin,
  onClose,
}: IdentityModalProps) {
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed) {
      setError("Please enter a guest name.");
      return;
    }

    setError("");
    onSelectGuestName(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-md bg-[#181a20] border border-white/25 p-6 space-y-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/15 pb-4">
          <h2
            id="identity-modal-title"
            className="text-2xl font-semibold text-white"
          >
            {title}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-md cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

        <form onSubmit={handleGuestSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="guest-nickname-input"
              className="block text-xs font-semibold uppercase tracking-wider text-white mb-2"
            >
              Vote as Guest (No Account Needed)
            </label>
            <input
              id="guest-nickname-input"
              type="text"
              autoFocus
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your guest nickname"
              className="w-full px-4 py-3 text-base bg-[#121318] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="px-4 py-2.5 text-sm text-white bg-[#121318] border border-white/30 rounded-md"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-5 bg-white hover:bg-white/90 text-black text-base font-semibold rounded-md transition-transform active:scale-95 cursor-pointer"
          >
            Continue as Guest
          </button>
        </form>

        <div className="pt-4 border-t border-white/15 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white">
            Or sign in with an account
          </div>
          <button
            type="button"
            onClick={onGoToLogin}
            className="w-full py-2.5 px-4 bg-[#121318] hover:bg-white/10 text-white border border-white/20 text-sm font-semibold rounded-md transition-transform active:scale-95 cursor-pointer"
          >
            Go to Log In / Register
          </button>
        </div>
      </div>
    </div>
  );
}
