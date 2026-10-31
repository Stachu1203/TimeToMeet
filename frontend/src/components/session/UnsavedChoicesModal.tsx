import { useEffect, useRef } from "react";
import { CheckIcon } from "../Icons";

interface UnsavedChoicesModalProps {
  saving: boolean;
  onCancel: () => void;
  onDiscardAndContinue: () => void;
  onSaveAndContinue: () => void;
}

export function UnsavedChoicesModal({
  saving,
  onCancel,
  onDiscardAndContinue,
  onSaveAndContinue,
}: UnsavedChoicesModalProps) {
  const reminderDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab" && reminderDialogRef.current) {
        const focusable =
          reminderDialogRef.current.querySelectorAll<HTMLElement>(
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
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-reminder-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div
        ref={reminderDialogRef}
        className="w-full max-w-md rounded-md bg-[#181a20] border border-white/25 p-6 shadow-2xl space-y-5 text-white"
      >
        <div className="space-y-2">
          <h2
            id="unsaved-reminder-title"
            className="text-xl font-semibold text-white"
          >
            Save your choices?
          </h2>
          <p className="text-sm text-white">
            You have unsaved availability choices in this poll. Would you like
            to save them before switching tabs?
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium bg-[#121318] hover:bg-white/10 border border-white/20 text-white rounded-md cursor-pointer"
          >
            Stay Here
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onDiscardAndContinue}
            className="px-4 py-2 text-sm font-medium bg-[#121318] hover:bg-white/10 border border-white/20 text-white rounded-md cursor-pointer"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSaveAndContinue}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-md cursor-pointer disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save & Continue"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
