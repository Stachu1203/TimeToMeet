import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { generateTimeLabels } from "../Utils";
import type { GroupSession, PageName, User } from "../types";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { IdentityModal } from "./IdentityModal";
import {
  BestMatchesSection,
  MatchingDatesSection,
} from "./session/ClosedPollResults";
import { ParticipantListSection } from "./session/ParticipantListSection";
import {
  ScheduleTable,
  SlotHoverTooltip,
  SlotInspectPanel,
} from "./session/ScheduleGrid";
import { SessionHeader } from "./session/SessionHeader";
import { UnsavedChoicesModal } from "./session/UnsavedChoicesModal";
import { useSessionData } from "./session/useSessionData";

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
  const isClosed = Boolean(session.is_closed);

  const timeLabels = useMemo(
    () => generateTimeLabels(session.grid_start_hour, session.grid_end_hour),
    [session.grid_start_hour, session.grid_end_hour],
  );

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [userGridMode, setUserGridMode] = useState<"vote" | "inspect" | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(
    null,
  );
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [pendingSlotKey, setPendingSlotKey] = useState<string | null>(null);
  const [pendingLocalAction, setPendingLocalAction] = useState<
    "back" | "inspect" | null
  >(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    initialLoaded,
    mySlots,
    setMySlots,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    saving,
    showSavedText,
    setShowSavedText,
    statusMessage,
    setStatusMessage,
    guestName,
    handleChangeGuestName,

    activeVoterId,
    participants,
    userSlotsMap,
    slotBlocksMap,
    userBlocksMap,
    serverVoterSlots,
    slotParticipantsMap,
    heatmapCounts,
    totalParticipants,
    mergedMatchingWindows,
    bestMatchWindows,
    assignedColors,
    handleSaveChoices: saveChoicesToServer,
    handleToggleClose,
    handleClearMine: clearMineFromServer,
    handleRemoveParticipant: removeParticipantFromServer,
    handleRemoveTimeWindow,
  } = useSessionData({
    session,
    currentUser,
    isDragging,
    onToggleCloseSession,
    onSessionSync,
    onSessionUpdated,
    onUnsavedChangesChange,
  });

  const gridMode: "vote" | "inspect" = useMemo(() => {
    if (session.is_closed) return "inspect";
    if (userGridMode !== null) return userGridMode;
    if (currentUser && !initialLoaded) return "inspect";
    return serverVoterSlots.size === 0 ? "vote" : "inspect";
  }, [
    session.is_closed,
    userGridMode,
    currentUser,
    initialLoaded,
    serverVoterSlots.size,
  ]);

  const handleClearMine = async () => {
    await clearMineFromServer();
    if (!session.is_closed) {
      setUserGridMode("vote");
    }
  };

  useEffect(() => {
    const handlePointerEnd = () => setIsDragging(false);
    window.addEventListener("mouseup", handlePointerEnd);
    window.addEventListener("touchend", handlePointerEnd);
    return () => {
      window.removeEventListener("mouseup", handlePointerEnd);
      window.removeEventListener("touchend", handlePointerEnd);
    };
  }, []);

  const handleScrollDays = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const step = window.innerWidth < 768 ? 272 : 440;
    const scrollAmount = direction === "left" ? -step : step;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

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
      setHighlightedUserId(null);
      setMySlots(next);
      setHasUnsavedChanges(true);
      setShowSavedText(false);
      setStatusMessage(null);
    },
    [
      session.is_closed,
      gridMode,
      currentUser,
      guestName,
      mySlots,
      setMySlots,
      setHasUnsavedChanges,
      setShowSavedText,
      setStatusMessage,
    ],
  );

  const handleCellMouseEnter = useCallback(
    (slotKey: string, e: React.MouseEvent) => {
      if (session.is_closed || gridMode === "inspect") {
        setHoveredSlot(slotKey);
        setMousePos({ x: e.clientX, y: e.clientY });
      } else {
        setHoveredSlot(null);
      }
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
    [
      session.is_closed,
      gridMode,
      isDragging,
      currentUser,
      guestName,
      mySlots,
      dragMode,
      setMySlots,
      setHasUnsavedChanges,
      setShowSavedText,
    ],
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
      setHighlightedUserId(null);
      setMySlots(next);
      setHasUnsavedChanges(true);
      setShowSavedText(false);
      setStatusMessage(null);
    },
    [
      session.is_closed,
      gridMode,
      currentUser,
      guestName,
      mySlots,
      setMySlots,
      setHasUnsavedChanges,
      setShowSavedText,
      setStatusMessage,
    ],
  );

  const handleCellMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleTouchSlotMove = useCallback(
    (slotKey: string) => {
      if (
        session.is_closed ||
        gridMode === "inspect" ||
        !isDragging ||
        (!currentUser && !guestName)
      ) {
        return;
      }
      setMySlots((prev) => {
        const hasSlot = prev.has(slotKey);
        if (
          (dragMode === "add" && hasSlot) ||
          (dragMode === "remove" && !hasSlot)
        ) {
          return prev;
        }
        const next = new Set(prev);
        if (dragMode === "add") next.add(slotKey);
        else next.delete(slotKey);
        return next;
      });
      setHasUnsavedChanges(true);
      setShowSavedText(false);
    },
    [
      session.is_closed,
      gridMode,
      isDragging,
      currentUser,
      guestName,
      dragMode,
      setMySlots,
      setHasUnsavedChanges,
      setShowSavedText,
    ],
  );

  const handleTableMouseLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  const handleSaveChoices = async (): Promise<boolean> => {
    if (!currentUser && !guestName) {
      setShowIdentityModal(true);
      return false;
    }
    const ok = await saveChoicesToServer();
    if (ok) {
      setUserGridMode("inspect");
    }
    return ok;
  };

  const handleRemoveParticipant = async (userId: string) => {
    await removeParticipantFromServer(userId, () => {
      if (highlightedUserId === userId) {
        setHighlightedUserId(null);
      }
    });
  };

  const handleGuestConfirm = (chosenGuestName: string) => {
    void handleChangeGuestName(chosenGuestName);
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
  const hasChoices = mySlots.size > 0 || serverVoterSlots.size > 0;
  const isParticipant = Boolean(currentUser && hasChoices);

  const showUnsavedReminder =
    hasUnsavedChanges && Boolean(pendingNavigationPage || pendingLocalAction);

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
      setUserGridMode("inspect");
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

  const handleReminderCancel = useCallback(() => {
    setPendingLocalAction(null);
    onCancelPendingNavigation?.();
  }, [onCancelPendingNavigation]);

  return (
    <div className="w-full space-y-8">
      {showUnsavedReminder && (
        <UnsavedChoicesModal
          saving={saving}
          onCancel={handleReminderCancel}
          onDiscardAndContinue={handleReminderDiscardAndContinue}
          onSaveAndContinue={handleReminderSaveAndContinue}
        />
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

      <SessionHeader
        session={session}
        currentUser={currentUser}
        guestName={guestName}
        isCreator={isCreator}
        isClosed={isClosed}
        isParticipant={isParticipant}
        hasChoices={hasChoices}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        showSavedText={showSavedText}
        gridMode={gridMode}
        onBackClick={() => {
          if (hasUnsavedChanges) {
            setPendingLocalAction("back");
          } else {
            onBack();
          }
        }}
        onChangeGuestName={() => setShowIdentityModal(true)}
        onSelectVoteMode={() => {
          setUserGridMode("vote");
          setSelectedSlot(null);
          setHighlightedUserId(null);
          setHoveredSlot(null);
          if (!currentUser && !guestName) {
            setShowIdentityModal(true);
          }
        }}
        onSelectInspectMode={() => {
          if (gridMode !== "inspect" && hasUnsavedChanges) {
            setPendingLocalAction("inspect");
          } else {
            setUserGridMode("inspect");
          }
        }}
        onSaveChoices={handleSaveChoices}
        onToggleClose={handleToggleClose}
        onClearMine={handleClearMine}
        onQuitSession={onQuitSession}
        onDeleteSession={onDeleteSession}
      />

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
        <BestMatchesSection
          bestMatchWindows={bestMatchWindows}
          totalParticipants={totalParticipants}
          highlightedUserId={highlightedUserId}
          assignedColors={assignedColors}
          isCreator={isCreator}
          saving={saving}
          onToggleClose={handleToggleClose}
        />
      )}

      <div
        className={
          isClosed ? "pt-6 border-t border-white/15 space-y-4" : "space-y-4"
        }
      >
        <div className="flex items-center justify-between gap-3">
          {isClosed ? (
            <h2 className="text-2xl font-semibold text-white">
              Final Calendar
            </h2>
          ) : (
            <div />
          )}
          {session.days.length > 4 && (
            <div
              className={`${
                session.days.length > 7 ? "flex" : "flex md:hidden"
              } items-center justify-end gap-2`}
            >
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
          showOnlyMine={!isClosed && gridMode === "vote"}
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
          onTouchSlotMove={handleTouchSlotMove}
          onMouseLeave={handleTableMouseLeave}
        />
      </div>

      {(isClosed || gridMode === "inspect") && hoveredSlot && (
        <SlotHoverTooltip
          hoveredSlot={hoveredSlot}
          mousePos={mousePos}
          hoveredParticipants={hoveredParticipants}
          totalParticipants={totalParticipants}
          assignedColors={assignedColors}
          activeVoterId={activeVoterId}
        />
      )}

      {!isClosed && selectedSlot && gridMode === "inspect" && (
        <SlotInspectPanel
          selectedSlot={selectedSlot}
          inspectedBlocks={inspectedBlocks}
          totalParticipants={totalParticipants}
          isCreator={isCreator}
          currentUser={currentUser}
          saving={saving}
          assignedColors={assignedColors}
          onClose={() => setSelectedSlot(null)}
          onRemoveTimeWindow={handleRemoveTimeWindow}
          onRemoveParticipant={handleRemoveParticipant}
        />
      )}

      <ParticipantListSection
        participants={participants}
        highlightedUserId={highlightedUserId}
        userBlocksMap={userBlocksMap}
        assignedColors={assignedColors}
        isCreator={isCreator}
        creatorId={session.creator_id}
        currentUser={currentUser}
        saving={saving}
        onSelectHighlightedUser={(userId) => {
          setHighlightedUserId(userId);
          if (userId && gridMode === "vote" && !hasUnsavedChanges) {
            setUserGridMode("inspect");
          }
        }}
        onRemoveParticipant={handleRemoveParticipant}
        onRemoveTimeWindow={handleRemoveTimeWindow}
      />

      {!isClosed && (
        <MatchingDatesSection mergedMatchingWindows={mergedMatchingWindows} />
      )}
    </div>
  );
}
