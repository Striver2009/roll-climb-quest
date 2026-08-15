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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      daily_runs: {
        Row: {
          completed_at: string | null
          completed_tasks: Json
          created_at: string
          current_index: number
          id: string
          local_date: string
          rolled_at: string
          sequence: Json
          task_set_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_tasks?: Json
          created_at?: string
          current_index?: number
          id?: string
          local_date: string
          rolled_at?: string
          sequence: Json
          task_set_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_tasks?: Json
          created_at?: string
          current_index?: number
          id?: string
          local_date?: string
          rolled_at?: string
          sequence?: Json
          task_set_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_runs_task_set_id_fkey"
            columns: ["task_set_id"]
            isOneToOne: false
            referencedRelation: "task_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          last_login_at: string
          name: string | null
          timezone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          last_login_at?: string
          name?: string | null
          timezone?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_login_at?: string
          name?: string | null
          timezone?: string
        }
        Relationships: []
      }
      task_sets: {
        Row: {
          created_at: string
          current_streak: number
          emoji: string
          id: string
          last_completed_date: string | null
          longest_streak: number
          name: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          emoji?: string
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          name: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          emoji?: string
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          name?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          position: number
          task_set_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          position?: number
          task_set_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          position?: number
          task_set_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_task_set_id_fkey"
            columns: ["task_set_id"]
            isOneToOne: false
            referencedRelation: "task_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          animation_mode: string
          effects_enabled: boolean
          effects_volume: number
          environment: string
          master_mute: boolean
          music_enabled: boolean
          music_volume: number
          updated_at: string
          user_id: string
        }
        Insert: {
          animation_mode?: string
          effects_enabled?: boolean
          effects_volume?: number
          environment?: string
          master_mute?: boolean
          music_enabled?: boolean
          music_volume?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          animation_mode?: string
          effects_enabled?: boolean
          effects_volume?: number
          environment?: string
          master_mute?: boolean
          music_enabled?: boolean
          music_volume?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          current_streak: number
          longest_streak: number
          total_completed_days: number
          total_completed_tasks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          longest_streak?: number
          total_completed_days?: number
          total_completed_tasks?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          longest_streak?: number
          total_completed_days?: number
          total_completed_tasks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_current_task: {
        Args: { p_daily_run_id: string; p_task_id: string }
        Returns: {
          completed_at: string | null
          completed_tasks: Json
          created_at: string
          current_index: number
          id: string
          local_date: string
          rolled_at: string
          sequence: Json
          task_set_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      roll_daily_run: {
        Args: { p_local_date: string; p_task_set_id: string }
        Returns: {
          completed_at: string | null
          completed_tasks: Json
          created_at: string
          current_index: number
          id: string
          local_date: string
          rolled_at: string
          sequence: Json
          task_set_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
