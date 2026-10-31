import { useCallback, useEffect, useState } from "react";
import {
  clearToken,
  createGroup,
  deleteGroup,
  deleteMyAvailabilities,
  fetchCurrentUser,
  fetchGroup,
  fetchMyGroups,
  getToken,
  updateGroupStatus,
} from "./api";
import { CreateGroupPage } from "./components/CreateGroupPage";
import { HelpPage } from "./components/HelpPage";
import { HomePage } from "./components/HomePage";
import { UserIcon } from "./components/Icons";
import { LoginPage } from "./components/LoginPage";
import { SessionPage } from "./components/SessionPage";
import type { GroupCreatePayload, GroupSession, PageName, User } from "./types";

function getUrlSessionId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("session") || params.get("group");
}

function setUrlSessionId(sessionId: string | null) {
  const url = sessionId
    ? `${window.location.pathname}?session=${sessionId}`
    : window.location.pathname;
  window.history.replaceState(null, "", url);
}

function App() {
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<GroupSession | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [hasUnsavedPollChanges, setHasUnsavedPollChanges] = useState(false);
  const [pendingPage, setPendingPage] = useState<PageName | null>(null);

  const [page, setPage] = useState<PageName>(() => {
    return getUrlSessionId() ? "session" : "home";
  });

  const refreshMyGroups = useCallback(async () => {
    if (!getToken()) {
      setSessions([]);
      return;
    }
    setLoadingSessions(true);
    try {
      const myGroups = await fetchMyGroups();
      setSessions(myGroups);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const urlSessionId = getUrlSessionId();
      const token = getToken();

      if (token) {
        try {
          const user = await fetchCurrentUser();
          if (!cancelled) {
            setCurrentUser(user);
          }
          const myGroups = await fetchMyGroups();
          if (!cancelled) {
            setSessions(myGroups);
          }
        } catch {
          clearToken();
          if (!cancelled) {
            setCurrentUser(null);
            setSessions([]);
          }
        }
      }

      if (urlSessionId) {
        try {
          const grp = await fetchGroup(urlSessionId);
          if (!cancelled) {
            setActiveSession(grp);
            setSessionError(null);
            setPage("session");
          }
        } catch (err) {
          if (!cancelled) {
            setSessionError(
              err instanceof Error ? err.message : "Poll not found.",
            );
          }
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const performNavigate = (nextPage: PageName) => {
    setPendingPage(null);
    setHasUnsavedPollChanges(false);
    if (nextPage !== "session") {
      setUrlSessionId(null);
      setSessionError(null);
    }
    setPage(nextPage);
  };

  const navigateTo = (nextPage: PageName) => {
    if (page === "session" && hasUnsavedPollChanges && nextPage !== "session") {
      setPendingPage(nextPage);
      return;
    }
    performNavigate(nextPage);
  };

  const handleOpenSession = async (sessionId: string) => {
    setSessionError(null);
    setUrlSessionId(sessionId);
    const existing = sessions.find((s) => s.id === sessionId);
    if (existing) {
      setActiveSession(existing);
      setPage("session");
    }
    try {
      const fresh = await fetchGroup(sessionId);
      setActiveSession(fresh);
      setPage("session");
    } catch (err) {
      setSessionError(
        err instanceof Error ? err.message : "Failed to load poll.",
      );
      setPage("session");
    }
  };

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await refreshMyGroups();
    if (activeSession && getUrlSessionId()) {
      setPage("session");
    } else {
      navigateTo("home");
    }
  };

  const handleLogout = () => {
    clearToken();
    setCurrentUser(null);
    setSessions([]);
    navigateTo("login");
  };

  const handleCreateGroup = async (payload: GroupCreatePayload) => {
    const created = await createGroup(payload);
    await refreshMyGroups();
    setActiveSession(created);
    setUrlSessionId(created.id);
    setPage("session");
  };

  const handleQuitSession = async (sessionId: string) => {
    try {
      await deleteMyAvailabilities(sessionId);
      await refreshMyGroups();
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        navigateTo("home");
      }
    } catch {
      await refreshMyGroups();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteGroup(sessionId);
      await refreshMyGroups();
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        navigateTo("home");
      }
    } catch {
      await refreshMyGroups();
    }
  };

  const handleToggleCloseSession = async (
    sessionId: string,
    isClosed: boolean,
  ) => {
    try {
      await fetchGroup(sessionId);
      const updated = await updateGroupStatus(sessionId, isClosed);
      await refreshMyGroups();
      if (activeSession?.id === sessionId) {
        setActiveSession(updated);
      }
    } catch {
      await refreshMyGroups();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121318] text-white relative">
      <header className="relative z-20 border-b border-white/15 bg-black">
        <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateTo("home")}
            className="font-brand text-3xl text-white cursor-pointer tracking-wide"
          >
            TimeToMeet
          </button>

          <nav className="flex items-center gap-8">
            {(
              [
                { id: "create", label: "Create Poll" },
                { id: "home", label: "My Polls" },
                { id: "help", label: "Help" },
              ] as { id: PageName; label: string }[]
            ).map((item) => {
              const active =
                page === item.id || (item.id === "home" && page === "session");
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`py-1.5 text-base font-medium text-white transition-colors cursor-pointer border-b-2 ${
                    active
                      ? "border-[#4a628a]"
                      : "border-transparent hover:border-white/40"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => navigateTo("login")}
            className="inline-flex items-center gap-2 py-2 text-base font-medium text-white hover:opacity-80 transition-opacity cursor-pointer"
          >
            <UserIcon className="w-5 h-5" />
            <span>{currentUser ? currentUser.name : "Sign In"}</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-[1800px] mx-auto px-6 lg:px-12 py-8">
        {page === "home" && (
          <HomePage
            sessions={sessions}
            currentUser={currentUser}
            loading={loadingSessions}
            onOpenSession={handleOpenSession}
            onQuitSession={handleQuitSession}
            onDeleteSession={handleDeleteSession}
            onToggleCloseSession={handleToggleCloseSession}
            onNavigate={navigateTo}
          />
        )}

        {page === "login" && (
          <LoginPage
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}

        {page === "create" && (
          <CreateGroupPage
            currentUser={currentUser}
            onOpenLogin={() => navigateTo("login")}
            onCreateGroup={handleCreateGroup}
          />
        )}

        {page === "session" && (
          <>
            {sessionError ? (
              <div className="max-w-xl mx-auto p-6 rounded-md bg-[#181a20] border border-white/25 space-y-4">
                <div className="text-lg font-semibold text-white">
                  {sessionError}
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo("home")}
                  className="px-4 py-2 text-sm font-semibold bg-white text-black rounded-md cursor-pointer"
                >
                  Back to My Polls
                </button>
              </div>
            ) : activeSession ? (
              <SessionPage
                key={`${activeSession.id}-${currentUser?.id ?? "guest"}`}
                session={activeSession}
                currentUser={currentUser}
                onOpenLogin={() => performNavigate("login")}
                onBack={() => performNavigate("home")}
                onQuitSession={handleQuitSession}
                onDeleteSession={handleDeleteSession}
                onToggleCloseSession={handleToggleCloseSession}
                onSessionSync={setActiveSession}
                onSessionUpdated={refreshMyGroups}
                onUnsavedChangesChange={setHasUnsavedPollChanges}
                pendingNavigationPage={pendingPage}
                onConfirmPendingNavigation={performNavigate}
                onCancelPendingNavigation={() => setPendingPage(null)}
              />
            ) : (
              <div className="p-8 rounded-md bg-[#181a20] border border-white/15 text-base text-white">
                Loading poll...
              </div>
            )}
          </>
        )}

        {page === "help" && <HelpPage />}
      </main>
    </div>
  );
}

export default App;
