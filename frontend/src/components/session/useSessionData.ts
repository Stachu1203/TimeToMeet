import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteAvailabilityWindow,
  deleteMyAvailabilities,
  fetchGroup,
  fetchGroupAvailabilities,
  fetchGroupHeatmap,
  removeParticipant,
  saveAvailabilities,
} from "../../api";
import { slotsToAvailabilityPayloads } from "../../mockData";
import type {
  AvailabilityBlock,
  GroupSession,
  HeatmapResponse,
  User,
} from "../../types";
import {
  assignParticipantColors,
  computeHeatmapAndMatches,
  computeParticipantsAndSlots,
  extractUserSlots,
} from "./sessionUtils";

interface UseSessionDataParams {
  session: GroupSession;
  currentUser: User | null;
  isDragging: boolean;
  onToggleCloseSession: (sessionId: string, isClosed: boolean) => Promise<void>;
  onSessionSync?: (updatedSession: GroupSession) => void;
  onSessionUpdated?: () => void;
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
}

export function useSessionData({
  session,
  currentUser,
  isDragging,
  onToggleCloseSession,
  onSessionSync,
  onSessionUpdated,
  onUnsavedChangesChange,
}: UseSessionDataParams) {
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
          setMySlots(extractUserSlots(avs, targetVoterId));
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
          setMySlots(extractUserSlots(avs, currentUser.id));
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
          setMySlots(extractUserSlots(avs, targetVoterId));
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

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.title = "TimeToMeet";
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

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
  } = useMemo(
    () =>
      computeParticipantsAndSlots(
        availabilities,
        session.creator_id,
        session.creator_name,
        activeVoterId,
        activeVoterName,
        mySlots,
      ),
    [
      availabilities,
      session.creator_id,
      session.creator_name,
      activeVoterId,
      activeVoterName,
      mySlots,
    ],
  );

  const {
    heatmapCounts,
    totalParticipants,
    mergedMatchingWindows,
    bestMatchWindows,
  } = useMemo(
    () =>
      computeHeatmapAndMatches(
        heatmapData,
        activeVoterId,
        activeVoterName,
        serverVoterSlots,
        mySlots,
        slotParticipantsMap,
      ),
    [
      heatmapData,
      activeVoterId,
      activeVoterName,
      serverVoterSlots,
      mySlots,
      slotParticipantsMap,
    ],
  );

  const assignedColors = useMemo(
    () => assignParticipantColors(participants, currentUser),
    [participants, currentUser],
  );

  const handleSaveChoices = async (): Promise<boolean> => {
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

  const handleRemoveParticipant = async (
    userId: string,
    onRemoved?: () => void,
  ) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await removeParticipant(session.id, userId);
      onRemoved?.();
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

  return {
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
    setGuestName,
    guestUserId,
    setGuestUserId,
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
    handleSaveChoices,
    handleToggleClose,
    handleClearMine,
    handleRemoveParticipant,
    handleRemoveTimeWindow,
  };
}
