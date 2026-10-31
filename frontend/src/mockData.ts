import type { AvailabilityCreatePayload } from './types';

export function generateTimeLabels(gridStartHour: string, gridEndHour: string): string[] {
  const startHour = parseInt(gridStartHour.split(':')[0], 10);
  const endHour = parseInt(gridEndHour.split(':')[0], 10);

  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    const hh = String(h).padStart(2, '0');
    slots.push(`${hh}:00`);
    slots.push(`${hh}:30`);
  }
  return slots;
}

export function makeSlotKey(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}`;
}

export function normalizeSlotKey(isoStr: string): string {
  return isoStr.slice(0, 16);
}

export function addMinutesToSlotKey(slotKey: string, mins: number): string {
  const [datePart, timePart] = slotKey.slice(0, 16).split('T');
  const [h, m] = timePart.split(':').map(Number);
  const totalMinutes = h * 60 + m + mins;
  const nextH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const nextM = String(totalMinutes % 60).padStart(2, '0');
  return `${datePart}T${nextH}:${nextM}`;
}

export function availabilityBlockToSlotKeys(startIso: string, endIso: string): string[] {
  const startKey = normalizeSlotKey(startIso);
  const endKey = normalizeSlotKey(endIso);
  const result: string[] = [];
  let cursor = startKey;
  let guard = 0;
  while (cursor < endKey && guard < 96) {
    result.push(cursor);
    cursor = addMinutesToSlotKey(cursor, 30);
    guard++;
  }
  return result;
}

export function slotsToAvailabilityPayloads(
  slotKeys: string[],
  voterName?: string | null,
  guestUserId?: string | null
): AvailabilityCreatePayload[] {
  if (slotKeys.length === 0) return [];

  const sorted = [...slotKeys].sort();
  const blocks: AvailabilityCreatePayload[] = [];

  let currentStart = sorted[0];
  let currentEnd = addMinutesToSlotKey(sorted[0], 30);

  for (let i = 1; i < sorted.length; i++) {
    const slot = sorted[i];
    if (slot === currentEnd) {
      currentEnd = addMinutesToSlotKey(slot, 30);
    } else {
      blocks.push({
        start_time: `${currentStart}:00`,
        end_time: `${currentEnd}:00`,
        ...(voterName ? { voter_name: voterName } : {}),
        ...(guestUserId ? { user_id: guestUserId } : {}),
      });
      currentStart = slot;
      currentEnd = addMinutesToSlotKey(slot, 30);
    }
  }

  blocks.push({
    start_time: `${currentStart}:00`,
    end_time: `${currentEnd}:00`,
    ...(voterName ? { voter_name: voterName } : {}),
    ...(guestUserId ? { user_id: guestUserId } : {}),
  });

  return blocks;
}

export function formatShortDate(dateStr: string): { weekday: string; monthDay: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { weekday, monthDay };
}

export function formatCreationDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
