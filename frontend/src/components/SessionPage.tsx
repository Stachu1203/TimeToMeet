import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatShortDate, generateTimeLabels, makeSlotKey } from "../mockData";
import type { GroupSession, User } from "../types";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
  TrashIcon,
} from "./Icons";
import { IdentityModal } from "./IdentityModal";

const palette = [
  "#4477bb",
  "#cc4466",
  "#228833",
  "#2255aa",
  "#993366",
  "#006644",
  "#117788",
  "#882288",
  "#bb4488",
  "#775500",
  "#444444",
];

interface SessionPageProps {
  session: GroupSession;
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onSaveUserSlots: (sessionId: string, user: User, slots: string[]) => void;
  onClearUserSlots: (sessionId: string, userId: string) => void;
  onOpenLogin: () => void;
  onBack: () => void;
}

interface MergedWindow {
  date: string;
  startTime: string;
  endTime: string;
}

function add30Minutes(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + 30;
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
}

const getColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
  }
  return palette[Math.abs(hash) % palette.length];
};

interface ScheduleCellProps {
  slotKey: string;
  dayDate: string;
  timeStr: string;
  isFullHour: boolean;
  count: number;
  totalParticipants: number;
  isMine: boolean;
  isFullMatch: boolean;
  isHighlightedUserHere: boolean;
  highlightedColor: string | undefined;
  highlightedUserId: string | null;
  isInspectedSlot: boolean;
  onMouseDown: (slotKey: string) => void;
  onMouseEnter: (slotKey: string, e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
}

const ScheduleCell = React.memo(function ScheduleCell({
  slotKey,
  dayDate,
  timeStr,
  isFullHour,
  count,
  totalParticipants,
  isMine,
  isFullMatch,
  isHighlightedUserHere,
  highlightedColor,
  highlightedUserId,
  isInspectedSlot,
  onMouseDown,
  onMouseEnter,
  onMouseMove,
}: ScheduleCellProps) {
  const fillPercent = count > 0 ? Math.round((count / totalParticipants) * 100) : 0;

  return (
    <td
      className={`p-0 border border-white/10 ${
        isFullHour ? "border-t-2 border-t-white/55" : ""
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${dayDate} ${timeStr}, ${count} of ${totalParticipants} available`}
        onMouseDown={() => onMouseDown(slotKey)}
        onMouseEnter={(e) => onMouseEnter(slotKey, e)}
        onMouseMove={onMouseMove}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onMouseDown(slotKey);
          }
        }}
        className={`relative overflow-hidden h-10 lg:h-11 xl:h-12 flex items-center justify-end px-3 text-sm transition-all duration-150 cursor-pointer bg-[#181a20] hover:bg-white/[0.04] ${
          isInspectedSlot ? "ring-2 ring-inset ring-white z-20" : ""
        }`}
      >
        <div
          style={{
            width: highlightedUserId
              ? isHighlightedUserHere
                ? "100%"
                : "0%"
              : `${fillPercent}%`,
            backgroundColor:
              highlightedUserId && isHighlightedUserHere
                ? highlightedColor
                : undefined,
          }}
          className={`absolute inset-y-0 left-0 transition-all duration-300 ease-out ${
            highlightedUserId
              ? ""
              : isFullMatch
                ? "bg-[#3b5278]"
                : "bg-white/15"
          }`}
        >
          {isMine && <CheckIcon className="w-5 h-5" />}
        </div>
      </div>
    </td>
  );
});

interface ScheduleTableProps {
  session: GroupSession;
  timeLabels: string[];
  slotUsersMap: Record<string, User[]>;
  totalParticipants: number;
  mySlots: Set<string>;
  highlightedUserId: string | null;
  assignedColors: Map<string, string>;
  selectedSlot: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onCellMouseDown: (slotKey: string) => void;
  onCellMouseEnter: (slotKey: string, e: React.MouseEvent) => void;
  onCellMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

const ScheduleTable = React.memo(function ScheduleTable({
  session,
  timeLabels,
  slotUsersMap,
  totalParticipants,
  mySlots,
  highlightedUserId,
  assignedColors,
  selectedSlot,
  scrollContainerRef,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseMove,
  onMouseLeave,
}: ScheduleTableProps) {
  return (
    <div
      ref={scrollContainerRef}
      className="w-full overflow-x-auto"
      onMouseLeave={onMouseLeave}
    >
      <table
        style={{
          minWidth: `${Math.max(680, session.days.length * 110 + 80)}px`,
        }}
        className="w-full select-none border-collapse table-fixed"
      >
        <thead>
          <tr>
            <th className="sticky left-0 z-30 bg-[#121318] w-20 pb-3 pr-4 text-right text-sm font-mono font-bold text-white">
              {session.timezone}
            </th>
            {session.days.map((day) => {
              const { weekday, monthDay } = formatShortDate(day.date);
              return (
                <th
                  key={day.id}
                  className="pb-3 px-2 text-center border-b-2 border-white/50"
                >
                  <div className="text-base font-semibold text-white">
                    {weekday}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {monthDay}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {timeLabels.map((timeStr) => {
            const isFullHour = timeStr.endsWith(":00");
            return (
              <tr key={timeStr}>
                <td className="sticky left-0 z-30 bg-[#121318] pr-4 text-right align-top -translate-y-2 text-sm text-white font-mono font-bold">
                  {isFullHour ? timeStr : ""}
                </td>
                {session.days.map((day) => {
                  const slotKey = makeSlotKey(day.date, timeStr);
                  const availableUsers = slotUsersMap[slotKey] ?? [];
                  const count = availableUsers.length;
                  const isMine = mySlots.has(slotKey);
                  const isFullMatch =
                    count === totalParticipants && totalParticipants > 0;
                  const isHighlightedUserHere = highlightedUserId
                    ? availableUsers.some((u) => u.id === highlightedUserId)
                    : false;
                  const highlightedColor = highlightedUserId
                    ? assignedColors.get(highlightedUserId)
                    : undefined;
                  const isInspectedSlot = selectedSlot === slotKey;

                  return (
                    <ScheduleCell
                      key={slotKey}
                      slotKey={slotKey}
                      dayDate={day.date}
                      timeStr={timeStr}
                      isFullHour={isFullHour}
                      count={count}
                      totalParticipants={totalParticipants}
                      isMine={isMine}
                      isFullMatch={isFullMatch}
                      isHighlightedUserHere={isHighlightedUserHere}
                      highlightedColor={highlightedColor}
                      highlightedUserId={highlightedUserId}
                      isInspectedSlot={isInspectedSlot}
                      onMouseDown={onCellMouseDown}
                      onMouseEnter={onCellMouseEnter}
                      onMouseMove={onCellMouseMove}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export function SessionPage({
  session,
  currentUser,
  onSelectUser,
  onSaveUserSlots,
  onClearUserSlots,
  onOpenLogin,
  onBack,
}: SessionPageProps) {
  const timeLabels = useMemo(
    () => generateTimeLabels(session.grid_start_hour, session.grid_end_hour),
    [session.grid_start_hour, session.grid_end_hour],
  );

  const savedUserSlots = useMemo(() => {
    if (!currentUser) return [];
    return session.userSlots[currentUser.id] ?? [];
  }, [session.userSlots, currentUser]);

  const [mySlots, setMySlots] = useState<Set<string>>(
    () => new Set(savedUserSlots),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(!currentUser);
  const [pendingSlotKey, setPendingSlotKey] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<"vote" | "inspect">("vote");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollDays = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -440 : 440;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const updateSlotSelection = useCallback(
    (nextSet: Set<string>, userOverride?: User) => {
      const activeUser = userOverride ?? currentUser;
      setMySlots(nextSet);
      if (activeUser) {
        onSaveUserSlots(session.id, activeUser, Array.from(nextSet).sort());
      }
    },
    [currentUser, onSaveUserSlots, session.id],
  );

  const handleCellMouseDown = useCallback(
    (slotKey: string) => {
      if (gridMode === "inspect") {
        setSelectedSlot((prev) => (prev === slotKey ? null : slotKey));
        return;
      }
      if (!currentUser) {
        setPendingSlotKey(slotKey);
        setShowIdentityModal(true);
        return;
      }
      const alreadySelected = mySlots.has(slotKey);
      const mode = alreadySelected ? "remove" : "add";
      setIsDragging(true);
      setDragMode(mode);

      const next = new Set(mySlots);
      if (mode === "add") next.add(slotKey);
      else next.delete(slotKey);
      updateSlotSelection(next);
    },
    [gridMode, currentUser, mySlots, updateSlotSelection],
  );

  const handleCellMouseEnter = useCallback(
    (slotKey: string, e: React.MouseEvent) => {
      setHoveredSlot(slotKey);
      setMousePos({ x: e.clientX, y: e.clientY });
      if (gridMode === "inspect" || !isDragging || !currentUser) return;
      const next = new Set(mySlots);
      if (dragMode === "add") next.add(slotKey);
      else next.delete(slotKey);
      updateSlotSelection(next);
    },
    [gridMode, isDragging, currentUser, mySlots, dragMode, updateSlotSelection],
  );

  const handleCellMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleTableMouseLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  const handleClearMine = () => {
    if (!currentUser) return;
    setMySlots(new Set());
    onClearUserSlots(session.id, currentUser.id);
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?session=${session.id}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const { slotUsersMap, totalParticipants, mergedMatchingWindows } =
    useMemo(() => {
      const map: Record<string, User[]> = {};
      const participantMap = new Map<string, User>();

      for (const p of session.participants) {
        participantMap.set(p.id, p);
      }
      if (currentUser && mySlots.size > 0) {
        participantMap.set(currentUser.id, currentUser);
      }

      for (const [uid, slots] of Object.entries(session.userSlots)) {
        if (currentUser && uid === currentUser.id) continue;
        const userObj = participantMap.get(uid) ?? { id: uid, name: uid };
        for (const s of slots) {
          if (!map[s]) map[s] = [];
          map[s].push(userObj);
        }
      }

      if (currentUser) {
        for (const s of mySlots) {
          if (!map[s]) map[s] = [];
          map[s].push(currentUser);
        }
      }

      const total = Math.max(session.participants.length, 1);

      const fullMatchKeys: string[] = [];
      for (const [slotKey, users] of Object.entries(map)) {
        if (users.length === total && total > 0) {
          fullMatchKeys.push(slotKey);
        }
      }
      fullMatchKeys.sort();

      const merged: MergedWindow[] = [];
      for (const key of fullMatchKeys) {
        const [datePart, timePart] = key.split("T");
        const nextEnd = add30Minutes(timePart);
        const last = merged[merged.length - 1];

        if (last && last.date === datePart && last.endTime === timePart) {
          last.endTime = nextEnd;
        } else {
          merged.push({
            date: datePart,
            startTime: timePart,
            endTime: nextEnd,
          });
        }
      }

      return {
        slotUsersMap: map,
        totalParticipants: total,
        mergedMatchingWindows: merged,
      };
    }, [session, currentUser, mySlots]);

  const assignedColors: Map<string, string> = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of session.participants) {
      map.set(user.id, getColor(user.id));
    }
    if (currentUser) {
      map.set(currentUser.id, getColor(currentUser.id));
    }
    return map;
  }, [session, currentUser]);

  const hoveredUsers = hoveredSlot ? (slotUsersMap[hoveredSlot] ?? []) : [];
  const selectedSlotUsers = selectedSlot
    ? (slotUsersMap[selectedSlot] ?? [])
    : [];
  const highlightedUser = session.participants.find(
    (p) => p.id === highlightedUserId,
  );

  const handleIdentityConfirm = (user: User) => {
    onSelectUser(user);
    setShowIdentityModal(false);
    const existingSlots = new Set(session.userSlots[user.id] ?? []);
    if (pendingSlotKey) {
      existingSlots.add(pendingSlotKey);
      setPendingSlotKey(null);
    }
    updateSlotSelection(existingSlots, user);
  };

  return (
    <div className="w-full space-y-8">
      {showIdentityModal && !currentUser && (
        <IdentityModal
          title="Join Meeting"
          onSelectUser={handleIdentityConfirm}
          onGoToLogin={onOpenLogin}
          onClose={() => {
            setShowIdentityModal(false);
            setPendingSlotKey(null);
          }}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/15 pb-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to My Polls"
            className="p-2.5 bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md text-white transition-transform active:scale-95 cursor-pointer"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Meeting: {session.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex md:hidden rounded-md bg-[#181a20] border border-white/20 p-1">
            <button
              type="button"
              onClick={() => {
                setGridMode("vote");
                setSelectedSlot(null);
              }}
              className={`px-3 py-1.5 text-sm font-semibold rounded-sm transition-colors cursor-pointer ${
                gridMode === "vote"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Vote
            </button>
            <button
              type="button"
              onClick={() => setGridMode("inspect")}
              className={`px-3 py-1.5 text-sm font-semibold rounded-sm transition-colors cursor-pointer ${
                gridMode === "inspect"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Inspect
            </button>
          </div>

          {currentUser && mySlots.size > 0 && (
            <button
              type="button"
              onClick={handleClearMine}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1a1c23] hover:bg-white/10 border border-white/20 rounded-md transition-transform active:scale-95 cursor-pointer"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete my choices</span>
            </button>
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

      {session.days.length > 7 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleScrollDays("left")}
            aria-label="Scroll days left"
            className="p-2.5 bg-[#181a20] border border-white/20 rounded-md hover:bg-white/10 text-white transition-transform active:scale-95 cursor-pointer"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollDays("right")}
            aria-label="Scroll days right"
            className="p-2.5 bg-[#181a20] border border-white/20 rounded-md hover:bg-white/10 text-white transition-transform active:scale-95 cursor-pointer"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      <ScheduleTable
        session={session}
        timeLabels={timeLabels}
        slotUsersMap={slotUsersMap}
        totalParticipants={totalParticipants}
        mySlots={mySlots}
        highlightedUserId={highlightedUserId}
        assignedColors={assignedColors}
        selectedSlot={selectedSlot}
        scrollContainerRef={scrollContainerRef}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onCellMouseMove={handleCellMouseMove}
        onMouseLeave={handleTableMouseLeave}
      />

      {hoveredSlot && (
        <div
          style={{
            left: Math.min(mousePos.x + 16, window.innerWidth - 280),
            top: Math.max(mousePos.y - 20, 16),
          }}
          className="hidden md:block pointer-events-none fixed z-50 w-64 p-4 rounded-md bg-black border border-white/25 shadow-2xl space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-2">
            <span className="text-sm font-bold text-white">
              {hoveredSlot.replace("T", " · ")}
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-white/10 text-white rounded-md border border-white/20">
              {hoveredUsers.length}/{totalParticipants}
            </span>
          </div>
          {hoveredUsers.length === 0 ? (
            <div className="text-sm text-white">No participants available</div>
          ) : (
            <div className="space-y-1.5">
              {hoveredUsers.map((u) => (
                <div
                  key={u.id}
                  className="px-2.5 py-1.5 rounded-md bg-white/5 text-base font-medium text-white flex items-center justify-between"
                  style={{
                    backgroundColor: assignedColors.get(u.id),
                  }}
                >
                  <span>{u.name}</span>
                  {currentUser?.id === u.id && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSlot && gridMode === "inspect" && (
        <div className="md:hidden p-4 rounded-md bg-[#181a20] border border-white/25 space-y-3">
          <div className="flex items-center justify-between border-b border-white/15 pb-2">
            <span className="text-base font-bold text-white">
              Inspecting: {selectedSlot.replace("T", " · ")} (
              {selectedSlotUsers.length}/{totalParticipants})
            </span>
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-md text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          {selectedSlotUsers.length === 0 ? (
            <div className="text-sm text-white">No participants available</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedSlotUsers.map((u) => (
                <div
                  key={u.id}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-white flex items-center gap-2"
                  style={{
                    backgroundColor: assignedColors.get(u.id),
                  }}
                >
                  <span>{u.name}</span>
                  {currentUser?.id === u.id && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pt-6 border-t border-white/15 space-y-4 text-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold text-white">
            List of all participants{" "}
            {highlightedUser ? (
              <span className="text-base font-normal text-white">
                (Highlighting {highlightedUser.name})
              </span>
            ) : (
              <span className="text-base font-normal text-white">
                (Click on a user to highlight)
              </span>
            )}
          </h2>
          {highlightedUserId && (
            <button
              type="button"
              onClick={() => setHighlightedUserId(null)}
              className="px-3 py-1 text-xs font-semibold bg-white text-black rounded-md cursor-pointer"
            >
              Show All Group Overlap
            </button>
          )}
        </div>
        <ul className="flex flex-wrap gap-2">
          {session.participants.map((participant) => {
            const isHighlighted = highlightedUserId === participant.id;
            return (
              <li key={participant.id}>
                <button
                  type="button"
                  onClick={() =>
                    setHighlightedUserId((prev) =>
                      prev === participant.id ? null : participant.id,
                    )
                  }
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-base font-medium text-white transition-transform active:scale-95 cursor-pointer ${
                    isHighlighted ? "ring-2 ring-white" : ""
                  }`}
                  style={{
                    backgroundColor: assignedColors.get(participant.id),
                  }}
                >
                  <CheckIcon />
                  <span>{participant.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

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
    </div>
  );
}
