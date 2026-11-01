import { useEffect, useRef, useState } from "react";
import type { GroupSession, User } from "../../types";
import { ArrowLeftIcon, CheckIcon, LinkIcon, TrashIcon } from "../Icons";

interface SessionHeaderProps {
  session: GroupSession;
  currentUser: User | null;
  guestName: string | null;
  isCreator: boolean;
  isClosed: boolean;
  isParticipant: boolean;
  hasChoices: boolean;
  hasUnsavedChanges: boolean;
  saving: boolean;
  showSavedText: boolean;
  gridMode: "vote" | "inspect";
  onBackClick: () => void;
  onChangeGuestName: () => void;
  onSelectVoteMode: () => void;
  onSelectInspectMode: () => void;
  onSaveChoices: () => void;
  onToggleClose: () => void;
  onClearMine: () => void;
  onQuitSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "2em";
    textarea.style.height = "2em";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (successful) return true;
  } catch {
    // fallback below
  }

  if (typeof window !== "undefined" && window.prompt) {
    window.prompt("Copy link:", text);
    return true;
  }

  return false;
}

export function SessionHeader({
  session,
  currentUser,
  guestName,
  isCreator,
  isClosed,
  isParticipant,
  hasChoices,
  hasUnsavedChanges,
  saving,
  showSavedText,
  gridMode,
  onBackClick,
  onChangeGuestName,
  onSelectVoteMode,
  onSelectInspectMode,
  onSaveChoices,
  onToggleClose,
  onClearMine,
  onQuitSession,
  onDeleteSession,
}: SessionHeaderProps) {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [alignMenuLeft, setAlignMenuLeft] = useState(false);
  const [confirmPollAction, setConfirmPollAction] = useState<
    "delete" | "quit" | null
  >(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  const canShowPollOptionsMenu =
    (!isClosed && hasChoices) ||
    isCreator ||
    (Boolean(currentUser) && isParticipant);

  useEffect(() => {
    if (!showOptionsMenu) return;

    const handleOutsideClick = () => {
      setShowOptionsMenu(false);
      setConfirmPollAction(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowOptionsMenu(false);
        setConfirmPollAction(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showOptionsMenu]);

  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?session=${session.id}`;
    const success = await copyTextToClipboard(shareUrl);
    if (success) {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      setCopiedLink(true);
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopiedLink(false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/15 pb-5">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          type="button"
          onClick={onBackClick}
          aria-label="Back to My Polls"
          className="p-2.5 bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md text-white transition-transform active:scale-95 cursor-pointer shrink-0"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <h1
              title={`Meeting: ${session.title}`}
              className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-normal text-white truncate max-w-full -my-1 py-1 -ml-0.5 pl-0.5"
            >
              Meeting: {session.title}
            </h1>
            {isClosed && (
              <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-white text-black rounded-md shrink-0">
                Closed
              </span>
            )}
          </div>
          {!isClosed && !currentUser && guestName && (
            <div className="text-sm font-mono text-white mt-1">
              Voting as guest: {guestName}{" "}
              <button
                type="button"
                onClick={onChangeGuestName}
                className="underline cursor-pointer ml-2"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {!isClosed && (
          <div className="inline-flex rounded-md bg-[#181a20] border border-white/20 p-1">
            <button
              type="button"
              onClick={onSelectInspectMode}
              className={`px-3 py-1.5 text-sm font-semibold rounded-sm transition-colors cursor-pointer ${
                gridMode === "inspect"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Inspect
            </button>
            <button
              type="button"
              onClick={onSelectVoteMode}
              className={`px-3 py-1.5 text-sm font-semibold rounded-sm transition-colors cursor-pointer ${
                gridMode === "vote"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Vote
            </button>
          </div>
        )}

        {!isClosed && hasUnsavedChanges && (
          <button
            type="button"
            disabled={saving}
            onClick={onSaveChoices}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save my choices"}</span>
          </button>
        )}

        {showSavedText && !hasUnsavedChanges && (
          <span className="text-sm font-medium text-white">
            Successfully saved
          </span>
        )}

        {canShowPollOptionsMenu && (
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              ref={optionsButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={showOptionsMenu}
              onClick={() => {
                setConfirmPollAction(null);
                if (!showOptionsMenu && optionsButtonRef.current) {
                  const rect = optionsButtonRef.current.getBoundingClientRect();
                  setAlignMenuLeft(rect.right < 240);
                }
                setShowOptionsMenu((prev) => !prev);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md transition-transform active:scale-95 cursor-pointer"
            >
              <span>Poll Options ▾</span>
            </button>

            {showOptionsMenu && (
              <div
                role="menu"
                className={`absolute ${
                  alignMenuLeft ? "left-0" : "right-0"
                } mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-md bg-black border border-white/25 shadow-2xl z-40 py-1`}
              >
                {currentUser && !isCreator && isParticipant && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={saving}
                    onClick={() => {
                      if (confirmPollAction !== "quit") {
                        setConfirmPollAction("quit");
                        return;
                      }
                      setShowOptionsMenu(false);
                      setConfirmPollAction(null);
                      onQuitSession(session.id);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 cursor-pointer ${
                      confirmPollAction === "quit"
                        ? "bg-white text-black"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>
                      {confirmPollAction === "quit"
                        ? "Click again to confirm"
                        : "Quit Poll"}
                    </span>
                  </button>
                )}

                {isCreator && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={saving}
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setConfirmPollAction(null);
                      onToggleClose();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>{isClosed ? "Reopen Poll" : "Close Poll"}</span>
                  </button>
                )}

                {!isClosed && hasChoices && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={saving}
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setConfirmPollAction(null);
                      onClearMine();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete my choices</span>
                  </button>
                )}

                {isCreator && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={saving}
                    onClick={() => {
                      if (confirmPollAction !== "delete") {
                        setConfirmPollAction("delete");
                        return;
                      }
                      setShowOptionsMenu(false);
                      setConfirmPollAction(null);
                      onDeleteSession(session.id);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 cursor-pointer ${
                      confirmPollAction === "delete"
                        ? "bg-white text-black"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>
                      {confirmPollAction === "delete"
                        ? "Click again to confirm"
                        : "Delete Poll"}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleCopyShareLink}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-md transition-transform active:scale-95 cursor-pointer"
        >
          {copiedLink ? (
            <>
              <CheckIcon className="w-4 h-4" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
