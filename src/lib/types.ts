export type Role = 'public' | 'moderator' | 'editor' | 'admin';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'published';
export type SubmissionType = 'tip' | 'question' | 'experience';
export type RedactieStatus = 'nieuw' | 'in_behandeling' | 'afgehandeld' | 'gearchiveerd';
export type Sentiment = 'positief' | 'neutraal' | 'negatief';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  created_at: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string | null;
  topic_id: string | null;
  type: SubmissionType;
  title: string;
  content: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  file_url: string | null;
  anonymous: boolean;
  status: SubmissionStatus;
  moderation_notes: string | null;
  ai_flagged: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  // VPRO-style editorial workflow fields (added in migration 005)
  samenvatting?: string | null;
  trefwoorden?: string[] | null;
  prioriteit?: number | null;
  sentiment?: Sentiment | null;
  compleetheid_score?: number | null;
  labels?: string[] | null;
  redactie_status?: RedactieStatus | null;
  is_spam?: boolean | null;
}

export interface Reply {
  id: string;
  submission_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; email: string }; Update: Partial<Profile> };
      topics:   { Row: Topic;   Insert: Partial<Topic>   & { name: string };               Update: Partial<Topic> };
      submissions: { Row: Submission; Insert: Partial<Submission> & { title: string; content: string }; Update: Partial<Submission> };
      replies:  { Row: Reply;   Insert: Partial<Reply>   & { submission_id: string; content: string };  Update: Partial<Reply> };
      likes: {
        Row: { submission_id: string; user_id: string; created_at: string };
        Insert: { submission_id: string; user_id: string };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
