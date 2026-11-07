import { supabase } from '@/lib/supabase';
import type { ActivityLog } from '@/types/activity';

const ACTIVITY_LIMIT = 200;

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, actor_email, subject_name, folder_name, created_at')
    .order('created_at', { ascending: false })
    .limit(ACTIVITY_LIMIT);
  if (error || !Array.isArray(data)) throw new Error('The activity log could not be loaded. Please try again.');
  return data as ActivityLog[];
}
