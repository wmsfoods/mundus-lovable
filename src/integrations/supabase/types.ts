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
      companies: {
        Row: {
          address: string
          business_types: string | null
          city: string | null
          company_number: number
          country: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_admin: boolean | null
          is_buyer: boolean | null
          is_supplier: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          phone: string
          protein_profiles: string[] | null
          rating: number | null
          state: string
          status: string | null
          tax_id: string
          updated_at: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          business_types?: string | null
          city?: string | null
          company_number?: number
          country: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_admin?: boolean | null
          is_buyer?: boolean | null
          is_supplier?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          phone: string
          protein_profiles?: string[] | null
          rating?: number | null
          state: string
          status?: string | null
          tax_id: string
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          business_types?: string | null
          city?: string | null
          company_number?: number
          country?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_admin?: boolean | null
          is_buyer?: boolean | null
          is_supplier?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string
          protein_profiles?: string[] | null
          rating?: number | null
          state?: string
          status?: string | null
          tax_id?: string
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      company_buyer_ratings: {
        Row: {
          buyer_id: string
          company_id: string
          created_at: string | null
          id: string
          rating: number
        }
        Insert: {
          buyer_id: string
          company_id: string
          created_at?: string | null
          id?: string
          rating: number
        }
        Update: {
          buyer_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_buyer_ratings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_buyer_ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          joined_at: string | null
          role_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      counter_proposals: {
        Row: {
          created_at: string | null
          cut_round_id: string
          explanation: string | null
          id: string
          is_final: boolean | null
          price: number
          rule: string | null
        }
        Insert: {
          created_at?: string | null
          cut_round_id: string
          explanation?: string | null
          id?: string
          is_final?: boolean | null
          price: number
          rule?: string | null
        }
        Update: {
          created_at?: string | null
          cut_round_id?: string
          explanation?: string | null
          id?: string
          is_final?: boolean | null
          price?: number
          rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counter_proposals_cut_round_id_fkey"
            columns: ["cut_round_id"]
            isOneToOne: true
            referencedRelation: "cut_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string | null
          english_name: string
          id: string
          portuguese_name: string
          spanish_name: string
        }
        Insert: {
          created_at?: string | null
          english_name: string
          id?: string
          portuguese_name: string
          spanish_name: string
        }
        Update: {
          created_at?: string | null
          english_name?: string
          id?: string
          portuguese_name?: string
          spanish_name?: string
        }
        Relationships: []
      }
      customer_product_documents: {
        Row: {
          customer_product_id: string
          document_id: string
        }
        Insert: {
          customer_product_id: string
          document_id: string
        }
        Update: {
          customer_product_id?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_documents_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_images: {
        Row: {
          customer_product_id: string
          image_id: string
        }
        Insert: {
          customer_product_id: string
          image_id: string
        }
        Update: {
          customer_product_id?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_images_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_images_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_products: {
        Row: {
          beef_marbling: number | null
          company_id: string
          created_at: string | null
          customer_code: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          standard_product_id: string
        }
        Insert: {
          beef_marbling?: number | null
          company_id: string
          created_at?: string | null
          customer_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          standard_product_id: string
        }
        Update: {
          beef_marbling?: number | null
          company_id?: string
          created_at?: string | null
          customer_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          standard_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_products_standard_product_id_fkey"
            columns: ["standard_product_id"]
            isOneToOne: false
            referencedRelation: "standard_products"
            referencedColumns: ["id"]
          },
        ]
      }
      cut_rounds: {
        Row: {
          created_at: string | null
          id: string
          offer_item_id: string
          price: number
          quantity: number
          round_proposal_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_item_id: string
          price: number
          quantity: number
          round_proposal_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_item_id?: string
          price?: number
          quantity?: number
          round_proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cut_rounds_offer_item_id_fkey"
            columns: ["offer_item_id"]
            isOneToOne: false
            referencedRelation: "offer_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cut_rounds_round_proposal_id_fkey"
            columns: ["round_proposal_id"]
            isOneToOne: false
            referencedRelation: "round_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
        }
        Relationships: []
      }
      freight_options: {
        Row: {
          cost: number
          created_at: string | null
          id: string
          insurance: number | null
          offer_id: string
          port_id: string
        }
        Insert: {
          cost: number
          created_at?: string | null
          id?: string
          insurance?: number | null
          offer_id: string
          port_id: string
        }
        Update: {
          cost?: number
          created_at?: string | null
          id?: string
          insurance?: number | null
          offer_id?: string
          port_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_options_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_options_port_id_fkey"
            columns: ["port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          bucket: string
          created_at: string | null
          file_name: string | null
          id: string
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          file_name?: string | null
          id?: string
        }
        Update: {
          bucket?: string
          created_at?: string | null
          file_name?: string | null
          id?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          country_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          country_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          country_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "markets_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          buyer_id: string
          created_at: string | null
          deleted_at: string | null
          fcl_count: number | null
          freight_cost: number | null
          id: string
          incoterm: string | null
          locked_until: string | null
          offer_id: string
          order_id: string | null
          port_id: string | null
          settled_price: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          deleted_at?: string | null
          fcl_count?: number | null
          freight_cost?: number | null
          id?: string
          incoterm?: string | null
          locked_until?: string | null
          offer_id: string
          order_id?: string | null
          port_id?: string | null
          settled_price?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          deleted_at?: string | null
          fcl_count?: number | null
          freight_cost?: number | null
          id?: string
          incoterm?: string | null
          locked_until?: string | null
          offer_id?: string
          order_id?: string | null
          port_id?: string | null
          settled_price?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_port_id_fkey"
            columns: ["port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          event: string
          id: string
          parameters: Json | null
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          event: string
          id?: string
          parameters?: Json | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          event?: string
          id?: string
          parameters?: Json | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_allowed_incoterms: {
        Row: {
          incoterm_type: string
          offer_id: string
        }
        Insert: {
          incoterm_type: string
          offer_id: string
        }
        Update: {
          incoterm_type?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_allowed_incoterms_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_items: {
        Row: {
          aging_method: string | null
          amount: number
          condition: string
          created_at: string | null
          customer_product_id: string
          id: string
          maximum_amount: number
          meat_specification: number | null
          minimum_amount: number
          minimum_price: number
          offer_id: string
          price: number
        }
        Insert: {
          aging_method?: string | null
          amount: number
          condition?: string
          created_at?: string | null
          customer_product_id: string
          id?: string
          maximum_amount: number
          meat_specification?: number | null
          minimum_amount: number
          minimum_price: number
          offer_id: string
          price: number
        }
        Update: {
          aging_method?: string | null
          amount?: number
          condition?: string
          created_at?: string | null
          customer_product_id?: string
          id?: string
          maximum_amount?: number
          meat_specification?: number | null
          minimum_amount?: number
          minimum_price?: number
          offer_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_items_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_markets: {
        Row: {
          market_id: string
          offer_id: string
        }
        Insert: {
          market_id: string
          offer_id: string
        }
        Update: {
          market_id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_markets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_markets_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_snapshots: {
        Row: {
          container_size: string
          created_at: string | null
          id: string
          is_halal: boolean | null
          is_kosher: boolean | null
          observation: string | null
          origin_city: string | null
          origin_country: string
          origin_port: string
          payment_terms: string
          shipment_month: number
          shipment_year: number
          status: string
          supplier_name: string
          supplier_rating: number | null
          total_fcl: number | null
        }
        Insert: {
          container_size: string
          created_at?: string | null
          id: string
          is_halal?: boolean | null
          is_kosher?: boolean | null
          observation?: string | null
          origin_city?: string | null
          origin_country: string
          origin_port: string
          payment_terms: string
          shipment_month: number
          shipment_year: number
          status: string
          supplier_name: string
          supplier_rating?: number | null
          total_fcl?: number | null
        }
        Update: {
          container_size?: string
          created_at?: string | null
          id?: string
          is_halal?: boolean | null
          is_kosher?: boolean | null
          observation?: string | null
          origin_city?: string | null
          origin_country?: string
          origin_port?: string
          payment_terms?: string
          shipment_month?: number
          shipment_year?: number
          status?: string
          supplier_name?: string
          supplier_rating?: number | null
          total_fcl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_snapshots_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          container_size: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_halal: boolean | null
          is_kosher: boolean | null
          observation: string | null
          offer_number: number
          origin_city: string | null
          origin_country: string
          origin_port: string
          payment_terms: string
          price: number | null
          shipment_month: number
          shipment_year: number
          status: string | null
          supplier_id: string
          supplier_name: string
          supplier_rating: number | null
          total_fcl: number | null
          updated_at: string | null
        }
        Insert: {
          container_size: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_halal?: boolean | null
          is_kosher?: boolean | null
          observation?: string | null
          offer_number?: number
          origin_city?: string | null
          origin_country: string
          origin_port: string
          payment_terms: string
          price?: number | null
          shipment_month: number
          shipment_year: number
          status?: string | null
          supplier_id: string
          supplier_name: string
          supplier_rating?: number | null
          total_fcl?: number | null
          updated_at?: string | null
        }
        Update: {
          container_size?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_halal?: boolean | null
          is_kosher?: boolean | null
          observation?: string | null
          offer_number?: number
          origin_city?: string | null
          origin_country?: string
          origin_port?: string
          payment_terms?: string
          price?: number | null
          shipment_month?: number
          shipment_year?: number
          status?: string | null
          supplier_id?: string
          supplier_name?: string
          supplier_rating?: number | null
          total_fcl?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_documents: {
        Row: {
          company_id: string
          created_at: string | null
          document_id: string
          id: string
          name: string
          order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          document_id: string
          id?: string
          name: string
          order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          document_id?: string
          id?: string
          name?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_documents: {
        Row: {
          document_id: string
          order_item_id: string
        }
        Insert: {
          document_id: string
          order_item_id: string
        }
        Update: {
          document_id?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_documents_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_images: {
        Row: {
          image_id: string
          order_item_id: string
        }
        Insert: {
          image_id: string
          order_item_id: string
        }
        Update: {
          image_id?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_images_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_images_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          beef_marbling: string | null
          condition: string
          created_at: string | null
          customer_code: string | null
          customer_product_description: string | null
          customer_product_id: string
          customer_product_name: string
          id: string
          order_id: string
          original_amount: number
          original_price: number
          product_category_code: string
          product_category_id: string
          settlement_amount: number
          settlement_price: number
          standard_product_description: string
          standard_product_id: string
          standard_product_name: string
        }
        Insert: {
          beef_marbling?: string | null
          condition?: string
          created_at?: string | null
          customer_code?: string | null
          customer_product_description?: string | null
          customer_product_id: string
          customer_product_name: string
          id?: string
          order_id: string
          original_amount: number
          original_price: number
          product_category_code: string
          product_category_id: string
          settlement_amount: number
          settlement_price: number
          standard_product_description: string
          standard_product_id: string
          standard_product_name: string
        }
        Update: {
          beef_marbling?: string | null
          condition?: string
          created_at?: string | null
          customer_code?: string | null
          customer_product_description?: string | null
          customer_product_id?: string
          customer_product_name?: string
          id?: string
          order_id?: string
          original_amount?: number
          original_price?: number
          product_category_code?: string
          product_category_id?: string
          settlement_amount?: number
          settlement_price?: number
          standard_product_description?: string
          standard_product_id?: string
          standard_product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_customer_product_id_fkey"
            columns: ["customer_product_id"]
            isOneToOne: false
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping_infos: {
        Row: {
          booking: string | null
          container: string | null
          eta: string | null
          etd: string | null
          id: string
          index: string
          order_id: string
          shipping_line: string | null
          updated_at: string | null
          vessel: string | null
        }
        Insert: {
          booking?: string | null
          container?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          index?: string
          order_id: string
          shipping_line?: string | null
          updated_at?: string | null
          vessel?: string | null
        }
        Update: {
          booking?: string | null
          container?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          index?: string
          order_id?: string
          shipping_line?: string | null
          updated_at?: string | null
          vessel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_infos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_rating: number | null
          created_at: string | null
          deleted_at: string | null
          destination_port_id: string | null
          fcl_count: number | null
          finished_at: string | null
          freight_cost: number | null
          id: string
          incoterm: string | null
          offer_id: string
          order_number: number
          placed_at: string | null
          reject_justification: string | null
          status: string | null
        }
        Insert: {
          buyer_id: string
          buyer_rating?: number | null
          created_at?: string | null
          deleted_at?: string | null
          destination_port_id?: string | null
          fcl_count?: number | null
          finished_at?: string | null
          freight_cost?: number | null
          id?: string
          incoterm?: string | null
          offer_id: string
          order_number?: number
          placed_at?: string | null
          reject_justification?: string | null
          status?: string | null
        }
        Update: {
          buyer_id?: string
          buyer_rating?: number | null
          created_at?: string | null
          deleted_at?: string | null
          destination_port_id?: string | null
          fcl_count?: number | null
          finished_at?: string | null
          freight_cost?: number | null
          id?: string
          incoterm?: string | null
          offer_id?: string
          order_number?: number
          placed_at?: string | null
          reject_justification?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      ports: {
        Row: {
          code: string
          country_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          country_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          country_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ports_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_es: string | null
          name_pt: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_es?: string | null
          name_pt?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_es?: string | null
          name_pt?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          granted: boolean | null
          id: string
          permission_id: string
          role_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          granted?: boolean | null
          id?: string
          permission_id: string
          role_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          granted?: boolean | null
          id?: string
          permission_id?: string
          role_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_system: boolean | null
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_system?: boolean | null
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      round_proposals: {
        Row: {
          created_at: string | null
          id: string
          negotiation_id: string
          round: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          negotiation_id: string
          round: string
        }
        Update: {
          created_at?: string | null
          id?: string
          negotiation_id?: string
          round?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_proposals_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_product_names: {
        Row: {
          created_at: string | null
          culture_code: string
          id: string
          name: string
          standard_product_id: string
        }
        Insert: {
          created_at?: string | null
          culture_code: string
          id?: string
          name: string
          standard_product_id: string
        }
        Update: {
          created_at?: string | null
          culture_code?: string
          id?: string
          name?: string
          standard_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_product_names_standard_product_id_fkey"
            columns: ["standard_product_id"]
            isOneToOne: false
            referencedRelation: "standard_products"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_products: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          image_id: string | null
          is_active: boolean | null
          product_category_id: string
          product_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          image_id?: string | null
          is_active?: boolean | null
          product_category_id: string
          product_number?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          image_id?: string | null
          is_active?: boolean | null
          product_category_id?: string
          product_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "standard_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_products_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_products_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_request_documents: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          name: string
          user_request_id: string
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name: string
          user_request_id: string
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name?: string
          user_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_request_documents_user_request_id_fkey"
            columns: ["user_request_id"]
            isOneToOne: false
            referencedRelation: "user_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_requests: {
        Row: {
          approval_user_id: string | null
          company_id: string
          created_at: string | null
          created_user_id: string | null
          email: string
          id: string
          name: string
          reject_reason: string | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          approval_user_id?: string | null
          company_id: string
          created_at?: string | null
          created_user_id?: string | null
          email: string
          id?: string
          name: string
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          approval_user_id?: string | null
          company_id?: string
          created_at?: string | null
          created_user_id?: string | null
          email?: string
          id?: string
          name?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_requests_approval_user_id_fkey"
            columns: ["approval_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_requests_created_user_id_fkey"
            columns: ["created_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active_company_id: string | null
          avatar_url: string | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          email: string
          id: string
          inviter_id: string | null
          last_invite_sent_at: string | null
          name: string
          preferred_language: string | null
          preferred_unit: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          active_company_id?: string | null
          avatar_url?: string | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          email: string
          id: string
          inviter_id?: string | null
          last_invite_sent_at?: string | null
          name: string
          preferred_language?: string | null
          preferred_unit?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          active_company_id?: string | null
          avatar_url?: string | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          inviter_id?: string | null
          last_invite_sent_at?: string | null
          name?: string
          preferred_language?: string | null
          preferred_unit?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
