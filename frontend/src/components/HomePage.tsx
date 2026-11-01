import { useEffect, useState } from "react";
import { formatCreationDate } from "../Utils";
import type { GroupSession, PageName, User } from "../types";
import { ArrowRightIcon, CheckIcon, PlusIcon, TrashIcon } from "./Icons";

interface HomePageProps {
  sessions: GroupSession[];
  currentUser: User | null;
  loading: boolean;
  onOpenSession: (sessionId: string) => void;
  onToggleCloseSession: (sessionId: string, isClosed: boolean) => void;
  onQuitSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNavigate: (page: PageName) => void;
}

export function HomePage({
  sessions,
  currentUser,
  loading,
  onOpenSession,
  onToggleCloseSession,
  onQuitSession,
  onDeleteSession,
  onNavigate,
}: HomePageProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [alignMenuLeft, setAlignMenuLeft] = useState(false);
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(
    null,
  );
  const sortedSessions = [...sessions].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  useEffect(() => {
    if (!openMenuId) return;

    const handleOutsideClick = () => {
      setOpenMenuId(null);
      setConfirmingSessionId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        setConfirmingSessionId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-5">
        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
          My Polls
        </h1>
        {currentUser ? (
          <button
            type="button"
            onClick={() => onNavigate("create")}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-white/90 text-black text-xs sm:text-sm font-semibold rounded-md transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Poll</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-white/90 text-black text-xs sm:text-sm font-semibold rounded-md transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <span>Log In to Create Poll</span>
          </button>
        )}
      </div>

      {!currentUser ? (
        <div className="p-8 rounded-md bg-[#181a20] border border-white/15 space-y-4 text-white">
          <div className="text-lg font-semibold">
            Sign in to view your created and joined polls.
          </div>
          <p className="text-sm text-white">
            If you have a direct link to a poll, open that link in your browser
            to vote as a guest or signed-in user.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="px-5 py-2.5 bg-white hover:bg-white/90 text-black text-sm font-semibold rounded-md transition-transform active:scale-95 cursor-pointer"
          >
            Go to Log In / Register
          </button>
        </div>
      ) : loading ? (
        <div className="p-8 rounded-md bg-[#181a20] border border-white/15 text-base text-white">
          Loading polls...
        </div>
      ) : sortedSessions.length === 0 ? (
        <div className="p-8 rounded-md bg-[#181a20] border border-white/15 text-base text-white">
          You have no polls yet. Create a new poll or join one via a shared
          link.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSessions.map((s) => {
            const isCreator = currentUser.id === s.creator_id;
            const authorLabel =
              s.creator_name || (isCreator ? currentUser.name : "Organizer");
            const isMenuOpen = openMenuId === s.id;
            const isConfirming = confirmingSessionId === s.id;

            return (
              <div
                key={s.id}
                onClick={() => onOpenSession(s.id)}
                className="group p-4 sm:p-6 rounded-md bg-[#181a20] border border-white/15 hover:bg-white/[0.06] hover:border-white/40 transition-colors duration-150 cursor-pointer flex items-center justify-between gap-3 sm:gap-6"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <h2
                      title={s.title}
                      className="text-xl sm:text-2xl font-semibold text-white truncate max-w-full"
                    >
                      {s.title}
                    </h2>
                    {s.is_closed && (
                      <span className="px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider bg-[#3b5278] text-white rounded-md border border-white/25 shrink-0">
                        Closed
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-white truncate">
                    Author: {authorLabel}
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-white">
                    Created: {formatCreationDate(s.created_at)}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    aria-label={`Open poll ${s.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSession(s.id);
                    }}
                    className="p-2 sm:p-2.5 rounded-md bg-white text-black group-hover:translate-x-0.5 transition-transform shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <div
                    className="relative"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      onClick={(e) => {
                        setConfirmingSessionId(null);
                        if (!isMenuOpen) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setAlignMenuLeft(rect.right < 220);
                        }
                        setOpenMenuId((prev) => (prev === s.id ? null : s.id));
                      }}
                      className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-md bg-[#121318] hover:bg-white/10 border border-white/20 text-xs font-semibold text-white cursor-pointer"
                    >
                      Manage ▾
                    </button>

                    {isMenuOpen && (
                      <div
                        role="menu"
                        className={`absolute ${
                          alignMenuLeft ? "left-0" : "right-0"
                        } mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-md bg-black border border-white/25 shadow-2xl z-30 py-1`}
                      >
                        {isCreator ? (
                          <>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                setConfirmingSessionId(null);
                                onToggleCloseSession(s.id, !s.is_closed);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                            >
                              <CheckIcon className="w-4 h-4" />
                              <span>
                                {s.is_closed ? "Reopen Poll" : "Close Poll"}
                              </span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                if (!isConfirming) {
                                  setConfirmingSessionId(s.id);
                                  return;
                                }
                                setOpenMenuId(null);
                                setConfirmingSessionId(null);
                                onDeleteSession(s.id);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                                isConfirming
                                  ? "bg-white text-black"
                                  : "text-white hover:bg-white/10"
                              }`}
                            >
                              <TrashIcon className="w-4 h-4" />
                              <span>
                                {isConfirming
                                  ? "Click again to confirm"
                                  : "Delete Poll"}
                              </span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              if (!isConfirming) {
                                setConfirmingSessionId(s.id);
                                return;
                              }
                              setOpenMenuId(null);
                              setConfirmingSessionId(null);
                              onQuitSession(s.id);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                              isConfirming
                                ? "bg-white text-black"
                                : "text-white hover:bg-white/10"
                            }`}
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span>
                              {isConfirming
                                ? "Click again to confirm"
                                : "Quit Poll"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
