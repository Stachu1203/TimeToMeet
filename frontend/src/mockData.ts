import type { AvailabilityBlock, GroupSession, User } from './types';

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

export function slotsToAvailabilityBlocks(
  slotKeys: string[],
  groupId: string,
  userId: string
): AvailabilityBlock[] {
  if (slotKeys.length === 0) return [];

  const sorted = [...slotKeys].sort();
  const blocks: AvailabilityBlock[] = [];

  function addMinutes(slotKey: string, mins: number): string {
    const [datePart, timePart] = slotKey.split('T');
    const [h, m] = timePart.split(':').map(Number);
    const totalMinutes = h * 60 + m + mins;
    const nextH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const nextM = String(totalMinutes % 60).padStart(2, '0');
    return `${datePart}T${nextH}:${nextM}`;
  }

  let currentStart = sorted[0];
  let currentEnd = addMinutes(sorted[0], 30);

  for (let i = 1; i < sorted.length; i++) {
    const slot = sorted[i];
    if (slot === currentEnd) {
      currentEnd = addMinutes(slot, 30);
    } else {
      blocks.push({
        id: `block-${blocks.length}`,
        group_id: groupId,
        user_id: userId,
        start_time: `${currentStart}:00`,
        end_time: `${currentEnd}:00`,
      });
      currentStart = slot;
      currentEnd = addMinutes(slot, 30);
    }
  }

  blocks.push({
    id: `block-${blocks.length}`,
    group_id: groupId,
    user_id: userId,
    start_time: `${currentStart}:00`,
    end_time: `${currentEnd}:00`,
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

export const DEMO_USERS: User[] = [
  { id: 'u-alice', name: 'Alice Nowak', email: 'alice@example.com' },
  { id: 'u-bartek', name: 'Bartek Kowalski', email: 'bartek@example.com' },
  { id: 'u-claire', name: 'Claire Wiśniewska', email: 'claire@example.com' },
  { id: 'u-dawid', name: 'Dawid Zieliński', email: 'dawid@example.com' },
];

export const INITIAL_SESSIONS: GroupSession[] = [
  {
    id: 'a8098c1a-f86e-11da-bd1a-00112444be1e',
    creator_id: 'u-alice',
    title: 'Product Design Sprint Sync',
    created_at: '2026-10-28',
    timezone: 'Europe/Warsaw',
    grid_start_hour: '09:00:00',
    grid_end_hour: '16:00:00',
    days: [
      { id: 'd-1', group_id: 'a8098c1a-f86e-11da-bd1a-00112444be1e', date: '2026-11-02' },
      { id: 'd-2', group_id: 'a8098c1a-f86e-11da-bd1a-00112444be1e', date: '2026-11-03' },
      { id: 'd-3', group_id: 'a8098c1a-f86e-11da-bd1a-00112444be1e', date: '2026-11-04' },
      { id: 'd-4', group_id: 'a8098c1a-f86e-11da-bd1a-00112444be1e', date: '2026-11-05' },
    ],
    participants: DEMO_USERS,
    userSlots: {
      'u-alice': [
        '2026-11-02T09:30', '2026-11-02T10:00', '2026-11-02T10:30', '2026-11-02T11:00',
        '2026-11-03T10:00', '2026-11-03T10:30', '2026-11-03T11:00', '2026-11-03T11:30',
        '2026-11-04T13:00', '2026-11-04T13:30', '2026-11-04T14:00',
        '2026-11-05T10:00', '2026-11-05T10:30',
      ],
      'u-bartek': [
        '2026-11-02T10:00', '2026-11-02T10:30', '2026-11-02T11:00', '2026-11-02T11:30',
        '2026-11-03T10:00', '2026-11-03T10:30', '2026-11-03T11:00',
        '2026-11-04T09:00', '2026-11-04T09:30', '2026-11-04T13:00', '2026-11-04T13:30',
      ],
      'u-claire': [
        '2026-11-02T10:00', '2026-11-02T10:30',
        '2026-11-03T09:30', '2026-11-03T10:00', '2026-11-03T10:30', '2026-11-03T11:00',
        '2026-11-05T14:00', '2026-11-05T14:30', '2026-11-05T15:00',
      ],
      'u-dawid': [
        '2026-11-03T10:00', '2026-11-03T10:30', '2026-11-03T11:00',
        '2026-11-04T13:00', '2026-11-04T13:30',
        '2026-11-05T10:00', '2026-11-05T10:30',
      ],
    },
  },
  {
    id: 'b9120d2b-c11a-44eb-9a10-002233445566',
    creator_id: 'u-bartek',
    title: 'Database Architecture Review',
    created_at: '2026-10-29',
    timezone: 'Europe/Warsaw',
    grid_start_hour: '10:00:00',
    grid_end_hour: '15:00:00',
    days: [
      { id: 'd-5', group_id: 'b9120d2b-c11a-44eb-9a10-002233445566', date: '2026-11-09' },
      { id: 'd-6', group_id: 'b9120d2b-c11a-44eb-9a10-002233445566', date: '2026-11-10' },
      { id: 'd-7', group_id: 'b9120d2b-c11a-44eb-9a10-002233445566', date: '2026-11-12' },
    ],
    participants: [DEMO_USERS[0], DEMO_USERS[1], DEMO_USERS[2]],
    userSlots: {
      'u-alice': ['2026-11-09T11:00', '2026-11-09T11:30', '2026-11-10T12:00', '2026-11-10T12:30'],
      'u-bartek': ['2026-11-09T11:00', '2026-11-09T11:30', '2026-11-10T12:00', '2026-11-10T12:30', '2026-11-12T10:00'],
      'u-claire': ['2026-11-10T12:00', '2026-11-10T12:30', '2026-11-12T13:00', '2026-11-12T13:30'],
    },
  },
];
