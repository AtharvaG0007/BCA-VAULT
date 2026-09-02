import type { User } from "npm:@supabase/supabase-js@2";

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AdminAuthIdentity {
  user: User;
}

export interface StorageCandidateFile {
  name: string;
  id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  last_accessed_at?: string | null;
  metadata?: Record<string, unknown> | null;
}
