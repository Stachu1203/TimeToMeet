import { useState } from "react";
import { CreateGroupPage } from "./components/CreateGroupPage";
import { HelpPage } from "./components/HelpPage";
import { HomePage } from "./components/HomePage";
import { UserIcon } from "./components/Icons";
import { LoginPage } from "./components/LoginPage";
import { SessionPage } from "./components/SessionPage";
import { DEMO_USERS, INITIAL_SESSIONS } from "./mockData";
import type { GroupCreatePayload, GroupSession, PageName, User } from "./types";

function App() {
  const [sessions, setSessions] = useState<GroupSession[]>(INITIAL_SESSIONS);
  const [currentUser, setCurrentUser] = useState<User | null>(DEMO_USERS[0]);
  const [activeSessionId, setActiveSessionId] = useState<string>(
    INITIAL_SESSIONS[0].id,
  );

  const [page, setPage] = useState<PageName>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session")) return "session";
    return "home";
  });

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const handleOpenSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setPage("session");
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setPage("home");
  };

  const handleCreateGroup = (payload: GroupCreatePayload) => {
    const newId = crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}`;

    const creator = currentUser ?? {
      id: "u-admin",
      name: "Organizer",
    };

    const todayStr = new Date().toISOString().slice(0, 10);

    const newSession: GroupSession = {
      id: newId,
      creator_id: creator.id,
      title: payload.title,
      created_at: todayStr,
      timezone: payload.timezone,
      grid_start_hour: payload.grid_start_hour,
      grid_end_hour: payload.grid_end_hour,
      days: payload.dates.map((d, idx) => ({
        id: `${newId}-day-${idx}`,
        group_id: newId,
        date: d,
      })),
      participants: [creator],
      userSlots: {
        [creator.id]: [],
      },
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setPage("session");
  };

  const handleSaveUserSlots = (
    sessionId: string,
    user: User,
    slots: string[],
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const exists = s.participants.some((p) => p.id === user.id);
        const updatedParticipants = exists
          ? s.participants
          : [...s.participants, user];

        return {
          ...s,
          participants: updatedParticipants,
          userSlots: {
            ...s.userSlots,
            [user.id]: slots,
          },
        };
      }),
    );
  };

  const handleClearUserSlots = (sessionId: string, userId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          userSlots: {
            ...s.userSlots,
            [userId]: [],
          },
        };
      }),
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121318] text-white relative">
      <header className="relative z-20 border-b border-white/15 bg-black">
        <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPage("home")}
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
                  onClick={() => setPage(item.id)}
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
            onClick={() => setPage("login")}
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
            onOpenSession={handleOpenSession}
            onNavigate={setPage}
          />
        )}

        {page === "login" && (
          <LoginPage
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={() => setCurrentUser(null)}
          />
        )}

        {page === "create" && (
          <CreateGroupPage
            onCreateGroup={handleCreateGroup}
            onCancel={() => setPage("home")}
          />
        )}

        {page === "session" && (
          <SessionPage
            key={`${activeSession.id}-${currentUser?.id ?? "guest"}`}
            session={activeSession}
            currentUser={currentUser}
            onSaveUserSlots={handleSaveUserSlots}
            onClearUserSlots={handleClearUserSlots}
            onOpenLogin={() => setPage("login")}
            onBack={() => setPage("home")}
          />
        )}

        {page === "help" && <HelpPage />}
      </main>
    </div>
  );
}

export default App;
