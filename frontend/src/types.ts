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
  voter_name?: string | null;
  start_time: string;
  end_time: string;
}

export interface AvailabilityCreatePayload {
  start_time: string;
  end_time: string;
  voter_name?: string | null;
  user_id?: string | null;
}

export interface GroupSession {
  id: string;
  creator_id: string;
  creator_name?: string | null;
  title: string;
  description?: string | null;
  created_at: string;
  timezone: string;
  grid_start_hour: string;
  grid_end_hour: string;
  is_closed?: boolean;
  days: GroupDay[];
}

export interface GroupCreatePayload {
  title: string;
  description?: string | null;
  timezone: string;
  grid_start_hour: string;
  grid_end_hour: string;
  days: string[];
}

export interface HeatmapResponse {
  total_participants: number;
  heatmap: Record<string, number>;
  available_users: Record<string, string[]>;
}
