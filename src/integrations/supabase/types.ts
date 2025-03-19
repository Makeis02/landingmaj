export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id?: string | null
          username?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          last_login: string | null
          password_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          password_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          password_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      announcement_banner_settings: {
        Row: {
          background_color: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          scroll_speed: number | null
          text_color: string | null
          title_spacing: number | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          scroll_speed?: number | null
          text_color?: string | null
          title_spacing?: number | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          scroll_speed?: number | null
          text_color?: string | null
          title_spacing?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      announcement_messages: {
        Row: {
          content: string
          content_key: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          content_key?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          content_key?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      authorized_admin_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: number
          image_url: string | null
          published_at: string | null
          shopify_id: string
          tag: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: number
          image_url?: string | null
          published_at?: string | null
          shopify_id: string
          tag?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: number
          image_url?: string | null
          published_at?: string | null
          shopify_id?: string
          tag?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_gift_rules: {
        Row: {
          active: boolean | null
          animation_id: string | null
          created_at: string
          description: string
          id: string
          shopify_product_id: string
          shopify_variant_id: string
          threshold: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          animation_id?: string | null
          created_at?: string
          description: string
          id?: string
          shopify_product_id: string
          shopify_variant_id: string
          threshold: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          animation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          shopify_product_id?: string
          shopify_variant_id?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_gift_rules_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "cart_threshold_animations"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_gift_settings: {
        Row: {
          active: boolean
          created_at: string
          id: string
          shopify_product_id: string
          shopify_variant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          shopify_product_id: string
          shopify_variant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          shopify_product_id?: string
          shopify_variant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cart_gift_settings_product"
            columns: ["shopify_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          is_gift: boolean
          product_id: string
          quantity: number
          threshold_gift: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_gift?: boolean
          product_id: string
          quantity?: number
          threshold_gift?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_gift?: boolean
          product_id?: string
          quantity?: number
          threshold_gift?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cart_items_products"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
        ]
      }
      cart_settings: {
        Row: {
          created_at: string
          id: string
          threshold_description: string
          threshold_type: Database["public"]["Enums"]["threshold_type"]
          threshold_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          threshold_description: string
          threshold_type: Database["public"]["Enums"]["threshold_type"]
          threshold_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          threshold_description?: string
          threshold_type?: Database["public"]["Enums"]["threshold_type"]
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      cart_threshold_animations: {
        Row: {
          animation_class: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          animation_class: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          animation_class?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_thresholds: {
        Row: {
          active: boolean | null
          animation_id: string | null
          created_at: string
          description: string
          display_order: number | null
          gift_rule_id: string | null
          id: string
          reward_type: string | null
          reward_value: number | null
          success_message: string | null
          threshold_message: string | null
          type: Database["public"]["Enums"]["threshold_type"]
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean | null
          animation_id?: string | null
          created_at?: string
          description: string
          display_order?: number | null
          gift_rule_id?: string | null
          id?: string
          reward_type?: string | null
          reward_value?: number | null
          success_message?: string | null
          threshold_message?: string | null
          type: Database["public"]["Enums"]["threshold_type"]
          updated_at?: string
          value: number
        }
        Update: {
          active?: boolean | null
          animation_id?: string | null
          created_at?: string
          description?: string
          display_order?: number | null
          gift_rule_id?: string | null
          id?: string
          reward_type?: string | null
          reward_value?: number | null
          success_message?: string | null
          threshold_message?: string | null
          type?: Database["public"]["Enums"]["threshold_type"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_thresholds_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "cart_threshold_animations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_thresholds_gift_rule_id_fkey"
            columns: ["gift_rule_id"]
            isOneToOne: true
            referencedRelation: "cart_gift_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_thresholds_gift_rule_id_fkey"
            columns: ["gift_rule_id"]
            isOneToOne: true
            referencedRelation: "gift_rules_with_products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          id: number
          product_name: string
          session_id: string
          status: string
          timestamp: string
        }
        Insert: {
          id?: number
          product_name: string
          session_id: string
          status?: string
          timestamp?: string
        }
        Update: {
          id?: number
          product_name?: string
          session_id?: string
          status?: string
          timestamp?: string
        }
        Relationships: []
      }
      commercial_partners: {
        Row: {
          created_at: string
          description: string
          display_order: number | null
          id: string
          logo_url: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number | null
          id?: string
          logo_url: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number | null
          id?: string
          logo_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_history: {
        Row: {
          content_id: string | null
          id: string
          modified_at: string
          modified_by: string | null
          previous_data: Json
        }
        Insert: {
          content_id?: string | null
          id?: string
          modified_at?: string
          modified_by?: string | null
          previous_data: Json
        }
        Update: {
          content_id?: string | null
          id?: string
          modified_at?: string
          modified_by?: string | null
          previous_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "dynamic_content"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          g: number
          id: number
          s: number
        }
        Insert: {
          created_at?: string
          g?: number
          id?: number
          s?: number
        }
        Update: {
          created_at?: string
          g?: number
          id?: number
          s?: number
        }
        Relationships: []
      }
      dynamic_content: {
        Row: {
          additional_data: Json | null
          component: string | null
          content_key: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_editable: boolean | null
          last_edited_by: string | null
          page: string | null
          parent_id: string | null
          section_type: string
          title: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          additional_data?: Json | null
          component?: string | null
          content_key: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_editable?: boolean | null
          last_edited_by?: string | null
          page?: string | null
          parent_id?: string | null
          section_type: string
          title?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          additional_data?: Json | null
          component?: string | null
          content_key?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_editable?: boolean | null
          last_edited_by?: string | null
          page?: string | null
          parent_id?: string | null
          section_type?: string
          title?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_content_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dynamic_content"
            referencedColumns: ["id"]
          },
        ]
      }
      edit_history: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          editor_id: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          editor_id?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          editor_id?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: []
      }
      editable_content: {
        Row: {
          content: string
          content_key: string
          created_at: string
          id: string
          last_edited_by: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_key: string
          created_at?: string
          id?: string
          last_edited_by?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_key?: string
          created_at?: string
          id?: string
          last_edited_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      editable_images: {
        Row: {
          created_at: string
          id: string
          image_key: string
          image_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_key: string
          image_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_key?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          label: string
          section: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          label: string
          section: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          label?: string
          section?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      footer_settings: {
        Row: {
          copyright_text: string | null
          created_at: string | null
          footer_logo_url: string | null
          gdpr_text: string | null
          id: string
          is_gdpr_enabled: boolean | null
          trustpilot_logo_url: string | null
          updated_at: string | null
        }
        Insert: {
          copyright_text?: string | null
          created_at?: string | null
          footer_logo_url?: string | null
          gdpr_text?: string | null
          id?: string
          is_gdpr_enabled?: boolean | null
          trustpilot_logo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          copyright_text?: string | null
          created_at?: string | null
          footer_logo_url?: string | null
          gdpr_text?: string | null
          id?: string
          is_gdpr_enabled?: boolean | null
          trustpilot_logo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hero: {
        Row: {
          hero_button_1_url: string
          hero_image: string
          hero_subtitle: string
          hero_title: string
          id: number
        }
        Insert: {
          hero_button_1_url: string
          hero_image: string
          hero_subtitle: string
          hero_title: string
          id?: number
        }
        Update: {
          hero_button_1_url?: string
          hero_image?: string
          hero_subtitle?: string
          hero_title?: string
          id?: number
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          error_message: string | null
          id: string
          shopify_customer_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          shopify_customer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          shopify_customer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          carton: number
          created_at: string
          id: number
          tobacco: number
        }
        Insert: {
          carton?: number
          created_at?: string
          id?: never
          tobacco?: number
        }
        Update: {
          carton?: number
          created_at?: string
          id?: never
          tobacco?: number
        }
        Relationships: []
      }
      product_suggestions: {
        Row: {
          created_at: string
          id: string
          priority: number | null
          source_product_id: string
          suggested_product_id: string
          suggestion_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number | null
          source_product_id: string
          suggested_product_id: string
          suggestion_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number | null
          source_product_id?: string
          suggested_product_id?: string
          suggestion_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_source_product"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
          {
            foreignKeyName: "fk_suggested_product"
            columns: ["suggested_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
          {
            foreignKeyName: "product_suggestions_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
          {
            foreignKeyName: "product_suggestions_suggested_product_id_fkey"
            columns: ["suggested_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
        ]
      }
      products: {
        Row: {
          compare_at_price: number | null
          created_at: string
          description: string | null
          handle: string
          hidden: boolean | null
          id: number
          image_url: string | null
          is_bestseller: boolean | null
          manually_featured: boolean | null
          monthly_orders: number | null
          price: number | null
          product_type: string | null
          shopify_id: string
          tags: string[] | null
          title: string
          updated_at: string
          variants: Json | null
          vendor: string | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          handle: string
          hidden?: boolean | null
          id?: number
          image_url?: string | null
          is_bestseller?: boolean | null
          manually_featured?: boolean | null
          monthly_orders?: number | null
          price?: number | null
          product_type?: string | null
          shopify_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          variants?: Json | null
          vendor?: string | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          handle?: string
          hidden?: boolean | null
          id?: number
          image_url?: string | null
          is_bestseller?: boolean | null
          manually_featured?: boolean | null
          monthly_orders?: number | null
          price?: number | null
          product_type?: string | null
          shopify_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          variants?: Json | null
          vendor?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          customer_name: string
          id: string
          image_url: string | null
          rating: number
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          comment: string
          created_at?: string
          customer_name: string
          id?: string
          image_url?: string | null
          rating: number
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          comment?: string
          created_at?: string
          customer_name?: string
          id?: string
          image_url?: string | null
          rating?: number
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      site_content_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          key_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          key_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          key_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suggestion_group_products: {
        Row: {
          active: boolean | null
          created_at: string
          group_id: string | null
          id: string
          is_main_product: boolean | null
          priority: number | null
          product_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_main_product?: boolean | null
          priority?: number | null
          product_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_main_product?: boolean | null
          priority?: number | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_group_products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_suggestions_view"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "suggestion_group_products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "suggestion_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_group_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
        ]
      }
      suggestion_groups: {
        Row: {
          active: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suggestion_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          main_product_id: string | null
          metadata: Json | null
          success: boolean | null
          suggested_products: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          main_product_id?: string | null
          metadata?: Json | null
          success?: boolean | null
          suggested_products?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          main_product_id?: string | null
          metadata?: Json | null
          success?: boolean | null
          suggested_products?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      suggestion_settings: {
        Row: {
          created_at: string
          display_mode: string | null
          id: string
          is_enabled: boolean | null
          max_suggestions: number | null
          suggestion_source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_mode?: string | null
          id?: string
          is_enabled?: boolean | null
          max_suggestions?: number | null
          suggestion_source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_mode?: string | null
          id?: string
          is_enabled?: boolean | null
          max_suggestions?: number | null
          suggestion_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tracking_data: {
        Row: {
          event_type: string
          id: number
          order_id: string | null
          page_url: string
          product_name: string | null
          timestamp: string | null
          total_price: number | null
          user_id: string
        }
        Insert: {
          event_type: string
          id?: number
          order_id?: string | null
          page_url: string
          product_name?: string | null
          timestamp?: string | null
          total_price?: number | null
          user_id: string
        }
        Update: {
          event_type?: string
          id?: number
          order_id?: string | null
          page_url?: string
          product_name?: string | null
          timestamp?: string | null
          total_price?: number | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          date: string
          from_person: string
          id: number
          quantity: number | null
          type: string
        }
        Insert: {
          amount: number
          date?: string
          from_person: string
          id?: never
          quantity?: number | null
          type: string
        }
        Update: {
          amount?: number
          date?: string
          from_person?: string
          id?: never
          quantity?: number | null
          type?: string
        }
        Relationships: []
      }
      uploaded_images: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      gift_rules_with_products: {
        Row: {
          active: boolean | null
          animation_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          product_image_url: string | null
          product_price: number | null
          product_title: string | null
          shopify_product_id: string | null
          shopify_variant_id: string | null
          threshold: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_gift_rules_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "cart_threshold_animations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suggestions_view: {
        Row: {
          group_active: boolean | null
          group_id: string | null
          group_name: string | null
          main_product_id: string | null
          main_product_image: string | null
          main_product_price: number | null
          main_product_title: string | null
          priority: number | null
          suggested_product_id: string | null
          suggested_product_image: string | null
          suggested_product_price: number | null
          suggested_product_title: string | null
          suggestion_active: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_group_products_product_id_fkey"
            columns: ["main_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
          {
            foreignKeyName: "suggestion_group_products_product_id_fkey"
            columns: ["suggested_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["shopify_id"]
          },
        ]
      }
    }
    Functions: {
      log_suggestion_event: {
        Args: {
          p_event_type: string
          p_main_product_id: string
          p_suggested_products: Json
          p_success?: boolean
          p_error_message?: string
          p_metadata?: Json
        }
        Returns: string
      }
      schedule_sync: {
        Args: {
          job_name: string
          job_schedule: string
          job_command: string
        }
        Returns: string
      }
    }
    Enums: {
      admin_role: "super_admin" | "content_editor" | "promotion_manager"
      suggestion_status: "active" | "inactive"
      threshold_type: "free_shipping" | "discount"
      user_role: "admin" | "editor" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
