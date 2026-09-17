/**
 * MODULE  supabase/types
 *
 * Purpose          Type the database rows the repositories read and write.
 * Responsibilities Mirror `supabase/schema.sql` exactly.
 * Notes            Hand-written rather than generated so the repo has no
 *                  codegen step. If a column changes here, change the SQL in
 *                  the same commit.
 */

import type { BusinessStatus } from "@/lib/domain/business";
import type { LeadKind, LeadStatus } from "@/lib/domain/lead";

export type BusinessRow = {
  id: string;
  owner_id: string | null;
  slug: string;
  status: BusinessStatus;
  profile: unknown;
  theme: unknown;
  created_at: string;
  updated_at: string;
};

export type BusinessInsert = {
  owner_id: string | null;
  slug: string;
  status: BusinessStatus;
  profile: unknown;
  theme: unknown;
};

/**
 * `owner_id` is updatable so an anonymous draft can be claimed after sign-up,
 * but only through `claimOwnership`, which filters on `owner_id is null`.
 */
export type BusinessUpdate = Partial<
  Pick<BusinessInsert, "slug" | "status" | "profile" | "theme" | "owner_id">
>;

export type LeadRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  message: string | null;
  plan_name: string | null;
  kind: LeadKind;
  status: LeadStatus;
  created_at: string;
};

export type LeadInsert = Omit<LeadRow, "id" | "created_at" | "status"> & {
  status?: LeadStatus;
};

export type PageViewDayRow = {
  business_id: string;
  day: string;
  views: number;
};

export type RateLimitRow = {
  key: string;
  count: number;
  reset_at: string;
};

export type Database = {
  public: {
    Tables: {
      rate_limits: {
        Row: RateLimitRow;
        Insert: RateLimitRow;
        Update: Partial<RateLimitRow>;
        Relationships: [];
      };
      page_view_days: {
        Row: PageViewDayRow;
        Insert: PageViewDayRow;
        Update: Partial<PageViewDayRow>;
        Relationships: [];
      };
      businesses: {
        Row: BusinessRow;
        Insert: BusinessInsert;
        Update: BusinessUpdate;
        Relationships: [];
      };
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: Partial<LeadInsert>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      record_page_view: {
        Args: { target_business_id: string };
        Returns: undefined;
      };
      hit_rate_limit: {
        Args: { bucket_key: string; max_hits: number; window_seconds: number };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
