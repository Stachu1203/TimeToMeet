export type PageName = 'home' | 'login' | 'create' | 'session' | 'help';

export interface User {
  id: string;
  name: string;
  email?: string | null;
}

export interface GroupDay {
  id: string;
  group_id: string;
  date: string;
}

export interface AvailabilityBlock {
  id: string;
  group_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
}

export interface GroupSession {
  id: string;
  creator_id?: string | null;
  title: string;
  created_at: string;
  timezone: string;
  grid_start_hour: string;
  grid_end_hour: string;
  days: GroupDay[];
  participants: User[];
  userSlots: Record<string, string[]>;
}

export interface GroupCreatePayload {
  title: string;
  timezone: string;
  grid_start_hour: string;
  grid_end_hour: string;
  dates: string[];
}
