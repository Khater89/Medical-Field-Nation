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
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          created_by_email: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_endpoint: string | null
          last_used_at: string | null
          revoked_at: string | null
          scopes: string[]
          status: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_email?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label?: string
          last_endpoint?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          status?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_email?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_endpoint?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          status?: string
          usage_count?: number
        }
        Relationships: []
      }
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
      booking_messages: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          id: string
          message_type: string
          quoted_price: number | null
          sender_display_name: string | null
          sender_id: string
          sender_role: string
          target_provider_id: string | null
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          id?: string
          message_type?: string
          quoted_price?: number | null
          sender_display_name?: string | null
          sender_id: string
          sender_role: string
          target_provider_id?: string | null
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          message_type?: string
          quoted_price?: number | null
          sender_display_name?: string | null
          sender_id?: string
          sender_role?: string
          target_provider_id?: string | null
        }
        Relationships: []
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
      booking_special_requests: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          provider_id: string | null
          request_text: string
          request_type: string
          responded_at: string | null
          seen_at: string | null
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          provider_id?: string | null
          request_text: string
          request_type: string
          responded_at?: string | null
          seen_at?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string | null
          request_text?: string
          request_type?: string
          responded_at?: string | null
          seen_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_special_requests_booking_id_fkey"
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
          ai_service_match: string | null
          ai_summary: string | null
          ai_tools_list: string[] | null
          area_public: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_provider_id: string | null
          booking_number: string | null
          calculated_total: number | null
          chat_locked: boolean
          chat_locked_at: string | null
          check_in_at: string | null
          check_out_at: string | null
          city: string
          client_disclaimer_accepted_at: string | null
          client_lat: number | null
          client_lng: number | null
          close_out_at: string | null
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
          final_offer_id: string | null
          final_price: number | null
          gender_released: boolean
          gender_released_at: string | null
          gender_released_by: string | null
          id: string
          is_emergency: boolean
          last_provider_reminder_at: string | null
          notes: string | null
          payment_method: string
          payment_status: string
          platform_fee: number
          price_locked: boolean
          price_locked_at: string | null
          price_locked_by: string | null
          provider_payout: number
          provider_share: number | null
          reject_reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          remaining_cash_amount: number | null
          required_gender: string | null
          reserved_at: string | null
          reserved_provider_id: string | null
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
          ai_service_match?: string | null
          ai_summary?: string | null
          ai_tools_list?: string[] | null
          area_public?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_provider_id?: string | null
          booking_number?: string | null
          calculated_total?: number | null
          chat_locked?: boolean
          chat_locked_at?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          city: string
          client_disclaimer_accepted_at?: string | null
          client_lat?: number | null
          client_lng?: number | null
          close_out_at?: string | null
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
          final_offer_id?: string | null
          final_price?: number | null
          gender_released?: boolean
          gender_released_at?: string | null
          gender_released_by?: string | null
          id?: string
          is_emergency?: boolean
          last_provider_reminder_at?: string | null
          notes?: string | null
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          price_locked?: boolean
          price_locked_at?: string | null
          price_locked_by?: string | null
          provider_payout?: number
          provider_share?: number | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          remaining_cash_amount?: number | null
          required_gender?: string | null
          reserved_at?: string | null
          reserved_provider_id?: string | null
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
          ai_service_match?: string | null
          ai_summary?: string | null
          ai_tools_list?: string[] | null
          area_public?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_provider_id?: string | null
          booking_number?: string | null
          calculated_total?: number | null
          chat_locked?: boolean
          chat_locked_at?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          city?: string
          client_disclaimer_accepted_at?: string | null
          client_lat?: number | null
          client_lng?: number | null
          close_out_at?: string | null
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
          final_offer_id?: string | null
          final_price?: number | null
          gender_released?: boolean
          gender_released_at?: string | null
          gender_released_by?: string | null
          id?: string
          is_emergency?: boolean
          last_provider_reminder_at?: string | null
          notes?: string | null
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          price_locked?: boolean
          price_locked_at?: string | null
          price_locked_by?: string | null
          provider_payout?: number
          provider_share?: number | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          remaining_cash_amount?: number | null
          required_gender?: string | null
          reserved_at?: string | null
          reserved_provider_id?: string | null
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
      bookings_staff: {
        Row: {
          ai_safety_note: string | null
          booking_id: string
          close_out_note: string | null
          created_at: string
          internal_note: string | null
          otp_code: string | null
          updated_at: string
        }
        Insert: {
          ai_safety_note?: string | null
          booking_id: string
          close_out_note?: string | null
          created_at?: string
          internal_note?: string | null
          otp_code?: string | null
          updated_at?: string
        }
        Update: {
          ai_safety_note?: string | null
          booking_id?: string
          close_out_note?: string | null
          created_at?: string
          internal_note?: string | null
          otp_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_staff_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      marketplace_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
          vendor_type:
            | Database["public"]["Enums"]["marketplace_vendor_type"]
            | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          vendor_type?:
            | Database["public"]["Enums"]["marketplace_vendor_type"]
            | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          vendor_type?:
            | Database["public"]["Enums"]["marketplace_vendor_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_chats: {
        Row: {
          created_at: string
          customer_consent_at: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_phone_norm: string | null
          customer_user_id: string | null
          guest_token: string | null
          id: string
          last_message_at: string
          last_message_preview: string | null
          product_id: string | null
          unread_for_customer: number
          unread_for_vendor: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_consent_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_norm?: string | null
          customer_user_id?: string | null
          guest_token?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          product_id?: string | null
          unread_for_customer?: number
          unread_for_vendor?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_consent_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_norm?: string | null
          customer_user_id?: string | null
          guest_token?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          product_id?: string | null
          unread_for_customer?: number
          unread_for_vendor?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_chats_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_chats_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_chats_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_guest_otps: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone_norm: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone_norm: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_norm?: string
          used_at?: string | null
        }
        Relationships: []
      }
      marketplace_guest_sessions: {
        Row: {
          created_at: string
          customer_name: string | null
          expires_at: string
          id: string
          last_used_at: string
          phone_norm: string
          token: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          expires_at: string
          id?: string
          last_used_at?: string
          phone_norm: string
          token: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string
          phone_norm?: string
          token?: string
        }
        Relationships: []
      }
      marketplace_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          body: string
          chat_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_name: string | null
          sender_role: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          chat_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_role: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "marketplace_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_acknowledged_at: string | null
          customer_acknowledgement_text: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_phone_norm: string | null
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_method: Database["public"]["Enums"]["marketplace_delivery_method"]
          discount: number
          guest_token: string | null
          id: string
          internal_note: string | null
          notes: string | null
          order_number: string | null
          payment_method: Database["public"]["Enums"]["marketplace_payment_method"]
          payment_status: Database["public"]["Enums"]["marketplace_payment_status"]
          platform_fee_amount: number
          platform_fee_percent: number
          status: Database["public"]["Enums"]["marketplace_order_status"]
          subtotal: number
          total: number
          updated_at: string
          vendor_acknowledged_at: string | null
          vendor_acknowledged_by: string | null
          vendor_acknowledgement_text: string | null
          vendor_id: string
          vendor_payout: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_acknowledged_at?: string | null
          customer_acknowledgement_text?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_norm?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method: Database["public"]["Enums"]["marketplace_delivery_method"]
          discount?: number
          guest_token?: string | null
          id?: string
          internal_note?: string | null
          notes?: string | null
          order_number?: string | null
          payment_method: Database["public"]["Enums"]["marketplace_payment_method"]
          payment_status?: Database["public"]["Enums"]["marketplace_payment_status"]
          platform_fee_amount?: number
          platform_fee_percent?: number
          status?: Database["public"]["Enums"]["marketplace_order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_acknowledged_at?: string | null
          vendor_acknowledged_by?: string | null
          vendor_acknowledgement_text?: string | null
          vendor_id: string
          vendor_payout?: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_acknowledged_at?: string | null
          customer_acknowledgement_text?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_norm?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: Database["public"]["Enums"]["marketplace_delivery_method"]
          discount?: number
          guest_token?: string | null
          id?: string
          internal_note?: string | null
          notes?: string | null
          order_number?: string | null
          payment_method?: Database["public"]["Enums"]["marketplace_payment_method"]
          payment_status?: Database["public"]["Enums"]["marketplace_payment_status"]
          platform_fee_amount?: number
          platform_fee_percent?: number
          status?: Database["public"]["Enums"]["marketplace_order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_acknowledged_at?: string | null
          vendor_acknowledged_by?: string | null
          vendor_acknowledgement_text?: string | null
          vendor_id?: string
          vendor_payout?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          approval_note: string | null
          approval_status: string
          brand: string | null
          category_id: string | null
          compare_at_price: number | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_sensitive: boolean
          name_ar: string
          name_en: string | null
          original_price: number | null
          price: number
          requires_prescription: boolean
          sales_count: number
          sku: string | null
          stock_quantity: number
          tags: string[] | null
          unit: string | null
          unlimited_stock: boolean
          updated_at: string
          vendor_id: string
          views_count: number
        }
        Insert: {
          approval_note?: string | null
          approval_status?: string
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_sensitive?: boolean
          name_ar: string
          name_en?: string | null
          original_price?: number | null
          price: number
          requires_prescription?: boolean
          sales_count?: number
          sku?: string | null
          stock_quantity?: number
          tags?: string[] | null
          unit?: string | null
          unlimited_stock?: boolean
          updated_at?: string
          vendor_id: string
          views_count?: number
        }
        Update: {
          approval_note?: string | null
          approval_status?: string
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_sensitive?: boolean
          name_ar?: string
          name_en?: string | null
          original_price?: number | null
          price?: number
          requires_prescription?: boolean
          sales_count?: number
          sku?: string | null
          stock_quantity?: number
          tags?: string[] | null
          unit?: string | null
          unlimited_stock?: boolean
          updated_at?: string
          vendor_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_settlement_requests: {
        Row: {
          amount: number
          created_at: string
          finance_note: string | null
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          finance_note?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          finance_note?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_settlement_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_settlement_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_vendor_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          order_id: string | null
          reason: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          reason: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          reason?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_vendor_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_vendor_ledger_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_vendor_ledger_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_vendors: {
        Row: {
          accepts_cash: boolean
          accepts_online_payment: boolean
          address_text: string | null
          approved_at: string | null
          approved_by: string | null
          area_text: string | null
          banner_url: string | null
          city: string | null
          commercial_registration: string | null
          created_at: string
          delivery_offered: boolean
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          is_open: boolean
          lat: number | null
          license_file_url: string | null
          license_number: string | null
          lng: number | null
          logo_url: string | null
          owner_user_id: string
          phone: string | null
          pickup_offered: boolean
          rating: number | null
          rejected_reason: string | null
          slug: string | null
          status: Database["public"]["Enums"]["marketplace_vendor_status"]
          store_name: string
          store_name_en: string | null
          total_orders: number
          updated_at: string
          vendor_number: number | null
          vendor_type: Database["public"]["Enums"]["marketplace_vendor_type"]
          whatsapp: string | null
          working_hours: Json | null
        }
        Insert: {
          accepts_cash?: boolean
          accepts_online_payment?: boolean
          address_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area_text?: string | null
          banner_url?: string | null
          city?: string | null
          commercial_registration?: string | null
          created_at?: string
          delivery_offered?: boolean
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          lat?: number | null
          license_file_url?: string | null
          license_number?: string | null
          lng?: number | null
          logo_url?: string | null
          owner_user_id: string
          phone?: string | null
          pickup_offered?: boolean
          rating?: number | null
          rejected_reason?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["marketplace_vendor_status"]
          store_name: string
          store_name_en?: string | null
          total_orders?: number
          updated_at?: string
          vendor_number?: number | null
          vendor_type: Database["public"]["Enums"]["marketplace_vendor_type"]
          whatsapp?: string | null
          working_hours?: Json | null
        }
        Update: {
          accepts_cash?: boolean
          accepts_online_payment?: boolean
          address_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area_text?: string | null
          banner_url?: string | null
          city?: string | null
          commercial_registration?: string | null
          created_at?: string
          delivery_offered?: boolean
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          lat?: number | null
          license_file_url?: string | null
          license_number?: string | null
          lng?: number | null
          logo_url?: string | null
          owner_user_id?: string
          phone?: string | null
          pickup_offered?: boolean
          rating?: number | null
          rejected_reason?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["marketplace_vendor_status"]
          store_name?: string
          store_name_en?: string | null
          total_orders?: number
          updated_at?: string
          vendor_number?: number | null
          vendor_type?: Database["public"]["Enums"]["marketplace_vendor_type"]
          whatsapp?: string | null
          working_hours?: Json | null
        }
        Relationships: []
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
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          bank_account_holder: string | null
          bank_cliq_alias: string | null
          bank_iban: string | null
          bank_name: string | null
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
          bank_account_holder?: string | null
          bank_cliq_alias?: string | null
          bank_iban?: string | null
          bank_name?: string | null
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
          bank_account_holder?: string | null
          bank_cliq_alias?: string | null
          bank_iban?: string | null
          bank_name?: string | null
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
          academic_cert_url: string | null
          address_text: string | null
          available_now: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          experience_cert_url: string | null
          experience_years: number | null
          full_name: string | null
          gender: string | null
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
          provider_number: number | null
          provider_status: string
          provider_type: string
          radius_km: number | null
          role_type: string | null
          schedule_json: Json | null
          specialties: string[] | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_status: string | null
          tools: string[] | null
          user_id: string
          username: string | null
        }
        Insert: {
          academic_cert_url?: string | null
          address_text?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          experience_cert_url?: string | null
          experience_years?: number | null
          full_name?: string | null
          gender?: string | null
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
          provider_number?: number | null
          provider_status?: string
          provider_type?: string
          radius_km?: number | null
          role_type?: string | null
          schedule_json?: Json | null
          specialties?: string[] | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_status?: string | null
          tools?: string[] | null
          user_id: string
          username?: string | null
        }
        Update: {
          academic_cert_url?: string | null
          address_text?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          experience_cert_url?: string | null
          experience_years?: number | null
          full_name?: string | null
          gender?: string | null
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
          provider_number?: number | null
          provider_status?: string
          provider_type?: string
          radius_km?: number | null
          role_type?: string | null
          schedule_json?: Json | null
          specialties?: string[] | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_status?: string | null
          tools?: string[] | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      provider_notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          provider_id: string
          title: string
          type: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          provider_id: string
          title: string
          type: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          provider_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_quotes: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          note: string | null
          provider_id: string
          quoted_price: number
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          note?: string | null
          provider_id: string
          quoted_price: number
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          note?: string | null
          provider_id?: string
          quoted_price?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_quotes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_ratings: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          rated_by: string | null
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          rated_by?: string | null
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          rated_by?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_settlement_requests: {
        Row: {
          amount: number
          created_at: string
          finance_note: string | null
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          provider_id: string
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          finance_note?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          provider_id: string
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          finance_note?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          provider_id?: string
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
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
          pricing_type: string
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
          pricing_type?: string
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
          pricing_type?: string
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
      marketplace_vendors_public: {
        Row: {
          accepts_cash: boolean | null
          accepts_online_payment: boolean | null
          area_text: string | null
          banner_url: string | null
          city: string | null
          created_at: string | null
          delivery_offered: boolean | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_open: boolean | null
          logo_url: string | null
          phone: string | null
          pickup_offered: boolean | null
          rating: number | null
          slug: string | null
          status:
            | Database["public"]["Enums"]["marketplace_vendor_status"]
            | null
          store_name: string | null
          store_name_en: string | null
          total_orders: number | null
          vendor_type:
            | Database["public"]["Enums"]["marketplace_vendor_type"]
            | null
          whatsapp: string | null
          working_hours: Json | null
        }
        Insert: {
          accepts_cash?: boolean | null
          accepts_online_payment?: boolean | null
          area_text?: string | null
          banner_url?: string | null
          city?: string | null
          created_at?: string | null
          delivery_offered?: boolean | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          logo_url?: string | null
          phone?: string | null
          pickup_offered?: boolean | null
          rating?: number | null
          slug?: string | null
          status?:
            | Database["public"]["Enums"]["marketplace_vendor_status"]
            | null
          store_name?: string | null
          store_name_en?: string | null
          total_orders?: number | null
          vendor_type?:
            | Database["public"]["Enums"]["marketplace_vendor_type"]
            | null
          whatsapp?: string | null
          working_hours?: Json | null
        }
        Update: {
          accepts_cash?: boolean | null
          accepts_online_payment?: boolean | null
          area_text?: string | null
          banner_url?: string | null
          city?: string | null
          created_at?: string | null
          delivery_offered?: boolean | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          logo_url?: string | null
          phone?: string | null
          pickup_offered?: boolean | null
          rating?: number | null
          slug?: string | null
          status?:
            | Database["public"]["Enums"]["marketplace_vendor_status"]
            | null
          store_name?: string | null
          store_name_en?: string | null
          total_orders?: number | null
          vendor_type?:
            | Database["public"]["Enums"]["marketplace_vendor_type"]
            | null
          whatsapp?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_vendor: { Args: { _id: string }; Returns: Json }
      admin_get_booking_staff_fields: {
        Args: { p_booking_ids: string[] }
        Returns: {
          ai_safety_note: string
          booking_id: string
          close_out_note: string
          internal_note: string
          otp_code: string
        }[]
      }
      admin_mark_settlement_paid: {
        Args: {
          _finance_note?: string
          _id: string
          _payment_reference: string
        }
        Returns: Json
      }
      admin_reject_settlement: {
        Args: { _finance_note?: string; _id: string }
        Returns: Json
      }
      admin_reject_vendor: {
        Args: { _id: string; _reason: string }
        Returns: Json
      }
      admin_release_gender: { Args: { _booking_id: string }; Returns: Json }
      admin_set_booking_staff_fields: {
        Args: {
          p_ai_safety_note?: string
          p_booking_id: string
          p_internal_note?: string
          p_otp_code?: string
        }
        Returns: undefined
      }
      admin_set_product_approval: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: Json
      }
      admin_toggle_vendor_active: {
        Args: { _active: boolean; _id: string }
        Returns: Json
      }
      available_bookings_for_providers: {
        Args: never
        Returns: {
          area_public: string
          base_price: number
          booking_number: string
          city: string
          created_at: string
          distance_km: number
          id: string
          is_emergency: boolean
          notes: string
          payment_method: string
          quote_count: number
          scheduled_at: string
          service_id: string
          service_name: string
          viewer_count: number
        }[]
      }
      booking_interactions_summary: {
        Args: { _booking_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          last_message: string
          last_message_at: string
          message_count: number
          provider_id: string
          quote_at: string
          quote_note: string
          quote_price: number
          role_type: string
        }[]
      }
      booking_quotes_public: {
        Args: { _booking_id: string }
        Returns: {
          created_at: string
          id: string
          is_mine: boolean
          note: string
          provider_avatar: string
          provider_id: string
          provider_name: string
          provider_role: string
          quoted_price: number
        }[]
      }
      calc_escalating_price: {
        Args: { base_price: number; duration_minutes: number }
        Returns: number
      }
      can_provider_message_booking: {
        Args: { _booking_id: string; _provider_id: string }
        Returns: boolean
      }
      create_api_key: {
        Args: { _label?: string; _scopes?: string[] }
        Returns: {
          id: string
          key_prefix: string
          plain_key: string
        }[]
      }
      create_special_request: {
        Args: {
          _booking_id: string
          _request_text: string
          _request_type: string
          _target_provider_id?: string
        }
        Returns: Json
      }
      customer_accept_quote: { Args: { _quote_id: string }; Returns: Json }
      customer_assign_provider: {
        Args: { _booking_id: string; _provider_id: string }
        Returns: Json
      }
      customer_quotes_for_booking: {
        Args: { _booking_id: string }
        Returns: {
          created_at: string
          id: string
          note: string
          provider_completed_count: number
          provider_id: string
          provider_name: string
          provider_rating: number
          quoted_price: number
        }[]
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
      gender_matches: {
        Args: {
          _provider_gender: string
          _released: boolean
          _required: string
        }
        Returns: boolean
      }
      get_booking_contact_info: {
        Args: { _booking_id: string }
        Returns: {
          address: string
          avatar_url: string
          city: string
          full_name: string
          lat: number
          lng: number
          phone: string
          role: string
        }[]
      }
      get_marketplace_vendor_balance: {
        Args: { _vendor_id: string }
        Returns: number
      }
      get_platform_public_settings: {
        Args: never
        Returns: {
          bank_account_holder: string
          bank_cliq_alias: string
          bank_iban: string
          bank_name: string
          coordinator_phone: string
          coordinator_phone_2: string
          deposit_percent: number
          platform_fee_percent: number
          provider_debt_limit: number
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
          payment_method: string
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
      is_public_vendor: { Args: { _vendor_id: string }; Returns: boolean }
      is_vendor: { Args: never; Returns: boolean }
      list_booking_messages: {
        Args: { _booking_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          quoted_price: number
          sender_avatar: string
          sender_display_name: string
          sender_id: string
          sender_role: string
          target_provider_id: string
        }[]
      }
      mark_special_requests_seen: {
        Args: { _booking_id: string }
        Returns: Json
      }
      marketplace_mark_chat_seen: {
        Args: { _chat_id: string }
        Returns: undefined
      }
      marketplace_open_or_get_chat: {
        Args: { _product_id?: string; _vendor_id: string }
        Returns: string
      }
      marketplace_send_message:
        | { Args: { _body: string; _chat_id: string }; Returns: Json }
        | {
            Args: {
              _attachment_name?: string
              _attachment_type?: string
              _attachment_url?: string
              _body: string
              _chat_id: string
            }
            Returns: Json
          }
      marketplace_set_chat_identity: {
        Args: { _chat_id: string; _name: string; _phone: string }
        Returns: Json
      }
      marketplace_vendor_accept_order: {
        Args: { _acknowledgement_text: string; _order_id: string }
        Returns: Json
      }
      mfn_is_staff: { Args: never; Returns: boolean }
      mp_normalize_phone: { Args: { _p: string }; Returns: string }
      normalize_jo_phone: { Args: { _raw: string }; Returns: string }
      provider_confirm_agreement: {
        Args: { _booking_id: string }
        Returns: Json
      }
      provider_lock_price: { Args: { _booking_id: string }; Returns: Json }
      provider_messages_inbox: {
        Args: never
        Returns: {
          area_public: string
          assigned_provider_id: string
          booking_id: string
          booking_number: string
          city: string
          client_address_text: string
          customer_avatar: string
          customer_display_name: string
          customer_full_name: string
          incoming_count: number
          is_emergency: boolean
          is_private: boolean
          last_message_body: string
          last_message_created_at: string
          last_message_id: string
          last_sender_display_name: string
          last_sender_id: string
          last_sender_role: string
          scheduled_at: string
          service_id: string
          status: string
          total_count: number
        }[]
      }
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
      provider_request_settlement: { Args: never; Returns: Json }
      provider_reserve_booking: { Args: { _booking_id: string }; Returns: Json }
      provider_role_matches_category: {
        Args: { _category: string; _role_type: string }
        Returns: boolean
      }
      provider_self_assign: { Args: { _booking_id: string }; Returns: Json }
      provider_set_close_out_note: {
        Args: { p_booking_id: string; p_note: string }
        Returns: undefined
      }
      remove_user_role: {
        Args: {
          old_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      revoke_api_key: { Args: { _id: string }; Returns: undefined }
      send_booking_message:
        | {
            Args: {
              _body: string
              _booking_id: string
              _quoted_price?: number
              _sender_display_name?: string
              _sender_role: string
              _target_provider_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _body: string
              _booking_id: string
              _message_type?: string
              _quoted_price?: number
              _sender_display_name?: string
              _sender_role: string
              _target_provider_id?: string
            }
            Returns: Json
          }
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      user_has_vendor_relationship: {
        Args: { _vendor_id: string }
        Returns: boolean
      }
      user_owns_vendor: { Args: { _vendor_id: string }; Returns: boolean }
      username_available: { Args: { _u: string }; Returns: boolean }
      verify_api_key: {
        Args: { _endpoint?: string; _plain_key: string }
        Returns: {
          id: string
          label: string
          scopes: string[]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "provider" | "customer" | "cs" | "vendor"
      marketplace_delivery_method:
        | "VENDOR_DELIVERY"
        | "PICKUP"
        | "SHIPPING_COMPANY"
      marketplace_order_status:
        | "NEW"
        | "CONFIRMED"
        | "PREPARING"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
        | "REFUNDED"
      marketplace_payment_method: "CASH_ON_DELIVERY" | "ONLINE" | "CLIQ"
      marketplace_payment_status: "UNPAID" | "PAID" | "REFUNDED" | "FAILED"
      marketplace_vendor_status:
        | "pending"
        | "approved"
        | "suspended"
        | "rejected"
      marketplace_vendor_type:
        | "pharmacy"
        | "medical_devices"
        | "prosthetics"
        | "other"
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
      app_role: ["admin", "provider", "customer", "cs", "vendor"],
      marketplace_delivery_method: [
        "VENDOR_DELIVERY",
        "PICKUP",
        "SHIPPING_COMPANY",
      ],
      marketplace_order_status: [
        "NEW",
        "CONFIRMED",
        "PREPARING",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ],
      marketplace_payment_method: ["CASH_ON_DELIVERY", "ONLINE", "CLIQ"],
      marketplace_payment_status: ["UNPAID", "PAID", "REFUNDED", "FAILED"],
      marketplace_vendor_status: [
        "pending",
        "approved",
        "suspended",
        "rejected",
      ],
      marketplace_vendor_type: [
        "pharmacy",
        "medical_devices",
        "prosthetics",
        "other",
      ],
    },
  },
} as const
