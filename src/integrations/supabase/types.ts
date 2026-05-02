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
      batches: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          depot_id: string | null
          expires_at: string | null
          id: string
          location_id: string
          lot_number: string
          manufactured_at: string | null
          notes: string | null
          quantity: number
          supplier: string | null
          updated_at: string
          variant_id: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          depot_id?: string | null
          expires_at?: string | null
          id?: string
          location_id: string
          lot_number: string
          manufactured_at?: string | null
          notes?: string | null
          quantity?: number
          supplier?: string | null
          updated_at?: string
          variant_id: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          depot_id?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string
          lot_number?: string
          manufactured_at?: string | null
          notes?: string | null
          quantity?: number
          supplier?: string | null
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          agent_id: string | null
          attempted_at: string
          confirmation_call_id: string
          duration_seconds: number | null
          id: string
          notes: string | null
          result: Database["public"]["Enums"]["call_result"]
        }
        Insert: {
          agent_id?: string | null
          attempted_at?: string
          confirmation_call_id: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          result: Database["public"]["Enums"]["call_result"]
        }
        Update: {
          agent_id?: string | null
          attempted_at?: string
          confirmation_call_id?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          result?: Database["public"]["Enums"]["call_result"]
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_confirmation_call_id_fkey"
            columns: ["confirmation_call_id"]
            isOneToOne: false
            referencedRelation: "confirmation_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          description: string | null
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          meta_description: string | null
          meta_title: string | null
          name: string
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          locale: Database["public"]["Enums"]["locale_code"]
          meta_description?: string | null
          meta_title?: string | null
          name: string
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          meta_description?: string | null
          meta_title?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmation_calls: {
        Row: {
          agent_id: string | null
          attempts: number
          confirmed_at: string | null
          created_at: string
          id: string
          last_attempt_at: string | null
          order_id: string
          outcome_notes: string | null
          priority: number
          rejected_at: string | null
          rejection_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          attempts?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          order_id: string
          outcome_notes?: string | null
          priority?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          attempts?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          order_id?: string
          outcome_notes?: string | null
          priority?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_calls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          customer_id: string
          full_name: string | null
          id: string
          is_default_billing: boolean
          is_default_shipping: boolean
          label: string | null
          phone: string | null
          postal_code: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          customer_id: string
          full_name?: string | null
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          full_name?: string | null
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          acquisition_channel: Database["public"]["Enums"]["acquisition_channel"]
          blocked: boolean
          blocked_reason: string | null
          cancelled_orders: number
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          full_name: string
          id: string
          last_order_at: string | null
          notes: string | null
          phone: string | null
          preferred_locale: Database["public"]["Enums"]["locale_code"]
          reliability_score: number
          returned_orders: number
          segment: Database["public"]["Enums"]["customer_segment"]
          successful_orders: number
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          acquisition_channel?: Database["public"]["Enums"]["acquisition_channel"]
          blocked?: boolean
          blocked_reason?: string | null
          cancelled_orders?: number
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          full_name: string
          id?: string
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale_code"]
          reliability_score?: number
          returned_orders?: number
          segment?: Database["public"]["Enums"]["customer_segment"]
          successful_orders?: number
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          acquisition_channel?: Database["public"]["Enums"]["acquisition_channel"]
          blocked?: boolean
          blocked_reason?: string | null
          cancelled_orders?: number
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          full_name?: string
          id?: string
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale_code"]
          reliability_score?: number
          returned_orders?: number
          segment?: Database["public"]["Enums"]["customer_segment"]
          successful_orders?: number
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      depots: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          linked_location_id: string | null
          name: string
          notes: string | null
          phone: string | null
          region: string | null
          status: Database["public"]["Enums"]["depot_status"]
          type: Database["public"]["Enums"]["depot_type"]
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_location_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["depot_status"]
          type?: Database["public"]["Enums"]["depot_type"]
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_location_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["depot_status"]
          type?: Database["public"]["Enums"]["depot_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depots_linked_location_id_fkey"
            columns: ["linked_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          id: string
          location_id: string
          quantity: number
          reorder_point: number
          reorder_qty: number
          reserved: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          id?: string
          location_id: string
          quantity?: number
          reorder_point?: number
          reorder_qty?: number
          reserved?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          id?: string
          location_id?: string
          quantity?: number
          reorder_point?: number
          reorder_qty?: number
          reserved?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          location_id: string
          performed_by: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          source_depot_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          variant_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          location_id: string
          performed_by?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source_depot_id?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          variant_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          location_id?: string
          performed_by?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source_depot_id?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_source_depot_id_fkey"
            columns: ["source_depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string
          created_at: string
          id: string
          is_default: boolean
          manager_user_id: string | null
          name: string
          phone: string | null
          region: string | null
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code: string
          created_at?: string
          id?: string
          is_default?: boolean
          manager_user_id?: string | null
          name: string
          phone?: string | null
          region?: string | null
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          manager_user_id?: string | null
          name?: string
          phone?: string | null
          region?: string | null
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          bundle_id: string | null
          created_at: string
          discount_amount: number
          id: string
          line_total: number
          order_id: string
          product_name: string
          quantity: number
          sku: string
          source_location_id: string | null
          tax_amount: number
          tax_rate: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          line_total: number
          order_id: string
          product_name: string
          quantity: number
          sku: string
          source_location_id?: string | null
          tax_amount?: number
          tax_rate?: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          bundle_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          line_total?: number
          order_id?: string
          product_name?: string
          quantity?: number
          sku?: string
          source_location_id?: string | null
          tax_amount?: number
          tax_rate?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          order_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          ai_confidence_score: number | null
          ai_extracted_data: Json | null
          assigned_agent_id: string | null
          cancelled_at: string | null
          channel: Database["public"]["Enums"]["order_channel"]
          confirmed_at: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          customer_id: string | null
          delivered_at: string | null
          discount_total: number
          franchise_id: string | null
          grand_total: number
          id: string
          internal_notes: string | null
          needs_human_review: boolean
          notes: string | null
          order_number: string
          original_message_text: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          shipped_at: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_full_name: string | null
          shipping_phone: string | null
          shipping_postal_code: string | null
          shipping_region: string | null
          shipping_total: number
          source_location_id: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total: number
          updated_at: string
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_extracted_data?: Json | null
          assigned_agent_id?: string | null
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["order_channel"]
          confirmed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          delivered_at?: string | null
          discount_total?: number
          franchise_id?: string | null
          grand_total?: number
          id?: string
          internal_notes?: string | null
          needs_human_review?: boolean
          notes?: string | null
          order_number?: string
          original_message_text?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_full_name?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          shipping_total?: number
          source_location_id?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          updated_at?: string
        }
        Update: {
          ai_confidence_score?: number | null
          ai_extracted_data?: Json | null
          assigned_agent_id?: string | null
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["order_channel"]
          confirmed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          delivered_at?: string | null
          discount_total?: number
          franchise_id?: string | null
          grand_total?: number
          id?: string
          internal_notes?: string | null
          needs_human_review?: boolean
          notes?: string | null
          order_number?: string
          original_message_text?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_full_name?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          shipping_total?: number
          source_location_id?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          alt_text_ar: string | null
          alt_text_en: string | null
          alt_text_fr: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          alt_text_ar?: string | null
          alt_text_en?: string | null
          alt_text_fr?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          alt_text_ar?: string | null
          alt_text_en?: string | null
          alt_text_fr?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_origin_history: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          depot_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          received_at: string
          unit_cost: number | null
          variant_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          depot_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          received_at?: string
          unit_cost?: number | null
          variant_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          depot_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          received_at?: string
          unit_cost?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_origin_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_origin_history_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_origin_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_origin_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          id: string
          ingredients: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          long_description: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          product_id: string
          short_description: string | null
          usage_instructions: string | null
        }
        Insert: {
          id?: string
          ingredients?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          long_description?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          product_id: string
          short_description?: string | null
          usage_instructions?: string | null
        }
        Update: {
          id?: string
          ingredients?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          long_description?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          product_id?: string
          short_description?: string | null
          usage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          attributes: Json
          barcode: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          id: string
          image_url: string | null
          price: number | null
          product_id: string
          sku: string
          sort_order: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          active?: boolean
          attributes?: Json
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number | null
          product_id: string
          sku: string
          sort_order?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          active?: boolean
          attributes?: Json
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number | null
          product_id?: string
          sku?: string
          sort_order?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_rating: number | null
          base_price: number
          brand: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          has_variants: boolean
          id: string
          is_featured: boolean
          review_count: number
          sku: string
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          tax_rate: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          avg_rating?: number | null
          base_price?: number
          brand?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          has_variants?: boolean
          id?: string
          is_featured?: boolean
          review_count?: number
          sku: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          tax_rate?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          avg_rating?: number | null
          base_price?: number
          brand?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          has_variants?: boolean
          id?: string
          is_featured?: boolean
          review_count?: number
          sku?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          tax_rate?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          preferred_locale: Database["public"]["Enums"]["locale_code"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale_code"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale_code"]
          updated_at?: string
          user_id?: string
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
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      acquisition_channel:
        | "web"
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "shop"
        | "referral"
        | "wholesale"
        | "franchise"
        | "other"
      app_role:
        | "super_admin"
        | "commercial_admin"
        | "stock_manager"
        | "confirmation_agent"
        | "accountant"
        | "logistics"
        | "franchise_manager"
        | "customer"
      call_result:
        | "answered"
        | "no_answer"
        | "busy"
        | "voicemail"
        | "wrong_number"
        | "callback_requested"
        | "confirmed"
        | "rejected"
      call_status:
        | "pending"
        | "in_progress"
        | "confirmed"
        | "rejected"
        | "no_answer"
        | "postponed"
        | "wrong_number"
        | "duplicate"
      customer_segment:
        | "new"
        | "regular"
        | "vip"
        | "wholesale"
        | "at_risk"
        | "blocked"
      customer_type: "retail" | "wholesale" | "franchise"
      depot_status: "active" | "inactive" | "archived"
      depot_type:
        | "supplier"
        | "cooperative"
        | "producer"
        | "internal_warehouse"
        | "franchise"
        | "shop"
      locale_code: "fr" | "ar" | "en"
      location_type: "warehouse" | "shop" | "franchise" | "virtual"
      movement_type:
        | "in"
        | "out"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
        | "reservation"
        | "release"
        | "return"
      order_channel:
        | "web"
        | "whatsapp"
        | "instagram"
        | "phone"
        | "shop"
        | "wholesale"
        | "franchise"
        | "manual"
        | "walk_in"
        | "whatsapp_ai"
      order_status:
        | "draft"
        | "pending"
        | "awaiting_confirmation"
        | "confirmed"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
        | "refunded"
      payment_method: "cod" | "card" | "bank_transfer" | "cash" | "wallet"
      payment_status: "unpaid" | "partial" | "paid" | "refunded" | "cod_pending"
      product_status: "draft" | "active" | "archived" | "out_of_stock"
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
      acquisition_channel: [
        "web",
        "whatsapp",
        "instagram",
        "facebook",
        "shop",
        "referral",
        "wholesale",
        "franchise",
        "other",
      ],
      app_role: [
        "super_admin",
        "commercial_admin",
        "stock_manager",
        "confirmation_agent",
        "accountant",
        "logistics",
        "franchise_manager",
        "customer",
      ],
      call_result: [
        "answered",
        "no_answer",
        "busy",
        "voicemail",
        "wrong_number",
        "callback_requested",
        "confirmed",
        "rejected",
      ],
      call_status: [
        "pending",
        "in_progress",
        "confirmed",
        "rejected",
        "no_answer",
        "postponed",
        "wrong_number",
        "duplicate",
      ],
      customer_segment: [
        "new",
        "regular",
        "vip",
        "wholesale",
        "at_risk",
        "blocked",
      ],
      customer_type: ["retail", "wholesale", "franchise"],
      depot_status: ["active", "inactive", "archived"],
      depot_type: [
        "supplier",
        "cooperative",
        "producer",
        "internal_warehouse",
        "franchise",
        "shop",
      ],
      locale_code: ["fr", "ar", "en"],
      location_type: ["warehouse", "shop", "franchise", "virtual"],
      movement_type: [
        "in",
        "out",
        "transfer_in",
        "transfer_out",
        "adjustment",
        "reservation",
        "release",
        "return",
      ],
      order_channel: [
        "web",
        "whatsapp",
        "instagram",
        "phone",
        "shop",
        "wholesale",
        "franchise",
        "manual",
        "walk_in",
        "whatsapp_ai",
      ],
      order_status: [
        "draft",
        "pending",
        "awaiting_confirmation",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      payment_method: ["cod", "card", "bank_transfer", "cash", "wallet"],
      payment_status: ["unpaid", "partial", "paid", "refunded", "cod_pending"],
      product_status: ["draft", "active", "archived", "out_of_stock"],
    },
  },
} as const
