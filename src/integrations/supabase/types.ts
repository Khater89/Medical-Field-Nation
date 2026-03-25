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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      booking_contacts: {
        Row: {
          booking_id: string
          client_address_text: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
        }
        Insert: {
          booking_id: string
          client_address_text?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
        }
        Update: {
          booking_id?: string
          client_address_text?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_contacts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_history: {
        Row: {
          action: string
          booking_id: string
          created_at: string
          id: string
          note: string | null
          performed_by: string
          performer_role: string
        }
        Insert: {
          action: string
          booking_id: string
          created_at?: string
          id?: string
          note?: string | null
          performed_by: string
          performer_role: string
        }
        Update: {
          action?: string
          booking_id?: string
          created_at?: string
          id?: string
          note?: string | null
          performed_by?: string
          performer_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_outbox: {
        Row: {
          attempts: number
          booking_id: string
          created_at: string
          destination: string
          id: string
          last_error: string | null
          next_retry_at: string | null
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          booking_id: string
          created_at?: string
          destination?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          payload: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          booking_id?: string
          created_at?: string
          destination?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_outbox_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accepted_at: string | null
          actual_duration_minutes: number | null
          agreed_price: number | null
          ai_safety_note: string | null
          ai_service_match: string | null
          ai_summary: string | null
          ai_tools_list: string[] | null
          area_public: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_provider_id: string | null
          booking_number: string | null
          calculated_total: number | null
          check_in_at: string | null
          check_out_at: string | null
          city: string
          client_disclaimer_accepted_at: string | null
          client_lat: number | null
          client_lng: number | null
          close_out_at: string | null
          close_out_note: string | null
          completed_at: string | null
          completed_by: string | null
          connect_charge_type: string | null
          contact_revealed_at: string | null
          created_at: string
          customer_display_name: string | null
          customer_user_id: string | null
          deal_confirmed_at: string | null
          deal_confirmed_by: string | null
          deposit_amount: number | null
          deposit_status: string | null
          id: string
          internal_note: string | null
          last_provider_reminder_at: string | null
          notes: string | null
          otp_code: string | null
          payment_method: string
          payment_status: string
          platform_fee: number
          provider_payout: number
          provider_share: number | null
          reject_reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          remaining_cash_amount: number | null
          reveal_contact_allowed: boolean | null
          scheduled_at: string
          service_id: string
          status: string
          stripe_application_fee_amount: number | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_transfer_id: string | null
          subtotal: number
          voice_transcript: string | null
          voice_url: string | null
        }
        Insert: {
          accepted_at?: string | null
          actual_duration_minutes?: number | null
          agreed_price?: number | null
          ai_safety_note?: string | null
          ai_service_match?: string | null
          ai_summary?: string | null
          ai_tools_list?: string[] | null
          area_public?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_provider_id?: string | null
          booking_number?: string | null
          calculated_total?: number | null
          check_in_at?: string | null
          check_out_at?: string | null
          city: string
          client_disclaimer_accepted_at?: string | null
          client_lat?: number | null
          client_lng?: number | null
          close_out_at?: string | null
          close_out_note?: string | null
          completed_at?: string | null
          completed_by?: string | null
          connect_charge_type?: string | null
          contact_revealed_at?: string | null
          created_at?: string
          customer_display_name?: string | null
          customer_user_id?: string | null
          deal_confirmed_at?: string | null
          deal_confirmed_by?: string | null
          deposit_amount?: number | null
          deposit_status?: string | null
          id?: string
          internal_note?: string | null
          last_provider_reminder_at?: string | null
          notes?: string | null
          otp_code?: string | null
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          provider_payout?: number
          provider_share?: number | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          remaining_cash_amount?: number | null
          reveal_contact_allowed?: boolean | null
          scheduled_at: string
          service_id: string
          status?: string
          stripe_application_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          subtotal?: number
          voice_transcript?: string | null
          voice_url?: string | null
        }
        Update: {
          accepted_at?: string | null
          actual_duration_minutes?: number | null
          agreed_price?: number | null
          ai_safety_note?: string | null
          ai_service_match?: string | null
          ai_summary?: string | null
          ai_tools_list?: string[] | null
          area_public?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_provider_id?: string | null
          booking_number?: string | null
          calculated_total?: number | null
          check_in_at?: string | null
          check_out_at?: string | null
          city?: string
          client_disclaimer_accepted_at?: string | null
          client_lat?: number | null
          client_lng?: number | null
          close_out_at?: string | null
          close_out_note?: string | null
          completed_at?: string | null
          completed_by?: string | null
          connect_charge_type?: string | null
          contact_revealed_at?: string | null
          created_at?: string
          customer_display_name?: string | null
          customer_user_id?: string | null
          deal_confirmed_at?: string | null
          deal_confirmed_by?: string | null
          deposit_amount?: number | null
          deposit_status?: string | null
          id?: string
          internal_note?: string | null
          last_provider_reminder_at?: string | null
          notes?: string | null
          otp_code?: string | null
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          provider_payout?: number
          provider_share?: number | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          remaining_cash_amount?: number | null
          reveal_contact_allowed?: boolean | null
          scheduled_at?: string
          service_id?: string
          status?: string
          stripe_application_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          subtotal?: number
          voice_transcript?: string | null
          voice_url?: string | null
        }
        Relationships: []
      }
      data_access_log: {
        Row: {
          accessed_by: string
          accessor_role: string
          action: string
          booking_id: string | null
          created_at: string
          id: string
        }
        Insert: {
          accessed_by: string
          accessor_role: string
          action: string
          booking_id?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          accessed_by?: string
          accessor_role?: string
          action?: string
          booking_id?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          payload: Json | null
          type: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          type: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          coordinator_phone: string | null
          coordinator_phone_2: string | null
          deposit_percent: number
          id: number
          platform_fee_percent: number
          provider_debt_limit: number
          setup_completed: boolean
          updated_at: string
        }
        Insert: {
          coordinator_phone?: string | null
          coordinator_phone_2?: string | null
          deposit_percent?: number
          id?: number
          platform_fee_percent?: number
          provider_debt_limit?: number
          setup_completed?: boolean
          updated_at?: string
        }
        Update: {
          coordinator_phone?: string | null
          coordinator_phone_2?: string | null
          deposit_percent?: number
          id?: number
          platform_fee_percent?: number
          provider_debt_limit?: number
          setup_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_text: string | null
          available_now: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          experience_years: number | null
          full_name: string | null
          languages: string[] | null
          last_active_at: string | null
          lat: number | null
          license_file_url: string | null
          license_id: string | null
          lng: number | null
          phone: string | null
          profile_completed: boolean | null
          provider_agreement_accepted_at: string | null
          provider_agreement_version: string | null
          provider_status: string
          radius_km: number | null
          role_type: string | null
          schedule_json: Json | null
          specialties: string[] | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_status: string | null
          tools: string[] | null
          user_id: string
        }
        Insert: {
          address_text?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          experience_years?: number | null
          full_name?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          lat?: number | null
          license_file_url?: string | null
          license_id?: string | null
          lng?: number | null
          phone?: string | null
          profile_completed?: boolean | null
          provider_agreement_accepted_at?: string | null
          provider_agreement_version?: string | null
          provider_status?: string
          radius_km?: number | null
          role_type?: string | null
          schedule_json?: Json | null
          specialties?: string[] | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_status?: string | null
          tools?: string[] | null
          user_id: string
        }
        Update: {
          address_text?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          experience_years?: number | null
          full_name?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          lat?: number | null
          license_file_url?: string | null
          license_id?: string | null
          lng?: number | null
          phone?: string | null
          profile_completed?: boolean | null
          provider_agreement_accepted_at?: string | null
          provider_agreement_version?: string | null
          provider_status?: string
          radius_km?: number | null
          role_type?: string | null
          schedule_json?: Json | null
          specialties?: string[] | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_status?: string | null
          tools?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      provider_wallet_ledger: {
        Row: {
          amount: number
          booking_id: string | null
          cliq_reference: string | null
          created_at: string
          id: string
          provider_id: string
          reason: string
          settled_at: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          cliq_reference?: string | null
          created_at?: string
          id?: string
          provider_id: string
          reason: string
          settled_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          cliq_reference?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          reason?: string
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_wallet_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          base_price: number
          category: string
          city: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category?: string
          city?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          city?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_notifications: {
        Row: {
          body: string | null
          booking_id: string | null
          created_at: string
          id: string
          provider_id: string | null
          read: boolean
          target_role: string
          title: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          provider_id?: string | null
          read?: boolean
          target_role?: string
          title: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          provider_id?: string | null
          read?: boolean
          target_role?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      suspension_requests: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          reason: string
          requested_by_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          reason: string
          requested_by_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          reason?: string
          requested_by_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_escalating_price: {
        Args: { base_price: number; duration_minutes: number }
        Returns: number
      }
      find_nearest_providers: {
        Args: { _lat: number; _limit?: number; _lng: number }
        Returns: {
          available_now: boolean
          city: string
          distance_km: number
          experience_years: number
          full_name: string
          phone: string
          provider_id: string
          role_type: string
        }[]
      }
      get_provider_balance: { Args: { _provider_id: string }; Returns: number }
      get_provider_bookings: {
        Args: never
        Returns: {
          accepted_at: string
          actual_duration_minutes: number
          agreed_price: number
          assigned_at: string
          assigned_provider_id: string
          booking_number: string
          calculated_total: number
          check_in_at: string
          check_out_at: string
          city: string
          client_address_text: string
          client_lat: number
          client_lng: number
          created_at: string
          customer_display_name: string
          customer_phone: string
          id: string
          notes: string
          otp_code: string
          provider_payout: number
          scheduled_at: string
          service_id: string
          status: string
          subtotal: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_distance: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_cs: { Args: never; Returns: boolean }
      is_customer: { Args: never; Returns: boolean }
      is_provider: { Args: never; Returns: boolean }
      mfn_is_staff: { Args: never; Returns: boolean }
      provider_orders_safe: {
        Args: never
        Returns: {
          accepted_at: string
          agreed_price: number
          area_public: string
          assigned_at: string
          booking_number: string
          city: string
          customer_display_name: string
          id: string
          reveal_contact_allowed: boolean
          scheduled_at: string
          service_id: string
          status: string
        }[]
      }
      remove_user_role: {
        Args: {
          old_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "provider" | "customer" | "cs"
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
      app_role: ["admin", "provider", "customer", "cs"],
    },
  },
} as const
