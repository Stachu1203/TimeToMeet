import { formatShortDate } from "../../mockData";
import {
  PARTICIPANT_PALETTE,
  type BestMatchWindow,
  type MergedWindow,
} from "./sessionUtils";

interface BestMatchesSectionProps {
  bestMatchWindows: BestMatchWindow[];
  totalParticipants: number;
  highlightedUserId: string | null;
  assignedColors: Map<string, string>;
  isCreator: boolean;
  saving: boolean;
  onToggleClose: () => void;
}

export function BestMatchesSection({
  bestMatchWindows,
  totalParticipants,
  highlightedUserId,
  assignedColors,
  isCreator,
  saving,
  onToggleClose,
}: BestMatchesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Best Matches</h2>
          <p className="text-sm text-white mt-1">
            This poll is closed for voting. Below are the best matching time
            windows ranked by participant availability.
          </p>
        </div>
        {isCreator && (
          <button
            type="button"
            disabled={saving}
            onClick={onToggleClose}
            className="px-4 py-2 text-sm font-semibold bg-[#181a20] hover:bg-white/10 border border-white/20 text-white rounded-md cursor-pointer"
          >
            Reopen Poll
          </button>
        )}
      </div>

      {bestMatchWindows.length === 0 ? (
        <div className="p-8 rounded-md bg-[#181a20] border border-white/15 text-base text-white">
          No availability was submitted for this poll.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bestMatchWindows
            .toSpliced(3, Infinity)
            .filter(
              (win) =>
                !highlightedUserId ||
                win.users.some((u) => u.id === highlightedUserId),
            )
            .map((win) => {
              const { weekday, monthDay } = formatShortDate(win.date);
              const isFullMatch =
                totalParticipants > 0 && win.count === totalParticipants;
              return (
                <div
                  key={`${win.date}-${win.startTime}-${win.endTime}`}
                  className={`p-5 rounded-md border space-y-4 ${
                    isFullMatch
                      ? "bg-[#3b5278]/35 border-[#4a628a]"
                      : "bg-[#181a20] border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {weekday}, {monthDay}
                      </div>
                      <div className="text-base font-mono font-bold text-white mt-0.5">
                        {win.startTime} – {win.endTime}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md border ${
                        isFullMatch
                          ? "bg-white text-black border-white"
                          : "bg-white/10 text-white border-white/20"
                      }`}
                    >
                      {win.count}/{totalParticipants} available
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {win.users.map((u) => (
                      <span
                        key={u.id}
                        className="px-2.5 py-1 rounded-md text-sm font-medium text-white"
                        style={{
                          backgroundColor:
                            assignedColors.get(u.id) ?? PARTICIPANT_PALETTE[0],
                        }}
                      >
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

interface MatchingDatesSectionProps {
  mergedMatchingWindows: MergedWindow[];
}

export function MatchingDatesSection({
  mergedMatchingWindows,
}: MatchingDatesSectionProps) {
  return (
    <div className="pt-6 border-t border-white/15 space-y-4">
      <h2 className="text-2xl font-semibold text-white">Matching Dates</h2>

      {mergedMatchingWindows.length === 0 ? (
        <div className="p-6 rounded-md bg-[#181a20] border border-white/15 text-base text-white">
          No full matches yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {mergedMatchingWindows.map((win) => {
            const { weekday, monthDay } = formatShortDate(win.date);
            return (
              <div
                key={`${win.date}-${win.startTime}`}
                className="p-4 rounded-md bg-[#181a20] border border-white/20 flex items-center justify-between"
              >
                <span className="text-base font-semibold text-white">
                  {weekday}, {monthDay}
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {win.startTime} – {win.endTime}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
