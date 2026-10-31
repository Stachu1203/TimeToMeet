import { formatCreationDate } from "../mockData";
import type { GroupSession, PageName } from "../types";
import { ArrowRightIcon, PlusIcon } from "./Icons";

interface HomePageProps {
  sessions: GroupSession[];
  onOpenSession: (sessionId: string) => void;
  onNavigate: (page: PageName) => void;
}

export function HomePage({
  sessions,
  onOpenSession,
  onNavigate,
}: HomePageProps) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-5">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Sessions
        </h1>
        <button
          type="button"
          onClick={() => onNavigate("create")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-white/90 text-black text-sm font-semibold rounded-md transition-transform active:scale-95 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Poll</span>
        </button>
      </div>

      <div className="space-y-4">
        {sessions.map((s) => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenSession(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenSession(s.id);
              }
            }}
            className="group p-6 rounded-md bg-[#181a20] border border-white/15 hover:bg-white/[0.06] hover:border-white/40 transition-colors duration-150 cursor-pointer flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <div className="space-y-1.5">
              <h2 className="text-2xl font-semibold text-white">{s.title}</h2>
              <div className="text-sm font-mono text-white">
                Author:{" "}
                {
                  s.participants.find(
                    (u) => u.id !== undefined && u.id === s.creator_id,
                  )?.name
                }
              </div>
              <div className="text-sm font-mono text-white">
                Created: {formatCreationDate(s.created_at)}
              </div>
            </div>

            <span className="p-2.5 rounded-md bg-white text-black group-hover:translate-x-0.5 transition-transform shrink-0">
              <ArrowRightIcon className="w-5 h-5" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
