import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteAvailabilityWindow,
  deleteMyAvailabilities,
  fetchGroup,
  fetchGroupAvailabilities,
  fetchGroupHeatmap,
  removeParticipant,
  saveAvailabilities,
} from "../api";
import {
  addMinutesToSlotKey,
  availabilityBlockToSlotKeys,
  formatShortDate,
  generateTimeLabels,
  makeSlotKey,
  normalizeSlotKey,
  slotsToAvailabilityPayloads,
} from "../mockData";
import type {
  AvailabilityBlock,
  GroupSession,
  HeatmapResponse,
  PageName,
  User,
} from "../types";
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
  onOpenLogin: () => void;
  onBack: () => void;
  onQuitSession: (sessionId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onToggleCloseSession: (sessionId: string, isClosed: boolean) => Promise<void>;
  onSessionSync?: (updatedSession: GroupSession) => void;
  onSessionUpdated?: () => void;
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
  pendingNavigationPage?: PageName | null;
  onConfirmPendingNavigation?: (nextPage: PageName) => void;
  onCancelPendingNavigation?: () => void;
}

interface MergedWindow {
  date: string;
  startTime: string;
  endTime: string;
}

interface BestMatchWindow {
  date: string;
  startTime: string;
  endTime: string;
  count: number;
  users: User[];
  userIdsKey: string;
}

function add30Minutes(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + 30;
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
}

function formatBlockTimeRange(startIso: string, endIso: string): string {
  const s = normalizeSlotKey(startIso);
  const e = normalizeSlotKey(endIso);
  const [sDate, sTime] = s.split("T");
  const [, eTime] = e.split("T");
  return `${sDate} · ${sTime} – ${eTime}`;
}

interface ScheduleCellProps {
  slotKey: string;
  dayDate: string;
  timeStr: string;
  isFullHour: boolean;
  count: number;
  totalParticipants: number;
  isMine: boolean;
  isSaved: boolean;
  isFullMatch: boolean;
  isHighlightedUserHere: boolean;
  highlightedColor: string | undefined;
  highlightedUserId: string | null;
  isInspectedSlot: boolean;
  readOnly?: boolean;
  onMouseDown: (slotKey: string) => void;
  onMouseEnter: (slotKey: string, e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onKeyToggle: (slotKey: string) => void;
}

const ScheduleCell = React.memo(function ScheduleCell({
  slotKey,
  dayDate,
  timeStr,
  isFullHour,
  count,
  totalParticipants,
  isMine,
  isSaved,
  isFullMatch,
  isHighlightedUserHere,
  highlightedColor,
  highlightedUserId,
  isInspectedSlot,
  readOnly = false,
  onMouseDown,
  onMouseEnter,
  onMouseMove,
  onKeyToggle,
}: ScheduleCellProps) {
  const fillPercent =
    count > 0 && totalParticipants > 0
      ? Math.round((count / totalParticipants) * 100)
      : 0;

  return (
    <td
      className={`p-0 border border-white/10 ${
        isFullHour ? "border-t-2 border-t-white/55" : ""
      }`}
    >
      <div
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? -1 : 0}
        aria-label={`${dayDate} ${timeStr}, ${count} of ${totalParticipants} available`}
        onMouseDown={readOnly ? undefined : () => onMouseDown(slotKey)}
        onMouseEnter={(e) => onMouseEnter(slotKey, e)}
        onMouseMove={onMouseMove}
        onKeyDown={
          readOnly
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onKeyToggle(slotKey);
                }
              }
        }
        className={`relative overflow-hidden h-10 lg:h-11 xl:h-12 flex items-center justify-end px-3 text-sm transition-all duration-150 bg-[#181a20] ${
          readOnly ? "cursor-default" : "cursor-pointer hover:bg-white/[0.04]"
        } ${isInspectedSlot ? "ring-2 ring-inset ring-white z-20" : ""}`}
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
          {isMine && (
            <CheckIcon
              className={`w-5 h-5 ${isSaved ? "text-[#4ade80]" : "text-white"}`}
            />
          )}
        </div>
      </div>
    </td>
  );
});

interface ScheduleTableProps {
  session: GroupSession;
  timeLabels: string[];
  heatmapCounts: Record<string, number>;
  totalParticipants: number;
  mySlots: Set<string>;
  isChoicesSaved: boolean;
  readOnly?: boolean;
  userSlotsMap: Record<string, Set<string>>;
  highlightedUserId: string | null;
  assignedColors: Map<string, string>;
  selectedSlot: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onCellMouseDown: (slotKey: string) => void;
  onCellMouseEnter: (slotKey: string, e: React.MouseEvent) => void;
  onCellMouseMove: (e: React.MouseEvent) => void;
  onCellKeyToggle: (slotKey: string) => void;
  onMouseLeave: () => void;
}

const ScheduleTable = React.memo(function ScheduleTable({
  session,
  timeLabels,
  heatmapCounts,
  totalParticipants,
  mySlots,
  isChoicesSaved,
  readOnly = false,
  userSlotsMap,
  highlightedUserId,
  assignedColors,
  selectedSlot,
  scrollContainerRef,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseMove,
  onCellKeyToggle,
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
                  const count = heatmapCounts[slotKey] ?? 0;
                  const isMine = mySlots.has(slotKey);
                  const isFullMatch =
                    count === totalParticipants && totalParticipants > 0;
                  const isHighlightedUserHere = highlightedUserId
                    ? Boolean(userSlotsMap[highlightedUserId]?.has(slotKey))
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
                      isSaved={isChoicesSaved}
                      isFullMatch={isFullMatch}
                      isHighlightedUserHere={isHighlightedUserHere}
                      highlightedColor={highlightedColor}
                      highlightedUserId={highlightedUserId}
                      isInspectedSlot={isInspectedSlot}
                      readOnly={readOnly}
                      onMouseDown={onCellMouseDown}
                      onMouseEnter={onCellMouseEnter}
                      onMouseMove={onCellMouseMove}
                      onKeyToggle={onCellKeyToggle}
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
  onOpenLogin,
  onBack,
  onQuitSession,
  onDeleteSession,
  onToggleCloseSession,
  onSessionSync,
  onSessionUpdated,
  onUnsavedChangesChange,
  pendingNavigationPage,
  onConfirmPendingNavigation,
  onCancelPendingNavigation,
}: SessionPageProps) {
  const isCreator = Boolean(
    currentUser && session.creator_id === currentUser.id,
  );

  const timeLabels = useMemo(
    () => generateTimeLabels(session.grid_start_hour, session.grid_end_hour),
    [session.grid_start_hour, session.grid_end_hour],
  );

  const [heatmapData, setHeatmapData] = useState<HeatmapResponse>({
    total_participants: 0,
    heatmap: {},
    available_users: {},
  });
  const [availabilities, setAvailabilities] = useState<AvailabilityBlock[]>([]);
  const [mySlots, setMySlots] = useState<Set<string>>(() => new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSavedText, setShowSavedText] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [guestName, setGuestName] = useState<string | null>(null);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(!currentUser);
  const [pendingSlotKey, setPendingSlotKey] = useState<string | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [gridMode, setGridMode] = useState<"vote" | "inspect">("vote");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(
    null,
  );
  const [pendingLocalAction, setPendingLocalAction] = useState<
    "back" | "inspect" | null
  >(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadSessionData = useCallback(
    async (syncMySlots = false): Promise<GroupSession | null> => {
      try {
        const [grp, hm, avs] = await Promise.all([
          fetchGroup(session.id),
          fetchGroupHeatmap(session.id),
          fetchGroupAvailabilities(session.id),
        ]);
        setHeatmapData(hm);
        setAvailabilities(avs);
        onSessionSync?.(grp);

        const targetVoterId = currentUser?.id ?? guestUserId;
        if (syncMySlots && targetVoterId) {
          const mine = new Set<string>();
          for (const block of avs) {
            if (block.user_id === targetVoterId) {
              for (const k of availabilityBlockToSlotKeys(
                block.start_time,
                block.end_time,
              )) {
                mine.add(k);
              }
            }
          }
          setMySlots(mine);
          setHasUnsavedChanges(false);
        }
        return grp;
      } catch (err) {
        setStatusMessage(
          err instanceof Error ? err.message : "Failed to load poll data.",
        );
        return null;
      }
    },
    [session.id, currentUser, guestUserId, onSessionSync],
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      try {
        const [grp, hm, avs] = await Promise.all([
          fetchGroup(session.id),
          fetchGroupHeatmap(session.id),
          fetchGroupAvailabilities(session.id),
        ]);
        if (cancelled) return;
        setHeatmapData(hm);
        setAvailabilities(avs);
        onSessionSync?.(grp);

        if (currentUser) {
          const mine = new Set<string>();
          for (const block of avs) {
            if (block.user_id === currentUser.id) {
              for (const k of availabilityBlockToSlotKeys(
                block.start_time,
                block.end_time,
              )) {
                mine.add(k);
              }
            }
          }
          setMySlots(mine);
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        if (!cancelled) {
          setStatusMessage(
            err instanceof Error ? err.message : "Failed to load poll data.",
          );
        }
      }
    }

    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [session.id, currentUser, onSessionSync]);

  useEffect(() => {
    let cancelled = false;

    const intervalId = window.setInterval(async () => {
      if (saving || isDragging) return;
      try {
        const [grp, hm, avs] = await Promise.all([
          fetchGroup(session.id),
          fetchGroupHeatmap(session.id),
          fetchGroupAvailabilities(session.id),
        ]);
        if (cancelled) return;
        setHeatmapData(hm);
        setAvailabilities(avs);
        onSessionSync?.(grp);

        const targetVoterId = currentUser?.id ?? guestUserId;
        if (!hasUnsavedChanges && targetVoterId) {
          const mine = new Set<string>();
          for (const block of avs) {
            if (block.user_id === targetVoterId) {
              for (const k of availabilityBlockToSlotKeys(
                block.start_time,
                block.end_time,
              )) {
                mine.add(k);
              }
            }
          }
          setMySlots(mine);
        }
      } catch {
        return;
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    session.id,
    currentUser,
    guestUserId,
    hasUnsavedChanges,
    saving,
    isDragging,
    onSessionSync,
  ]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      document.title = "TimeToMeet";
      return;
    }

    document.title = "● Save your choices – TimeToMeet";

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatusMessage(
          "Reminder: Don't forget to click 'Save my choices' to save your selected times.",
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.title = "TimeToMeet";
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasUnsavedChanges]);

  const handleScrollDays = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -440 : 440;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  const activeVoterId =
    currentUser?.id ??
    guestUserId ??
    (guestName ? `local-guest-${guestName}` : null);
  const activeVoterName = currentUser?.name ?? guestName ?? null;

  const {
    participants,
    userSlotsMap,
    slotBlocksMap,
    userBlocksMap,
    serverVoterSlots,
    slotParticipantsMap,
  } = useMemo(() => {
    const pMap = new Map<string, User>();
    const uSlots: Record<string, Set<string>> = {};
    const sBlocks: Record<string, AvailabilityBlock[]> = {};
    const uBlocks: Record<string, AvailabilityBlock[]> = {};
    const sParticipants: Record<string, User[]> = {};

    if (session.creator_id && session.creator_name) {
      pMap.set(session.creator_id, {
        id: session.creator_id,
        name: session.creator_name,
      });
    }

    for (const block of availabilities) {
      const uid = block.user_id;
      const uname = block.voter_name || "Participant";
      if (!pMap.has(uid)) {
        pMap.set(uid, { id: uid, name: uname });
      }
      if (!uSlots[uid]) {
        uSlots[uid] = new Set();
      }
      if (!uBlocks[uid]) {
        uBlocks[uid] = [];
      }
      uBlocks[uid].push(block);

      const keys = availabilityBlockToSlotKeys(
        block.start_time,
        block.end_time,
      );
      for (const k of keys) {
        uSlots[uid].add(k);
        if (!sBlocks[k]) {
          sBlocks[k] = [];
        }
        sBlocks[k].push(block);
      }
    }

    const srvSlots =
      activeVoterId && uSlots[activeVoterId]
        ? new Set(uSlots[activeVoterId])
        : new Set<string>();

    if (activeVoterId && activeVoterName) {
      uSlots[activeVoterId] = new Set(mySlots);
      if (mySlots.size > 0 || pMap.has(activeVoterId)) {
        pMap.set(activeVoterId, { id: activeVoterId, name: activeVoterName });
      }
    }

    for (const [uid, slotsSet] of Object.entries(uSlots)) {
      const userObj = pMap.get(uid) ?? { id: uid, name: "Participant" };
      for (const slotKey of slotsSet) {
        if (!sParticipants[slotKey]) {
          sParticipants[slotKey] = [];
        }
        if (!sParticipants[slotKey].some((u) => u.id === uid)) {
          sParticipants[slotKey].push(userObj);
        }
      }
    }

    return {
      participants: Array.from(pMap.values()),
      userSlotsMap: uSlots,
      slotBlocksMap: sBlocks,
      userBlocksMap: uBlocks,
      serverVoterSlots: srvSlots,
      slotParticipantsMap: sParticipants,
    };
  }, [
    availabilities,
    session.creator_id,
    session.creator_name,
    activeVoterId,
    activeVoterName,
    mySlots,
  ]);

  const {
    heatmapCounts,
    totalParticipants,
    mergedMatchingWindows,
    bestMatchWindows,
  } = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const [isoKey, c] of Object.entries(heatmapData.heatmap)) {
      counts[normalizeSlotKey(isoKey)] = c;
    }

    let total = heatmapData.total_participants;

    if (activeVoterId && activeVoterName) {
      const hadServerSlots = serverVoterSlots.size > 0;
      const hasLocalSlots = mySlots.size > 0;

      if (!hadServerSlots && hasLocalSlots) {
        total += 1;
      } else if (hadServerSlots && !hasLocalSlots) {
        total = Math.max(0, total - 1);
      }

      for (const oldKey of serverVoterSlots) {
        if (!mySlots.has(oldKey)) {
          counts[oldKey] = Math.max(0, (counts[oldKey] ?? 1) - 1);
        }
      }

      for (const newKey of mySlots) {
        if (!serverVoterSlots.has(newKey)) {
          counts[newKey] = (counts[newKey] ?? 0) + 1;
        }
      }
    }

    const effectiveTotal = Math.max(total, 0);
    const fullMatchKeys: string[] = [];

    if (effectiveTotal > 0) {
      for (const [slotKey, c] of Object.entries(counts)) {
        if (c === effectiveTotal) {
          fullMatchKeys.push(slotKey);
        }
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

    const activeKeys = Object.keys(counts)
      .filter((k) => (counts[k] ?? 0) > 0)
      .sort();

    const bestMerged: BestMatchWindow[] = [];
    for (const key of activeKeys) {
      const [datePart, timePart] = key.split("T");
      const nextEnd = add30Minutes(timePart);
      const count = counts[key] ?? 0;
      const users = slotParticipantsMap[key] ?? [];
      const userIdsKey = users
        .map((u) => u.id)
        .sort()
        .join(",");
      const last = bestMerged[bestMerged.length - 1];

      if (
        last &&
        last.date === datePart &&
        last.endTime === timePart &&
        last.count === count &&
        last.userIdsKey === userIdsKey
      ) {
        last.endTime = nextEnd;
      } else {
        bestMerged.push({
          date: datePart,
          startTime: timePart,
          endTime: nextEnd,
          count,
          users,
          userIdsKey,
        });
      }
    }

    bestMerged.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      heatmapCounts: counts,
      totalParticipants: effectiveTotal,
      mergedMatchingWindows: merged,
      bestMatchWindows: bestMerged,
    };
  }, [
    heatmapData,
    activeVoterId,
    activeVoterName,
    serverVoterSlots,
    mySlots,
    slotParticipantsMap,
  ]);

  const assignedColors: Map<string, string> = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((user, idx) => {
      const color = palette[idx % palette.length];
      map.set(user.id, color);
    });
    if (currentUser && !map.has(currentUser.id)) {
      map.set(
        currentUser.id,
        palette[participants.length % palette.length],
      );
    }
    return map;
  }, [participants, currentUser]);

  const handleCellMouseDown = useCallback(
    (slotKey: string) => {
      if (session.is_closed) return;
      if (gridMode === "inspect") {
        setSelectedSlot((prev) => (prev === slotKey ? null : slotKey));
        return;
      }
      if (!currentUser && !guestName) {
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
      setMySlots(next);
      setHasUnsavedChanges(true);
      setShowSavedText(false);
      setStatusMessage(null);
    },
    [session.is_closed, gridMode, currentUser, guestName, mySlots],
  );

  const handleCellMouseEnter = useCallback(
    (slotKey: string, e: React.MouseEvent) => {
      setHoveredSlot(slotKey);
      setMousePos({ x: e.clientX, y: e.clientY });
      if (
        session.is_closed ||
        gridMode === "inspect" ||
        !isDragging ||
        (!currentUser && !guestName)
      ) {
        return;
      }
      const next = new Set(mySlots);
      if (dragMode === "add") next.add(slotKey);
      else next.delete(slotKey);
      setMySlots(next);
      setHasUnsavedChanges(true);
      setShowSavedText(false);
    },
    [session.is_closed, gridMode, isDragging, currentUser, guestName, mySlots, dragMode],
  );

  const handleCellKeyToggle = useCallback(
    (slotKey: string) => {
      if (session.is_closed) return;
      if (gridMode === "inspect") {
        setSelectedSlot((prev) => (prev === slotKey ? null : slotKey));
        return;
      }
      if (!currentUser && !guestName) {
        setPendingSlotKey(slotKey);
        setShowIdentityModal(true);
        return;
      }
      const next = new Set(mySlots);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      setMySlots(next);
      setHasUnsavedChanges(true);
      setShowSavedText(false);
      setStatusMessage(null);
    },
    [session.is_closed, gridMode, currentUser, guestName, mySlots],
  );

  const handleCellMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleTableMouseLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  const handleSaveChoices = async (): Promise<boolean> => {
    if (!currentUser && !guestName) {
      setShowIdentityModal(true);
      return false;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      const syncedGroup = await loadSessionData(false);
      if (syncedGroup?.is_closed) {
        setStatusMessage("This poll has been closed.");
        return false;
      }

      const slotList = Array.from(mySlots).sort();
      if (slotList.length === 0) {
        if (currentUser) {
          await deleteMyAvailabilities(session.id);
        } else if (guestUserId) {
          await deleteMyAvailabilities(session.id, guestUserId);
        }
      } else {
        const blocks = slotsToAvailabilityPayloads(
          slotList,
          currentUser ? currentUser.name : guestName,
          currentUser ? null : guestUserId,
        );
        const saved = await saveAvailabilities(
          session.id,
          blocks,
          !currentUser,
        );
        if (!currentUser && saved.length > 0 && saved[0].user_id) {
          setGuestUserId(saved[0].user_id);
        }
      }
      setHasUnsavedChanges(false);
      setShowSavedText(true);
      await loadSessionData(Boolean(currentUser));
      onSessionUpdated?.();
      return true;
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to save choices.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleClose = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await loadSessionData(!hasUnsavedChanges);
      await onToggleCloseSession(session.id, !session.is_closed);
      await loadSessionData(!hasUnsavedChanges);
    } finally {
      setSaving(false);
    }
  };

  const handleClearMine = async () => {
    setMySlots(new Set());
    setShowSavedText(false);
    if (!currentUser && !guestUserId) {
      setHasUnsavedChanges(false);
      return;
    }
    setSaving(true);
    setStatusMessage(null);
    try {
      if (currentUser) {
        await deleteMyAvailabilities(session.id);
      } else if (guestUserId) {
        await deleteMyAvailabilities(session.id, guestUserId);
      }
      setHasUnsavedChanges(false);
      await loadSessionData(Boolean(currentUser));
      onSessionUpdated?.();
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to clear choices.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await removeParticipant(session.id, userId);
      if (highlightedUserId === userId) {
        setHighlightedUserId(null);
      }
      await loadSessionData(true);
      onSessionUpdated?.();
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to remove participant.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTimeWindow = async (availabilityId: string) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await deleteAvailabilityWindow(session.id, availabilityId);
      await loadSessionData(true);
      onSessionUpdated?.();
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to remove time window.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?session=${session.id}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGuestConfirm = (chosenGuestName: string) => {
    if (chosenGuestName !== guestName) {
      setGuestUserId(null);
    }
    setGuestName(chosenGuestName);
    setShowIdentityModal(false);
    if (pendingSlotKey) {
      const next = new Set(mySlots);
      next.add(pendingSlotKey);
      setMySlots(next);
      setHasUnsavedChanges(true);
      setPendingSlotKey(null);
    }
  };

  const hoveredParticipants = hoveredSlot
    ? (slotParticipantsMap[hoveredSlot] ?? [])
    : [];
  const inspectedBlocks = selectedSlot
    ? (slotBlocksMap[selectedSlot] ?? [])
    : [];
  const highlightedUser = participants.find((p) => p.id === highlightedUserId);
  const highlightedUserBlocks = highlightedUserId
    ? (userBlocksMap[highlightedUserId] ?? [])
    : [];
  const hasChoices = mySlots.size > 0 || serverVoterSlots.size > 0;
  const isParticipant = Boolean(currentUser && hasChoices);
  const isClosed = Boolean(session.is_closed);
  const canShowPollOptionsMenu =
    (!isClosed && hasChoices) ||
    isCreator ||
    (Boolean(currentUser) && isParticipant);

  const showUnsavedReminder =
    hasUnsavedChanges &&
    Boolean(pendingNavigationPage || pendingLocalAction);

  const completePendingAction = () => {
    if (pendingNavigationPage) {
      const target = pendingNavigationPage;
      onConfirmPendingNavigation?.(target);
      return;
    }
    if (pendingLocalAction === "back") {
      setPendingLocalAction(null);
      onBack();
      return;
    }
    if (pendingLocalAction === "inspect") {
      setPendingLocalAction(null);
      setGridMode("inspect");
    }
  };

  const handleReminderSaveAndContinue = async () => {
    const ok = await handleSaveChoices();
    if (ok) {
      completePendingAction();
    }
  };

  const handleReminderDiscardAndContinue = () => {
    setMySlots(new Set(serverVoterSlots));
    setHasUnsavedChanges(false);
    completePendingAction();
  };

  const handleReminderCancel = () => {
    setPendingLocalAction(null);
    onCancelPendingNavigation?.();
  };

  return (
    <div className="w-full space-y-8">
      {showUnsavedReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-md bg-[#181a20] border border-white/25 p-6 shadow-2xl space-y-5 text-white">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                Save your choices?
              </h2>
              <p className="text-sm text-white">
                You have unsaved availability choices in this poll. Would you
                like to save them before switching tabs?
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleReminderCancel}
                className="px-4 py-2 text-sm font-medium bg-[#121318] hover:bg-white/10 border border-white/20 text-white rounded-md cursor-pointer"
              >
                Stay Here
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleReminderDiscardAndContinue}
                className="px-4 py-2 text-sm font-medium bg-[#121318] hover:bg-white/10 border border-white/20 text-white rounded-md cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleReminderSaveAndContinue}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-md cursor-pointer disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save & Continue"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isClosed && showIdentityModal && !currentUser && (
        <IdentityModal
          title="Join Meeting"
          onSelectGuestName={handleGuestConfirm}
          onGoToLogin={onOpenLogin}
          onClose={() => {
            setShowIdentityModal(false);
            setPendingSlotKey(null);
          }}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/15 pb-5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (hasUnsavedChanges) {
                setPendingLocalAction("back");
              } else {
                onBack();
              }
            }}
            aria-label="Back to My Polls"
            className="p-2.5 bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md text-white transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <h1
                title={`Meeting: ${session.title}`}
                className="text-3xl sm:text-4xl font-semibold tracking-tight text-white truncate max-w-full"
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
                  onClick={() => setShowIdentityModal(true)}
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
            <div
              className={`${
                isCreator ? "inline-flex" : "inline-flex md:hidden"
              } rounded-md bg-[#181a20] border border-white/20 p-1`}
            >
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
                onClick={() => {
                  if (gridMode !== "inspect" && hasUnsavedChanges) {
                    setPendingLocalAction("inspect");
                  } else {
                    setGridMode("inspect");
                  }
                }}
                className={`px-3 py-1.5 text-sm font-semibold rounded-sm transition-colors cursor-pointer ${
                  gridMode === "inspect"
                    ? "bg-white text-black"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Inspect
              </button>
            </div>
          )}

          {!isClosed && hasUnsavedChanges && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveChoices}
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOptionsMenu((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md transition-transform active:scale-95 cursor-pointer"
              >
                <span>Poll Options ▾</span>
              </button>

              {showOptionsMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-md bg-black border border-white/25 shadow-2xl z-40 py-1">
                  {!isClosed && hasChoices && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setShowOptionsMenu(false);
                        handleClearMine();
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete my choices</span>
                    </button>
                  )}

                  {currentUser && !isCreator && isParticipant && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onQuitSession(session.id);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Quit Poll</span>
                    </button>
                  )}

                  {isCreator && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setShowOptionsMenu(false);
                        handleToggleClose();
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <CheckIcon className="w-4 h-4" />
                      <span>{isClosed ? "Reopen Poll" : "Close Poll"}</span>
                    </button>
                  )}

                  {isCreator && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onDeleteSession(session.id);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete Poll</span>
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

      {statusMessage && (
        <div className="px-4 py-3 text-sm text-white bg-[#181a20] border border-white/25 rounded-md flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isClosed && (
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
                onClick={handleToggleClose}
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
                                assignedColors.get(u.id) ?? palette[0],
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
      )}

      <div className={isClosed ? "pt-6 border-t border-white/15 space-y-4" : "space-y-4"}>
        <div className="flex items-center justify-between gap-3">
          {isClosed ? (
            <h2 className="text-2xl font-semibold text-white">Final Calendar</h2>
          ) : (
            <div />
          )}
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
        </div>

        <ScheduleTable
          session={session}
          timeLabels={timeLabels}
          heatmapCounts={heatmapCounts}
          totalParticipants={totalParticipants}
          mySlots={mySlots}
          isChoicesSaved={!hasUnsavedChanges}
          readOnly={isClosed}
          userSlotsMap={userSlotsMap}
          highlightedUserId={highlightedUserId}
          assignedColors={assignedColors}
          selectedSlot={isClosed ? null : selectedSlot}
          scrollContainerRef={scrollContainerRef}
          onCellMouseDown={handleCellMouseDown}
          onCellMouseEnter={handleCellMouseEnter}
          onCellMouseMove={handleCellMouseMove}
          onCellKeyToggle={handleCellKeyToggle}
          onMouseLeave={handleTableMouseLeave}
        />
      </div>

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
              {hoveredParticipants.length}/{totalParticipants}
            </span>
          </div>
          {hoveredParticipants.length === 0 ? (
            <div className="text-sm text-white">No participants available</div>
          ) : (
            <div className="space-y-1.5">
              {hoveredParticipants.map((u) => (
                <div
                  key={u.id}
                  className="px-2.5 py-1.5 rounded-md bg-white/5 text-base font-medium text-white flex items-center justify-between"
                  style={{
                    backgroundColor: assignedColors.get(u.id) ?? palette[0],
                  }}
                >
                  <span>{u.name}</span>
                  {activeVoterId === u.id && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isClosed && selectedSlot && gridMode === "inspect" && (
        <div className="p-4 rounded-md bg-[#181a20] border border-white/25 space-y-3">
          <div className="flex items-center justify-between border-b border-white/15 pb-2">
            <span className="text-base font-bold text-white">
              Inspecting: {selectedSlot.replace("T", " · ")} –{" "}
              {addMinutesToSlotKey(selectedSlot, 30).split("T")[1]} (
              {inspectedBlocks.length}/{totalParticipants})
            </span>
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-md text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          {inspectedBlocks.length === 0 ? (
            <div className="text-sm text-white">No participants available</div>
          ) : (
            <div className="space-y-2">
              {inspectedBlocks.map((block) => {
                const uname = block.voter_name || "Participant";
                const canModify =
                  isCreator || (currentUser && currentUser.id === block.user_id);

                return (
                  <div
                    key={block.id}
                    className="p-3 rounded-md bg-[#121318] border border-white/15 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="px-3 py-1 rounded-md text-sm font-medium text-white"
                        style={{
                          backgroundColor:
                            assignedColors.get(block.user_id) ?? palette[0],
                        }}
                      >
                        {uname}
                      </span>
                      <span className="text-xs font-mono text-white">
                        Window:{" "}
                        {formatBlockTimeRange(
                          block.start_time,
                          block.end_time,
                        )}
                      </span>
                    </div>

                    {canModify && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleRemoveTimeWindow(block.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md cursor-pointer"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          <span>Remove Window</span>
                        </button>
                        {isCreator && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              handleRemoveParticipant(block.user_id)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md cursor-pointer"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Remove User</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
          {participants.map((participant) => {
            const isHighlighted = highlightedUserId === participant.id;
            const hasAvailabilities =
              (userBlocksMap[participant.id]?.length ?? 0) > 0;
            return (
              <li key={participant.id} className="inline-flex items-center gap-1">
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
                {isCreator && hasAvailabilities && (
                  <button
                    type="button"
                    disabled={saving}
                    title={`Remove ${participant.name} from poll`}
                    onClick={() => handleRemoveParticipant(participant.id)}
                    className="p-2 rounded-md bg-[#181a20] hover:bg-white/10 border border-white/20 text-white cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {highlightedUser && highlightedUserBlocks.length > 0 && (
          <div className="p-4 rounded-md bg-[#181a20] border border-white/20 space-y-3">
            <div className="text-sm font-semibold uppercase tracking-wider text-white">
              {highlightedUser.name}&apos;s Time Windows
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {highlightedUserBlocks.map((block) => {
                const canDeleteWindow =
                  isCreator || (currentUser && currentUser.id === block.user_id);
                return (
                  <div
                    key={block.id}
                    className="px-3.5 py-2.5 rounded-md bg-[#121318] border border-white/15 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-mono text-white">
                      {formatBlockTimeRange(block.start_time, block.end_time)}
                    </span>
                    {canDeleteWindow && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleRemoveTimeWindow(block.id)}
                        className="p-1.5 rounded-md bg-[#181a20] hover:bg-white/10 border border-white/20 text-white cursor-pointer"
                        title="Remove time window"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!isClosed && (
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
      )}
    </div>
  );
}
