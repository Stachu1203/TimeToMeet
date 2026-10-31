import { availabilityBlockToSlotKeys, normalizeSlotKey } from "../../mockData";
import type { AvailabilityBlock, HeatmapResponse, User } from "../../types";

export const PARTICIPANT_PALETTE = [
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

export interface MergedWindow {
  date: string;
  startTime: string;
  endTime: string;
}

export interface BestMatchWindow {
  date: string;
  startTime: string;
  endTime: string;
  count: number;
  users: User[];
  userIdsKey: string;
}

export function add30Minutes(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + 30;
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
}

export function formatBlockTimeRange(startIso: string, endIso: string): string {
  const s = normalizeSlotKey(startIso);
  const e = normalizeSlotKey(endIso);
  const [sDate, sTime] = s.split("T");
  const [, eTime] = e.split("T");
  return `${sDate} · ${sTime} – ${eTime}`;
}

export function extractUserSlots(
  availabilities: AvailabilityBlock[],
  userId: string,
): Set<string> {
  const mine = new Set<string>();
  for (const block of availabilities) {
    if (block.user_id === userId) {
      for (const k of availabilityBlockToSlotKeys(
        block.start_time,
        block.end_time,
      )) {
        mine.add(k);
      }
    }
  }
  return mine;
}

export function computeParticipantsAndSlots(
  availabilities: AvailabilityBlock[],
  creatorId: string | null | undefined,
  creatorName: string | null | undefined,
  activeVoterId: string | null,
  activeVoterName: string | null,
  mySlots: Set<string>,
) {
  const pMap = new Map<string, User>();
  const uSlots: Record<string, Set<string>> = {};
  const sBlocks: Record<string, AvailabilityBlock[]> = {};
  const uBlocks: Record<string, AvailabilityBlock[]> = {};
  const sParticipants: Record<string, User[]> = {};

  if (creatorId && creatorName) {
    pMap.set(creatorId, {
      id: creatorId,
      name: creatorName,
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

    const keys = availabilityBlockToSlotKeys(block.start_time, block.end_time);
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
}

export function computeHeatmapAndMatches(
  heatmapData: HeatmapResponse,
  activeVoterId: string | null,
  activeVoterName: string | null,
  serverVoterSlots: Set<string>,
  mySlots: Set<string>,
  slotParticipantsMap: Record<string, User[]>,
) {
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
}

export function assignParticipantColors(
  participants: User[],
  currentUser: User | null,
): Map<string, string> {
  const map = new Map<string, string>();
  participants.forEach((user, idx) => {
    const color = PARTICIPANT_PALETTE[idx % PARTICIPANT_PALETTE.length];
    map.set(user.id, color);
  });
  if (currentUser && !map.has(currentUser.id)) {
    map.set(
      currentUser.id,
      PARTICIPANT_PALETTE[participants.length % PARTICIPANT_PALETTE.length],
    );
  }
  return map;
}
