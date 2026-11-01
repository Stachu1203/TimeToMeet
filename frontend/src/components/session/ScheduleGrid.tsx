import React, { useRef } from "react";
import { addMinutesToSlotKey, formatShortDate, makeSlotKey } from "../../Utils";
import type { AvailabilityBlock, GroupSession, User } from "../../types";
import { TrashIcon } from "../Icons";
import { PARTICIPANT_PALETTE, formatBlockTimeRange } from "./sessionUtils";

export interface ScheduleCellProps {
  slotKey: string;
  dayDate: string;
  timeStr: string;
  isFullHour: boolean;
  count: number;
  totalParticipants: number;
  isMine: boolean;
  showOnlyMine: boolean;
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

export const ScheduleCell = React.memo(function ScheduleCell({
  slotKey,
  dayDate,
  timeStr,
  isFullHour,
  count,
  totalParticipants,
  isMine,
  showOnlyMine,
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

  const barWidth = showOnlyMine
    ? isMine
      ? "100%"
      : "0%"
    : highlightedUserId
      ? isHighlightedUserHere
        ? "100%"
        : "0%"
      : `${fillPercent}%`;

  const barColorClass = showOnlyMine
    ? "bg-[#3b5278]"
    : highlightedUserId
      ? ""
      : isFullMatch
        ? "bg-[#3b5278]"
        : "bg-white/15";

  return (
    <td
      className={`p-0 border border-white/10 ${
        isFullHour ? "border-t-2 border-t-white/55" : ""
      }`}
    >
      <div
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? -1 : 0}
        data-slot-key={slotKey}
        aria-label={
          showOnlyMine
            ? `${dayDate} ${timeStr}, ${isMine ? "selected" : "not selected"}`
            : `${dayDate} ${timeStr}, ${count} of ${totalParticipants} available`
        }
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
        className={`relative overflow-hidden h-10 lg:h-11 xl:h-12 flex items-center justify-start px-1.5 sm:px-3 text-sm transition-all duration-150 bg-[#181a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
          readOnly ? "cursor-default" : "cursor-pointer hover:bg-white/[0.04]"
        }`}
      >
        <div
          style={{
            width: barWidth,
            backgroundColor:
              !showOnlyMine && highlightedUserId && isHighlightedUserHere
                ? highlightedColor
                : undefined,
          }}
          className={`absolute inset-y-0 left-0 transition-all duration-300 ease-out pointer-events-none ${barColorClass}`}
        />
        {isInspectedSlot && (
          <span className="pointer-events-none absolute inset-0 border-2 border-white z-20" />
        )}
      </div>
    </td>
  );
});

export interface ScheduleTableProps {
  session: GroupSession;
  timeLabels: string[];
  heatmapCounts: Record<string, number>;
  totalParticipants: number;
  mySlots: Set<string>;
  showOnlyMine: boolean;
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
  onTouchSlotMove?: (slotKey: string) => void;
  onMouseLeave: () => void;
}

export const ScheduleTable = React.memo(function ScheduleTable({
  session,
  timeLabels,
  heatmapCounts,
  totalParticipants,
  mySlots,
  showOnlyMine,
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
  onTouchSlotMove,
  onMouseLeave,
}: ScheduleTableProps) {
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const tableMinWidthStyle = {
    "--mobile-table-min-w": `${session.days.length * 68 + 56}px`,
    "--desktop-table-min-w": `${Math.max(680, session.days.length * 110 + 80)}px`,
  } as React.CSSProperties;

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    if (
      headerScrollRef.current &&
      headerScrollRef.current.scrollLeft !== left
    ) {
      headerScrollRef.current.scrollLeft = left;
    }
  };

  const handleHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    if (
      scrollContainerRef.current &&
      scrollContainerRef.current.scrollLeft !== left
    ) {
      scrollContainerRef.current.scrollLeft = left;
    }
  };

  return (
    <div className="w-full" onMouseLeave={onMouseLeave}>
      <div className="sticky top-0 z-30 bg-[#121318] pt-2">
        <div
          ref={headerScrollRef}
          onScroll={handleHeaderScroll}
          className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <table
            style={tableMinWidthStyle}
            className="w-full min-w-[var(--mobile-table-min-w)] md:min-w-[var(--desktop-table-min-w)] select-none border-collapse table-fixed"
          >
            <colgroup>
              <col className="w-14 md:w-20" />
              {session.days.map((day) => (
                <col key={day.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  title={session.timezone}
                  className="sticky left-0 z-20 bg-[#121318] w-14 md:w-20 pb-2 md:pb-3 pr-1.5 md:pr-4 text-right text-[11px] md:text-sm font-mono font-bold text-white border-b-2 border-transparent"
                >
                  {session.timezone}
                </th>
                {session.days.map((day) => {
                  const { weekday, monthDay } = formatShortDate(day.date);
                  return (
                    <th
                      key={day.id}
                      className="pb-2 md:pb-3 px-1 md:px-2 text-center border-b-2 border-white/50 bg-[#121318]"
                    >
                      <div className="text-xs sm:text-sm md:text-base font-semibold text-white">
                        {weekday}
                      </div>
                      <div className="text-[11px] sm:text-xs md:text-sm font-medium text-white">
                        {monthDay}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleBodyScroll}
        className="w-full overflow-x-auto"
        onTouchMove={
          readOnly || !onTouchSlotMove
            ? undefined
            : (e) => {
                const touch = e.touches[0];
                if (!touch) return;
                const el = document
                  .elementFromPoint(touch.clientX, touch.clientY)
                  ?.closest<HTMLElement>("[data-slot-key]");
                const key = el?.dataset.slotKey;
                if (key) {
                  onTouchSlotMove(key);
                }
              }
        }
      >
        <table
          style={tableMinWidthStyle}
          className="w-full min-w-[var(--mobile-table-min-w)] md:min-w-[var(--desktop-table-min-w)] select-none border-collapse table-fixed"
        >
          <colgroup>
            <col className="w-14 md:w-20" />
            {session.days.map((day) => (
              <col key={day.id} />
            ))}
          </colgroup>
          <tbody>
            {timeLabels.map((timeStr, idx) => {
              const isFullHour = timeStr.endsWith(":00");
              return (
                <tr key={timeStr}>
                  <td
                    className={`sticky left-0 z-20 bg-[#121318] w-14 md:w-20 pr-1.5 md:pr-4 text-right align-top ${
                      idx === 0 ? "translate-y-0" : "-translate-y-2"
                    } text-xs md:text-sm text-white font-mono font-bold`}
                  >
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
                        showOnlyMine={showOnlyMine}
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
    </div>
  );
});

interface SlotHoverTooltipProps {
  hoveredSlot: string;
  mousePos: { x: number; y: number };
  hoveredParticipants: User[];
  totalParticipants: number;
  assignedColors: Map<string, string>;
  activeVoterId: string | null;
}

export function SlotHoverTooltip({
  hoveredSlot,
  mousePos,
  hoveredParticipants,
  totalParticipants,
  assignedColors,
  activeVoterId,
}: SlotHoverTooltipProps) {
  return (
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
                backgroundColor:
                  assignedColors.get(u.id) ?? PARTICIPANT_PALETTE[0],
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
  );
}

interface SlotInspectPanelProps {
  selectedSlot: string;
  inspectedBlocks: AvailabilityBlock[];
  totalParticipants: number;
  isCreator: boolean;
  currentUser: User | null;
  saving: boolean;
  assignedColors: Map<string, string>;
  onClose: () => void;
  onRemoveTimeWindow: (availabilityId: string) => void;
  onRemoveParticipant: (userId: string) => void;
}

export function SlotInspectPanel({
  selectedSlot,
  inspectedBlocks,
  totalParticipants,
  isCreator,
  currentUser,
  saving,
  assignedColors,
  onClose,
  onRemoveTimeWindow,
  onRemoveParticipant,
}: SlotInspectPanelProps) {
  return (
    <div className="p-4 rounded-md bg-[#181a20] border border-white/25 space-y-3">
      <div className="flex items-center justify-between border-b border-white/15 pb-2">
        <span className="text-base font-bold text-white">
          Inspecting: {selectedSlot.replace("T", " · ")} –{" "}
          {addMinutesToSlotKey(selectedSlot, 30).split("T")[1]} (
          {inspectedBlocks.length}/{totalParticipants})
        </span>
        <button
          type="button"
          onClick={onClose}
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
                        assignedColors.get(block.user_id) ??
                        PARTICIPANT_PALETTE[0],
                    }}
                  >
                    {uname}
                  </span>
                  <span className="text-sm text-white">
                    Window:{" "}
                    {formatBlockTimeRange(block.start_time, block.end_time)}
                  </span>
                </div>

                {canModify && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRemoveTimeWindow(block.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md cursor-pointer"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      <span>Remove Window</span>
                    </button>
                    {isCreator && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onRemoveParticipant(block.user_id)}
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
  );
}
