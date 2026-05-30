/** Row from `public.users` (password never stored in client state). */
export interface AppUser {
  id: number;
  username: string;
  role: string | null;
  status: boolean;
  notes: string | null;
  created_at: string;
  /** Permission scopes from auth API (e.g. `video_editor:write`). */
  scopes: string[];
}
