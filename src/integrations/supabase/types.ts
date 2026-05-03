export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      import_jobs: {
        Row: {
          created_at: string | null
          error_log: string | null
          id: string
          is_duplicate: boolean | null
          processed_at: string | null
          property_url: string
          raw_data: Json | null
          retry_count: number | null
          session_id: string | null
          status: Database["public"]["Enums"]["import_job_status"] | null
        }
        Insert: {
          created_at?: string | null
          error_log?: string | null
          id?: string
          is_duplicate?: boolean | null
          processed_at?: string | null
          property_url: string
          raw_data?: Json | null
          retry_count?: number | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["import_job_status"] | null
        }
        Update: {
          created_at?: string | null
          error_log?: string | null
          id?: string
          is_duplicate?: boolean | null
          processed_at?: string | null
          property_url?: string
          raw_data?: Json | null
          retry_count?: number | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["import_job_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          items_count: number | null
          message: string
          page_number: number | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          items_count?: number | null
          message: string
          page_number?: number | null
          status: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          items_count?: number | null
          message?: string
          page_number?: number | null
          status?: string
        }
        Relationships: []
      }
      import_preview_selections: {
        Row: {
          created_at: string | null
          edited_data: Json | null
          id: string
          job_id: string | null
          selected: boolean | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          edited_data?: Json | null
          id?: string
          job_id?: string | null
          selected?: boolean | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          edited_data?: Json | null
          id?: string
          job_id?: string | null
          selected?: boolean | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_preview_selections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_preview_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sessions: {
        Row: {
          created_at: string | null
          error_log: string | null
          finished_at: string | null
          id: string
          source_url: string
          status: Database["public"]["Enums"]["import_session_status"] | null
          total_done: number | null
          total_failed: number | null
          total_found: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_log?: string | null
          finished_at?: string | null
          id?: string
          source_url: string
          status?: Database["public"]["Enums"]["import_session_status"] | null
          total_done?: number | null
          total_failed?: number | null
          total_found?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_log?: string | null
          finished_at?: string | null
          id?: string
          source_url?: string
          status?: Database["public"]["Enums"]["import_session_status"] | null
          total_done?: number | null
          total_failed?: number | null
          total_found?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          area: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          data: Json | null
          description: string | null
          external_id: string | null
          features_json: Json | null
          id: string
          images: string[] | null
          location_json: Json | null
          media_urls: string[] | null
          metadata: Json | null
          neighborhood: string | null
          original_data: Json | null
          parking: number | null
          permuta_details: string | null
          permuta_enabled: boolean | null
          price: number
          scraped_at: string | null
          source_url: string | null
          status: string | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          external_id?: string | null
          features_json?: Json | null
          id?: string
          images?: string[] | null
          location_json?: Json | null
          media_urls?: string[] | null
          metadata?: Json | null
          neighborhood?: string | null
          original_data?: Json | null
          parking?: number | null
          permuta_details?: string | null
          permuta_enabled?: boolean | null
          price: number
          scraped_at?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          external_id?: string | null
          features_json?: Json | null
          id?: string
          images?: string[] | null
          location_json?: Json | null
          media_urls?: string[] | null
          metadata?: Json | null
          neighborhood?: string | null
          original_data?: Json | null
          parking?: number | null
          permuta_details?: string | null
          permuta_enabled?: boolean | null
          price?: number
          scraped_at?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_session_done: {
        Args: { session_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      import_job_status:
        | "pending"
        | "processing"
        | "done"
        | "failed"
        | "skipped"
      import_session_status:
        | "scanning"
        | "processing"
        | "done"
        | "cancelled"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      import_job_status: ["pending", "processing", "done", "failed", "skipped"],
      import_session_status: [
        "scanning",
        "processing",
        "done",
        "cancelled",
        "failed",
      ],
    },
  },
} as const
