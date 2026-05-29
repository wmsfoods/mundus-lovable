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
      apollo_cache: {
        Row: {
          apollo_id: string
          entity_type: string
          expires_at: string | null
          fetched_at: string | null
          id: string
          mobile_available: boolean | null
          payload: Json
          phone_available: boolean | null
        }
        Insert: {
          apollo_id: string
          entity_type: string
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          mobile_available?: boolean | null
          payload: Json
          phone_available?: boolean | null
        }
        Update: {
          apollo_id?: string
          entity_type?: string
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          mobile_available?: boolean | null
          payload?: Json
          phone_available?: boolean | null
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          body: string | null
          category: string
          company_id: string | null
          created_at: string
          icon: string
          id: string
          link_label: string | null
          link_url: string | null
          read: boolean
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          icon?: string
          id?: string
          link_label?: string | null
          link_url?: string | null
          read?: boolean
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          icon?: string
          id?: string
          link_label?: string | null
          link_url?: string | null
          read?: boolean
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_bids: {
        Row: {
          auction_id: string
          bid_locked_until: string | null
          bid_prices: Json
          bid_rank: number | null
          bidder_id: string | null
          commitment_acknowledged: boolean | null
          company_id: string | null
          cooldown_until: string | null
          created_at: string | null
          id: string
          is_winner: boolean | null
          notes: string | null
          payment_terms: string | null
          status: Database["public"]["Enums"]["auction_bid_status"] | null
          total_value_usd: number | null
          updated_at: string | null
          volume_containers: number | null
          withdrawal_at: string | null
        }
        Insert: {
          auction_id: string
          bid_locked_until?: string | null
          bid_prices: Json
          bid_rank?: number | null
          bidder_id?: string | null
          commitment_acknowledged?: boolean | null
          company_id?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          status?: Database["public"]["Enums"]["auction_bid_status"] | null
          total_value_usd?: number | null
          updated_at?: string | null
          volume_containers?: number | null
          withdrawal_at?: string | null
        }
        Update: {
          auction_id?: string
          bid_locked_until?: string | null
          bid_prices?: Json
          bid_rank?: number | null
          bidder_id?: string | null
          commitment_acknowledged?: boolean | null
          company_id?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          status?: Database["public"]["Enums"]["auction_bid_status"] | null
          total_value_usd?: number | null
          updated_at?: string | null
          volume_containers?: number | null
          withdrawal_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          auction_closes_at: string
          auction_opens_at: string
          available_containers: number | null
          awarded_bid_id: string | null
          commodity: string
          company_id: string | null
          container_count: number | null
          container_size: string | null
          created_at: string | null
          cuts: Json | null
          decision_deadline_hours: number | null
          destination_markets: Json | null
          id: string
          inco_adjustments: Json | null
          incoterms: string[] | null
          min_bid_per_kg: number | null
          notes: string | null
          opp_number: string
          origin_country_id: string | null
          origin_port_id: string | null
          payment_terms: string | null
          primary_incoterm: string | null
          reserve_price_per_kg: number | null
          shipment_period: string | null
          status: Database["public"]["Enums"]["auction_status"] | null
          supplier_id: string | null
          temperature: string | null
          title: string
          updated_at: string | null
          visibility: Database["public"]["Enums"]["auction_visibility"] | null
        }
        Insert: {
          auction_closes_at: string
          auction_opens_at: string
          available_containers?: number | null
          awarded_bid_id?: string | null
          commodity: string
          company_id?: string | null
          container_count?: number | null
          container_size?: string | null
          created_at?: string | null
          cuts?: Json | null
          decision_deadline_hours?: number | null
          destination_markets?: Json | null
          id?: string
          inco_adjustments?: Json | null
          incoterms?: string[] | null
          min_bid_per_kg?: number | null
          notes?: string | null
          opp_number: string
          origin_country_id?: string | null
          origin_port_id?: string | null
          payment_terms?: string | null
          primary_incoterm?: string | null
          reserve_price_per_kg?: number | null
          shipment_period?: string | null
          status?: Database["public"]["Enums"]["auction_status"] | null
          supplier_id?: string | null
          temperature?: string | null
          title: string
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["auction_visibility"] | null
        }
        Update: {
          auction_closes_at?: string
          auction_opens_at?: string
          available_containers?: number | null
          awarded_bid_id?: string | null
          commodity?: string
          company_id?: string | null
          container_count?: number | null
          container_size?: string | null
          created_at?: string | null
          cuts?: Json | null
          decision_deadline_hours?: number | null
          destination_markets?: Json | null
          id?: string
          inco_adjustments?: Json | null
          incoterms?: string[] | null
          min_bid_per_kg?: number | null
          notes?: string | null
          opp_number?: string
          origin_country_id?: string | null
          origin_port_id?: string | null
          payment_terms?: string | null
          primary_incoterm?: string | null
          reserve_price_per_kg?: number | null
          shipment_period?: string | null
          status?: Database["public"]["Enums"]["auction_status"] | null
          supplier_id?: string | null
          temperature?: string | null
          title?: string
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["auction_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_origin_country_id_fkey"
            columns: ["origin_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_role: string | null
          category: string
          company_id: string | null
          company_name: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          severity: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          category: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          category?: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_requests: {
        Row: {
          additional_info: string | null
          any_origin: boolean | null
          attachments: Json | null
          buyer_company_id: string
          buyer_user_id: string | null
          category: string | null
          container_count: number | null
          container_size: string | null
          created_at: string | null
          cut_region: string
          deleted_at: string | null
          destination_country: string
          destination_port: string | null
          id: string
          incoterm: string | null
          origin_countries: string[] | null
          product_name: string
          quantity_kg: number
          request_number: number
          shipment_date: string | null
          specification: string | null
          status: string | null
          target_price_usd: number | null
          target_supplier_id: string | null
          temperature: string | null
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          any_origin?: boolean | null
          attachments?: Json | null
          buyer_company_id: string
          buyer_user_id?: string | null
          category?: string | null
          container_count?: number | null
          container_size?: string | null
          created_at?: string | null
          cut_region?: string
          deleted_at?: string | null
          destination_country: string
          destination_port?: string | null
          id?: string
          incoterm?: string | null
          origin_countries?: string[] | null
          product_name: string
          quantity_kg: number
          request_number?: number
          shipment_date?: string | null
          specification?: string | null
          status?: string | null
          target_price_usd?: number | null
          target_supplier_id?: string | null
          temperature?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          any_origin?: boolean | null
          attachments?: Json | null
          buyer_company_id?: string
          buyer_user_id?: string | null
          category?: string | null
          container_count?: number | null
          container_size?: string | null
          created_at?: string | null
          cut_region?: string
          deleted_at?: string | null
          destination_country?: string
          destination_port?: string | null
          id?: string
          incoterm?: string | null
          origin_countries?: string[] | null
          product_name?: string
          quantity_kg?: number
          request_number?: number
          shipment_date?: string | null
          specification?: string | null
          status?: string | null
          target_price_usd?: number | null
          target_supplier_id?: string | null
          temperature?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requests_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requests_target_supplier_id_fkey"
            columns: ["target_supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          business_types: string | null
          buyer_protein_profile: string[] | null
          city: string | null
          company_number: number
          countries_of_operation: string[] | null
          country: string
          created_at: string | null
          deleted_at: string | null
          est_number: string | null
          id: string
          is_admin: boolean | null
          is_buyer: boolean | null
          is_supplier: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          mundus_managed_buyer: boolean
          mundus_managed_supplier: boolean
          name: string
          office_country: string | null
          office_name: string | null
          office_region: string | null
          office_type: string | null
          onboarded_at: string | null
          onboarded_by: string | null
          onboarded_from_prospect_id: string | null
          parent_company_id: string | null
          phone: string
          plant_numbers: string[] | null
          ports_of_shipment: string[] | null
          preferred_cuts: string[] | null
          preferred_incoterms: string[] | null
          preferred_payment_terms: string | null
          protein_profiles: string[] | null
          rating: number | null
          state: string
          status: string | null
          tax_id: string | null
          updated_at: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          business_types?: string | null
          buyer_protein_profile?: string[] | null
          city?: string | null
          company_number?: number
          countries_of_operation?: string[] | null
          country: string
          created_at?: string | null
          deleted_at?: string | null
          est_number?: string | null
          id?: string
          is_admin?: boolean | null
          is_buyer?: boolean | null
          is_supplier?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          mundus_managed_buyer?: boolean
          mundus_managed_supplier?: boolean
          name: string
          office_country?: string | null
          office_name?: string | null
          office_region?: string | null
          office_type?: string | null
          onboarded_at?: string | null
          onboarded_by?: string | null
          onboarded_from_prospect_id?: string | null
          parent_company_id?: string | null
          phone: string
          plant_numbers?: string[] | null
          ports_of_shipment?: string[] | null
          preferred_cuts?: string[] | null
          preferred_incoterms?: string[] | null
          preferred_payment_terms?: string | null
          protein_profiles?: string[] | null
          rating?: number | null
          state: string
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          business_types?: string | null
          buyer_protein_profile?: string[] | null
          city?: string | null
          company_number?: number
          countries_of_operation?: string[] | null
          country?: string
          created_at?: string | null
          deleted_at?: string | null
          est_number?: string | null
          id?: string
          is_admin?: boolean | null
          is_buyer?: boolean | null
          is_supplier?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          mundus_managed_buyer?: boolean
          mundus_managed_supplier?: boolean
          name?: string
          office_country?: string | null
          office_name?: string | null
          office_region?: string | null
          office_type?: string | null
          onboarded_at?: string | null
          onboarded_by?: string | null
          onboarded_from_prospect_id?: string | null
          parent_company_id?: string | null
          phone?: string
          plant_numbers?: string[] | null
          ports_of_shipment?: string[] | null
          preferred_cuts?: string[] | null
          preferred_incoterms?: string[] | null
          preferred_payment_terms?: string | null
          protein_profiles?: string[] | null
          rating?: number | null
          state?: string
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_about: {
        Row: {
          company_id: string
          countries_served: number | null
          created_at: string
          description: string | null
          fcls_delivered: number | null
          id: string
          logo_text: string | null
          main_species: string[] | null
          member_since: number | null
          trade_markets: string[] | null
          trade_name: string | null
          updated_at: string
          years_exporting: number | null
        }
        Insert: {
          company_id: string
          countries_served?: number | null
          created_at?: string
          description?: string | null
          fcls_delivered?: number | null
          id?: string
          logo_text?: string | null
          main_species?: string[] | null
          member_since?: number | null
          trade_markets?: string[] | null
          trade_name?: string | null
          updated_at?: string
          years_exporting?: number | null
        }
        Update: {
          company_id?: string
          countries_served?: number | null
          created_at?: string
          description?: string | null
          fcls_delivered?: number | null
          id?: string
          logo_text?: string | null
          main_species?: string[] | null
          member_since?: number | null
          trade_markets?: string[] | null
          trade_name?: string | null
          updated_at?: string
          years_exporting?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_about_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      company_certifications: {
        Row: {
          certificate_url: string | null
          company_id: string
          created_at: string
          id: string
          issuer: string | null
          name: string
          sort_order: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          certificate_url?: string | null
          company_id: string
          created_at?: string
          id?: string
          issuer?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          certificate_url?: string | null
          company_id?: string
          created_at?: string
          id?: string
          issuer?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          company_id: string
          created_at: string
          doc_type: string
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_type?: string
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_type?: string
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_locations: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          est_number: string | null
          id: string
          location_type: string
          name: string | null
          notes: string | null
          phone: string | null
          plant_numbers: string[]
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          est_number?: string | null
          id?: string
          location_type?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          plant_numbers?: string[]
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          est_number?: string | null
          id?: string
          location_type?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          plant_numbers?: string[]
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_plants: {
        Row: {
          capacity: string | null
          certifications: string[] | null
          city: string | null
          company_id: string
          country: string | null
          country_code: string | null
          created_at: string
          id: string
          name: string
          sort_order: number | null
          updated_at: string
          vet_registrations: string | null
        }
        Insert: {
          capacity?: string | null
          certifications?: string[] | null
          city?: string | null
          company_id: string
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
          vet_registrations?: string | null
        }
        Update: {
          capacity?: string | null
          certifications?: string[] | null
          city?: string | null
          company_id?: string
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
          vet_registrations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_plants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_preferences: {
        Row: {
          company_id: string
          created_at: string
          currencies: string[] | null
          default_incoterm: string | null
          default_payment_terms: string | null
          fcl_size: string | null
          id: string
          lead_time: string | null
          origin_ports: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currencies?: string[] | null
          default_incoterm?: string | null
          default_payment_terms?: string | null
          fcl_size?: string | null
          id?: string
          lead_time?: string | null
          origin_ports?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currencies?: string[] | null
          default_incoterm?: string | null
          default_payment_terms?: string | null
          fcl_size?: string | null
          id?: string
          lead_time?: string | null
          origin_ports?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_team_members: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          photo_url: string | null
          sort_order: number | null
          title: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          photo_url?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          photo_url?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          invited_at: string | null
          job_title: string | null
          joined_at: string | null
          last_login_at: string | null
          notes: string | null
          phone: string | null
          role: string | null
          role_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          job_title?: string | null
          joined_at?: string | null
          last_login_at?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          job_title?: string | null
          joined_at?: string | null
          last_login_at?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          created_at: string
          created_by_user_id: string | null
          cut_round_id: string
          explanation: string
          id: string
          is_final: boolean
          price_per_kg: number
          rule: string | null
          source: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          cut_round_id: string
          explanation: string
          id?: string
          is_final: boolean
          price_per_kg: number
          rule?: string | null
          source: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          cut_round_id?: string
          explanation?: string
          id?: string
          is_final?: boolean
          price_per_kg?: number
          rule?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "counter_proposals_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          chinese_name: string | null
          created_at: string | null
          english_name: string
          flag_emoji: string | null
          french_name: string | null
          id: string
          is_destination: boolean | null
          is_origin: boolean | null
          iso_code: string | null
          portuguese_name: string
          spanish_name: string
        }
        Insert: {
          chinese_name?: string | null
          created_at?: string | null
          english_name: string
          flag_emoji?: string | null
          french_name?: string | null
          id?: string
          is_destination?: boolean | null
          is_origin?: boolean | null
          iso_code?: string | null
          portuguese_name: string
          spanish_name: string
        }
        Update: {
          chinese_name?: string | null
          created_at?: string | null
          english_name?: string
          flag_emoji?: string | null
          french_name?: string | null
          id?: string
          is_destination?: boolean | null
          is_origin?: boolean | null
          iso_code?: string | null
          portuguese_name?: string
          spanish_name?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_type: string
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          status: string | null
          subject: string | null
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          annual_revenue: number | null
          apollo_company_id: string | null
          apollo_enriched_at: string | null
          city: string | null
          company_category: string | null
          company_size: string | null
          company_type: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          domain: string | null
          estimated_employees: number | null
          founded_year: number | null
          headcount_growth_12m: number | null
          headcount_growth_6m: number | null
          id: string
          industry: string | null
          is_active: boolean
          is_public: boolean | null
          keywords: string[] | null
          lead_type: string | null
          linkedin_url: string | null
          logo_url: string | null
          market_region: string | null
          market_segment: string | null
          merged_into_id: string | null
          mundus_company_id: string | null
          naics_codes: string[] | null
          name: string
          notes: string | null
          onboarded_at: string | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          product_categories: string[] | null
          short_description: string | null
          sic_codes: string[] | null
          source: string | null
          source_detail: string | null
          stage: string | null
          state: string | null
          status: string | null
          stock_exchange: string | null
          stock_symbol: string | null
          street: string | null
          tags: string[] | null
          tax_id: string | null
          technologies: Json | null
          trade_name: string | null
          updated_at: string | null
          website: string | null
          wms_company_name: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          annual_revenue?: number | null
          apollo_company_id?: string | null
          apollo_enriched_at?: string | null
          city?: string | null
          company_category?: string | null
          company_size?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          domain?: string | null
          estimated_employees?: number | null
          founded_year?: number | null
          headcount_growth_12m?: number | null
          headcount_growth_6m?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_public?: boolean | null
          keywords?: string[] | null
          lead_type?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          market_region?: string | null
          market_segment?: string | null
          merged_into_id?: string | null
          mundus_company_id?: string | null
          naics_codes?: string[] | null
          name: string
          notes?: string | null
          onboarded_at?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          product_categories?: string[] | null
          short_description?: string | null
          sic_codes?: string[] | null
          source?: string | null
          source_detail?: string | null
          stage?: string | null
          state?: string | null
          status?: string | null
          stock_exchange?: string | null
          stock_symbol?: string | null
          street?: string | null
          tags?: string[] | null
          tax_id?: string | null
          technologies?: Json | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
          wms_company_name?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          annual_revenue?: number | null
          apollo_company_id?: string | null
          apollo_enriched_at?: string | null
          city?: string | null
          company_category?: string | null
          company_size?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          domain?: string | null
          estimated_employees?: number | null
          founded_year?: number | null
          headcount_growth_12m?: number | null
          headcount_growth_6m?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_public?: boolean | null
          keywords?: string[] | null
          lead_type?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          market_region?: string | null
          market_segment?: string | null
          merged_into_id?: string | null
          mundus_company_id?: string | null
          naics_codes?: string[] | null
          name?: string
          notes?: string | null
          onboarded_at?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          product_categories?: string[] | null
          short_description?: string | null
          sic_codes?: string[] | null
          source?: string | null
          source_detail?: string | null
          stage?: string | null
          state?: string | null
          status?: string | null
          stock_exchange?: string | null
          stock_symbol?: string | null
          street?: string | null
          tags?: string[] | null
          tax_id?: string | null
          technologies?: Json | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
          wms_company_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_companies_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          apollo_company_id: string | null
          apollo_enriched_at: string | null
          apollo_match_reason: string | null
          apollo_match_score: number | null
          apollo_person_id: string | null
          apollo_person_payload: Json | null
          assigned_to: string | null
          buyer_type: string | null
          city: string | null
          company_id: string | null
          contact_type: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          decision_level: string | null
          department: string | null
          email: string | null
          email_bounce_count: number | null
          email_invalid: boolean | null
          email_invalid_reason: string | null
          email_opt_out: boolean | null
          email_opt_out_at: string | null
          email_opt_out_source: string | null
          email_source: string | null
          email_status: string | null
          email_verification_details: Json | null
          email_verification_score: number | null
          email_verified_at: string | null
          first_name: string | null
          full_name: string
          headline: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          is_registered: boolean | null
          job_title: string | null
          last_activity_at: string | null
          last_bounce_at: string | null
          last_clicked_at: string | null
          last_contacted_at: string | null
          last_emailed_at: string | null
          last_name: string | null
          last_opened_at: string | null
          last_replied_at: string | null
          lead_score: number | null
          lead_source: string | null
          lead_status: string | null
          linkedin: string | null
          location_display: string | null
          merged_into_id: string | null
          mobile: string | null
          mobile_confidence: string | null
          mobile_credits_used: number | null
          mobile_revealed_at: string | null
          mobile_source: string | null
          mobile_status: string | null
          mundus_company_id: string | null
          mundus_user_id: string | null
          notes: string | null
          office_id: string | null
          personal_linkedin: string | null
          phone: string | null
          phone_confidence: string | null
          phone_credits_used: number | null
          phone_revealed_at: string | null
          phone_source: string | null
          phone_status: string | null
          phone_type: string | null
          photo_url: string | null
          preferred_language: string | null
          products_of_interest: string[] | null
          qualified_as: string | null
          qualified_at: string | null
          receives_deal_offers: boolean | null
          role: string | null
          scoring_points: number | null
          secondary_email: string | null
          seniority: string | null
          source: string | null
          source_detail: string | null
          state: string | null
          status: string | null
          tags: string[] | null
          timezone: string | null
          total_emails_bounced: number | null
          total_emails_clicked: number | null
          total_emails_opened: number | null
          total_emails_replied: number | null
          total_emails_sent: number | null
          updated_at: string | null
          wechat: string | null
          whatsapp: string | null
          wms_contact_id: string | null
        }
        Insert: {
          apollo_company_id?: string | null
          apollo_enriched_at?: string | null
          apollo_match_reason?: string | null
          apollo_match_score?: number | null
          apollo_person_id?: string | null
          apollo_person_payload?: Json | null
          assigned_to?: string | null
          buyer_type?: string | null
          city?: string | null
          company_id?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          decision_level?: string | null
          department?: string | null
          email?: string | null
          email_bounce_count?: number | null
          email_invalid?: boolean | null
          email_invalid_reason?: string | null
          email_opt_out?: boolean | null
          email_opt_out_at?: string | null
          email_opt_out_source?: string | null
          email_source?: string | null
          email_status?: string | null
          email_verification_details?: Json | null
          email_verification_score?: number | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name: string
          headline?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          is_registered?: boolean | null
          job_title?: string | null
          last_activity_at?: string | null
          last_bounce_at?: string | null
          last_clicked_at?: string | null
          last_contacted_at?: string | null
          last_emailed_at?: string | null
          last_name?: string | null
          last_opened_at?: string | null
          last_replied_at?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_status?: string | null
          linkedin?: string | null
          location_display?: string | null
          merged_into_id?: string | null
          mobile?: string | null
          mobile_confidence?: string | null
          mobile_credits_used?: number | null
          mobile_revealed_at?: string | null
          mobile_source?: string | null
          mobile_status?: string | null
          mundus_company_id?: string | null
          mundus_user_id?: string | null
          notes?: string | null
          office_id?: string | null
          personal_linkedin?: string | null
          phone?: string | null
          phone_confidence?: string | null
          phone_credits_used?: number | null
          phone_revealed_at?: string | null
          phone_source?: string | null
          phone_status?: string | null
          phone_type?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          products_of_interest?: string[] | null
          qualified_as?: string | null
          qualified_at?: string | null
          receives_deal_offers?: boolean | null
          role?: string | null
          scoring_points?: number | null
          secondary_email?: string | null
          seniority?: string | null
          source?: string | null
          source_detail?: string | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          timezone?: string | null
          total_emails_bounced?: number | null
          total_emails_clicked?: number | null
          total_emails_opened?: number | null
          total_emails_replied?: number | null
          total_emails_sent?: number | null
          updated_at?: string | null
          wechat?: string | null
          whatsapp?: string | null
          wms_contact_id?: string | null
        }
        Update: {
          apollo_company_id?: string | null
          apollo_enriched_at?: string | null
          apollo_match_reason?: string | null
          apollo_match_score?: number | null
          apollo_person_id?: string | null
          apollo_person_payload?: Json | null
          assigned_to?: string | null
          buyer_type?: string | null
          city?: string | null
          company_id?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          decision_level?: string | null
          department?: string | null
          email?: string | null
          email_bounce_count?: number | null
          email_invalid?: boolean | null
          email_invalid_reason?: string | null
          email_opt_out?: boolean | null
          email_opt_out_at?: string | null
          email_opt_out_source?: string | null
          email_source?: string | null
          email_status?: string | null
          email_verification_details?: Json | null
          email_verification_score?: number | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          is_registered?: boolean | null
          job_title?: string | null
          last_activity_at?: string | null
          last_bounce_at?: string | null
          last_clicked_at?: string | null
          last_contacted_at?: string | null
          last_emailed_at?: string | null
          last_name?: string | null
          last_opened_at?: string | null
          last_replied_at?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_status?: string | null
          linkedin?: string | null
          location_display?: string | null
          merged_into_id?: string | null
          mobile?: string | null
          mobile_confidence?: string | null
          mobile_credits_used?: number | null
          mobile_revealed_at?: string | null
          mobile_source?: string | null
          mobile_status?: string | null
          mundus_company_id?: string | null
          mundus_user_id?: string | null
          notes?: string | null
          office_id?: string | null
          personal_linkedin?: string | null
          phone?: string | null
          phone_confidence?: string | null
          phone_credits_used?: number | null
          phone_revealed_at?: string | null
          phone_source?: string | null
          phone_status?: string | null
          phone_type?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          products_of_interest?: string[] | null
          qualified_as?: string | null
          qualified_at?: string | null
          receives_deal_offers?: boolean | null
          role?: string | null
          scoring_points?: number | null
          secondary_email?: string | null
          seniority?: string | null
          source?: string | null
          source_detail?: string | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          timezone?: string | null
          total_emails_bounced?: number | null
          total_emails_clicked?: number | null
          total_emails_opened?: number | null
          total_emails_replied?: number | null
          total_emails_sent?: number | null
          updated_at?: string | null
          wechat?: string | null
          whatsapp?: string | null
          wms_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_credit_usage: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          credit_type: string
          credits_used: number
          description: string | null
          enrichment_job_id: string | null
          id: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_type: string
          credits_used?: number
          description?: string | null
          enrichment_job_id?: string | null
          id?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_type?: string
          credits_used?: number
          description?: string | null
          enrichment_job_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_credit_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_credit_usage_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_credit_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_credit_usage_enrichment_job_id_fkey"
            columns: ["enrichment_job_id"]
            isOneToOne: false
            referencedRelation: "crm_enrichment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_enrichment_jobs: {
        Row: {
          company_ids: string[] | null
          completed_at: string | null
          contact_ids: string[] | null
          created_at: string | null
          created_by: string | null
          credits_used: number | null
          error_message: string | null
          id: string
          job_type: string
          record_count: number | null
          records_enriched: number | null
          records_failed: number | null
          result_data: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          company_ids?: string[] | null
          completed_at?: string | null
          contact_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          job_type: string
          record_count?: number | null
          records_enriched?: number | null
          records_failed?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          company_ids?: string[] | null
          completed_at?: string | null
          contact_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          job_type?: string
          record_count?: number | null
          records_enriched?: number | null
          records_failed?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_enrichment_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_import_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duplicates_found: number | null
          duplicates_merged: number | null
          duplicates_skipped: number | null
          error_log: Json | null
          errors: number | null
          file_name: string | null
          file_url: string | null
          id: string
          import_type: string
          imported: number | null
          invalid_email: number | null
          list_ids: string[] | null
          started_at: string | null
          status: string | null
          total_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicates_found?: number | null
          duplicates_merged?: number | null
          duplicates_skipped?: number | null
          error_log?: Json | null
          errors?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          import_type: string
          imported?: number | null
          invalid_email?: number | null
          list_ids?: string[] | null
          started_at?: string | null
          status?: string | null
          total_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicates_found?: number | null
          duplicates_merged?: number | null
          duplicates_skipped?: number | null
          error_log?: Json | null
          errors?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          import_type?: string
          imported?: number | null
          invalid_email?: number | null
          list_ids?: string[] | null
          started_at?: string | null
          status?: string | null
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_import_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interviews: {
        Row: {
          conducted_by: string | null
          created_at: string
          crm_company_id: string
          crm_contact_id: string | null
          duration_minutes: number | null
          id: string
          interview_date: string | null
          key_quotes: string | null
          next_steps: string | null
          pain_points: string | null
          recording_url: string | null
          takeaways: string | null
        }
        Insert: {
          conducted_by?: string | null
          created_at?: string
          crm_company_id: string
          crm_contact_id?: string | null
          duration_minutes?: number | null
          id?: string
          interview_date?: string | null
          key_quotes?: string | null
          next_steps?: string | null
          pain_points?: string | null
          recording_url?: string | null
          takeaways?: string | null
        }
        Update: {
          conducted_by?: string | null
          created_at?: string
          crm_company_id?: string
          crm_contact_id?: string | null
          duration_minutes?: number | null
          id?: string
          interview_date?: string | null
          key_quotes?: string | null
          next_steps?: string | null
          pain_points?: string | null
          recording_url?: string | null
          takeaways?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_interviews_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interviews_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_learnings: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          filled_at: string | null
          id: string
          insight: string
          next_action: string | null
          next_action_due: string | null
          source_company_ids: string[]
          stuck: string | null
          tags: string[] | null
          theme: string
          week_start: string
          worked: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          filled_at?: string | null
          id?: string
          insight: string
          next_action?: string | null
          next_action_due?: string | null
          source_company_ids?: string[]
          stuck?: string | null
          tags?: string[] | null
          theme: string
          week_start: string
          worked?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          filled_at?: string | null
          id?: string
          insight?: string
          next_action?: string | null
          next_action_due?: string | null
          source_company_ids?: string[]
          stuck?: string | null
          tags?: string[] | null
          theme?: string
          week_start?: string
          worked?: string | null
        }
        Relationships: []
      }
      crm_list_items: {
        Row: {
          added_at: string | null
          apollo_org_id: string | null
          auto_score: number | null
          city: string | null
          company_name: string
          country: string | null
          domain: string | null
          employees: number | null
          founded: string | null
          id: string
          industry: string | null
          linkedin: string | null
          list_id: string
          logo_url: string | null
          revenue: number | null
          website: string | null
        }
        Insert: {
          added_at?: string | null
          apollo_org_id?: string | null
          auto_score?: number | null
          city?: string | null
          company_name: string
          country?: string | null
          domain?: string | null
          employees?: number | null
          founded?: string | null
          id?: string
          industry?: string | null
          linkedin?: string | null
          list_id: string
          logo_url?: string | null
          revenue?: number | null
          website?: string | null
        }
        Update: {
          added_at?: string | null
          apollo_org_id?: string | null
          auto_score?: number | null
          city?: string | null
          company_name?: string
          country?: string | null
          domain?: string | null
          employees?: number | null
          founded?: string | null
          id?: string
          industry?: string | null
          linkedin?: string | null
          list_id?: string
          logo_url?: string | null
          revenue?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "crm_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_list_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          company_id: string | null
          contact_id: string | null
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          company_id?: string | null
          contact_id?: string | null
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          company_id?: string | null
          contact_id?: string | null
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_list_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "crm_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lists: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dynamic_filters: Json | null
          id: string
          is_dynamic: boolean | null
          list_type: string
          name: string
          record_count: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dynamic_filters?: Json | null
          id?: string
          is_dynamic?: boolean | null
          list_type: string
          name: string
          record_count?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dynamic_filters?: Json | null
          id?: string
          is_dynamic?: boolean | null
          list_type?: string
          name?: string
          record_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_meeting_preps: {
        Row: {
          company_research: string | null
          contact_profile: string | null
          created_at: string
          crm_company_id: string
          crm_contact_id: string | null
          full_brief_md: string | null
          generated_at: string | null
          id: string
          likely_pain_points: string | null
          market_context: string | null
          mundus_value_props: string | null
          research_links: Json
          scheduled_for: string | null
          status: string
          strategic_questions: string | null
          talking_points: string | null
        }
        Insert: {
          company_research?: string | null
          contact_profile?: string | null
          created_at?: string
          crm_company_id: string
          crm_contact_id?: string | null
          full_brief_md?: string | null
          generated_at?: string | null
          id?: string
          likely_pain_points?: string | null
          market_context?: string | null
          mundus_value_props?: string | null
          research_links?: Json
          scheduled_for?: string | null
          status?: string
          strategic_questions?: string | null
          talking_points?: string | null
        }
        Update: {
          company_research?: string | null
          contact_profile?: string | null
          created_at?: string
          crm_company_id?: string
          crm_contact_id?: string | null
          full_brief_md?: string | null
          generated_at?: string | null
          id?: string
          likely_pain_points?: string | null
          market_context?: string | null
          mundus_value_props?: string | null
          research_links?: Json
          scheduled_for?: string | null
          status?: string
          strategic_questions?: string | null
          talking_points?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_meeting_preps_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meeting_preps_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_personas: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          is_active: boolean | null
          match_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_active?: boolean | null
          match_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_active?: boolean | null
          match_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_personas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_saved_searches: {
        Row: {
          alert_enabled: boolean | null
          alert_frequency: string | null
          columns: Json | null
          created_at: string | null
          created_by: string | null
          filters: Json
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          is_starred: boolean | null
          last_run_at: string | null
          name: string
          result_count: number | null
          search_type: string
          sort_ascending: boolean | null
          sort_field: string | null
          updated_at: string | null
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          is_starred?: boolean | null
          last_run_at?: string | null
          name: string
          result_count?: number | null
          search_type: string
          sort_ascending?: boolean | null
          sort_field?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          is_starred?: boolean | null
          last_run_at?: string | null
          name?: string
          result_count?: number | null
          search_type?: string
          sort_ascending?: boolean | null
          sort_field?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_saved_searches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          agreed_at: string | null
          agreed_by: string | null
          created_at: string
          id: string
          offer_item_id: string
          price_per_kg: number
          quantity_kg: number
          round_proposal_id: string
          status: string | null
          total_value: number | null
        }
        Insert: {
          agreed_at?: string | null
          agreed_by?: string | null
          created_at?: string
          id?: string
          offer_item_id: string
          price_per_kg: number
          quantity_kg: number
          round_proposal_id: string
          status?: string | null
          total_value?: number | null
        }
        Update: {
          agreed_at?: string | null
          agreed_by?: string | null
          created_at?: string
          id?: string
          offer_item_id?: string
          price_per_kg?: number
          quantity_kg?: number
          round_proposal_id?: string
          status?: string | null
          total_value?: number | null
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
      cut_translations: {
        Row: {
          created_at: string | null
          cut_id: string
          id: string
          locale: string
          name: string
        }
        Insert: {
          created_at?: string | null
          cut_id: string
          id?: string
          locale: string
          name: string
        }
        Update: {
          created_at?: string | null
          cut_id?: string
          id?: string
          locale?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cut_translations_cut_id_fkey"
            columns: ["cut_id"]
            isOneToOne: false
            referencedRelation: "cuts"
            referencedColumns: ["id"]
          },
        ]
      }
      cuts: {
        Row: {
          bone_spec: string
          category: string
          created_at: string | null
          id: string
          image_url: string | null
          imps_number: string | null
          is_active: boolean | null
          name: string
          product_number: number | null
          region: string
          unit_weight: string
          weight_range_a: string | null
          weight_range_b: string | null
          weight_range_c: string | null
          weight_range_d: string | null
          weight_range_e: string | null
        }
        Insert: {
          bone_spec?: string
          category: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          imps_number?: string | null
          is_active?: boolean | null
          name: string
          product_number?: number | null
          region?: string
          unit_weight?: string
          weight_range_a?: string | null
          weight_range_b?: string | null
          weight_range_c?: string | null
          weight_range_d?: string | null
          weight_range_e?: string | null
        }
        Update: {
          bone_spec?: string
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          imps_number?: string | null
          is_active?: boolean | null
          name?: string
          product_number?: number | null
          region?: string
          unit_weight?: string
          weight_range_a?: string | null
          weight_range_b?: string | null
          weight_range_c?: string | null
          weight_range_d?: string | null
          weight_range_e?: string | null
        }
        Relationships: []
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
      email_domain_health: {
        Row: {
          alert_sent: boolean | null
          bounce_rate: number | null
          click_rate: number | null
          complaint_rate: number | null
          date: string
          domain: string
          emails_bounced: number | null
          emails_bounced_hard: number | null
          emails_bounced_soft: number | null
          emails_clicked: number | null
          emails_complained: number | null
          emails_delivered: number | null
          emails_opened: number | null
          emails_replied: number | null
          emails_sent: number | null
          id: string
          is_healthy: boolean | null
          open_rate: number | null
          reply_rate: number | null
        }
        Insert: {
          alert_sent?: boolean | null
          bounce_rate?: number | null
          click_rate?: number | null
          complaint_rate?: number | null
          date: string
          domain: string
          emails_bounced?: number | null
          emails_bounced_hard?: number | null
          emails_bounced_soft?: number | null
          emails_clicked?: number | null
          emails_complained?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_replied?: number | null
          emails_sent?: number | null
          id?: string
          is_healthy?: boolean | null
          open_rate?: number | null
          reply_rate?: number | null
        }
        Update: {
          alert_sent?: boolean | null
          bounce_rate?: number | null
          click_rate?: number | null
          complaint_rate?: number | null
          date?: string
          domain?: string
          emails_bounced?: number | null
          emails_bounced_hard?: number | null
          emails_bounced_soft?: number | null
          emails_clicked?: number | null
          emails_complained?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_replied?: number | null
          emails_sent?: number | null
          id?: string
          is_healthy?: boolean | null
          open_rate?: number | null
          reply_rate?: number | null
        }
        Relationships: []
      }
      email_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string
          current_step: number | null
          enrolled_at: string | null
          id: string
          last_sent_at: string | null
          next_send_at: string | null
          pause_reason: string | null
          sequence_id: string
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          last_sent_at?: string | null
          next_send_at?: string | null
          pause_reason?: string | null
          sequence_id: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          last_sent_at?: string | null
          next_send_at?: string | null
          pause_reason?: string | null
          sequence_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          contact_id: string | null
          email_send_id: string
          event_data: Json | null
          event_type: string
          id: string
          occurred_at: string | null
        }
        Insert: {
          contact_id?: string | null
          email_send_id: string
          event_data?: Json | null
          event_type: string
          id?: string
          occurred_at?: string | null
        }
        Update: {
          contact_id?: string | null
          email_send_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          occurred_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_providers: {
        Row: {
          configured_by: string | null
          created_at: string
          credentials: Json
          display_name: string
          from_address: string
          id: string
          is_active: boolean
          is_default: boolean
          provider: string
          reply_to: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          configured_by?: string | null
          created_at?: string
          credentials?: Json
          display_name: string
          from_address: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          provider: string
          reply_to?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          configured_by?: string | null
          created_at?: string
          credentials?: Json
          display_name?: string
          from_address?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          provider?: string
          reply_to?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          bounce_reason: string | null
          bounced_at: string | null
          click_count: number
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          html_body: string
          id: string
          open_count: number
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_name: string | null
          template_vars: Json | null
          to_email: string
        }
        Insert: {
          bounce_reason?: string | null
          bounced_at?: string | null
          click_count?: number
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          html_body: string
          id?: string
          open_count?: number
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_name?: string | null
          template_vars?: Json | null
          to_email: string
        }
        Update: {
          bounce_reason?: string | null
          bounced_at?: string | null
          click_count?: number
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          html_body?: string
          id?: string
          open_count?: number
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_name?: string | null
          template_vars?: Json | null
          to_email?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          ai_generated: boolean | null
          ai_model_used: string | null
          ai_prompt_context: Json | null
          body_html: string | null
          body_text: string | null
          bounce_reason: string | null
          bounce_type: string | null
          bounced_at: string | null
          click_count: number | null
          clicked_at: string | null
          contact_id: string
          created_at: string | null
          delivered_at: string | null
          email_type: string | null
          enrollment_id: string | null
          from_email: string
          from_name: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          replied_at: string | null
          reply_to: string | null
          sent_at: string | null
          sequence_step_id: string | null
          status: string | null
          subject: string
          zoho_message_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_model_used?: string | null
          ai_prompt_context?: Json | null
          body_html?: string | null
          body_text?: string | null
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          click_count?: number | null
          clicked_at?: string | null
          contact_id: string
          created_at?: string | null
          delivered_at?: string | null
          email_type?: string | null
          enrollment_id?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          replied_at?: string | null
          reply_to?: string | null
          sent_at?: string | null
          sequence_step_id?: string | null
          status?: string | null
          subject: string
          zoho_message_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_model_used?: string | null
          ai_prompt_context?: Json | null
          body_html?: string | null
          body_text?: string | null
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          click_count?: number | null
          clicked_at?: string | null
          contact_id?: string
          created_at?: string | null
          delivered_at?: string | null
          email_type?: string | null
          enrollment_id?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          replied_at?: string | null
          reply_to?: string | null
          sent_at?: string | null
          sequence_step_id?: string | null
          status?: string | null
          subject?: string
          zoho_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_sequence_step_id_fkey"
            columns: ["sequence_step_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          body_template: string
          created_at: string | null
          delay_days: number
          id: string
          send_time_preference: string | null
          sequence_id: string
          skip_if_clicked: boolean | null
          skip_if_opened: boolean | null
          skip_if_replied: boolean | null
          step_number: number
          subject_template: string
          variant_label: string | null
        }
        Insert: {
          body_template: string
          created_at?: string | null
          delay_days: number
          id?: string
          send_time_preference?: string | null
          sequence_id: string
          skip_if_clicked?: boolean | null
          skip_if_opened?: boolean | null
          skip_if_replied?: boolean | null
          step_number: number
          subject_template: string
          variant_label?: string | null
        }
        Update: {
          body_template?: string
          created_at?: string | null
          delay_days?: number
          id?: string
          send_time_preference?: string | null
          sequence_id?: string
          skip_if_clicked?: boolean | null
          skip_if_opened?: boolean | null
          skip_if_replied?: boolean | null
          step_number?: number
          subject_template?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          avg_open_rate: number | null
          avg_reply_rate: number | null
          created_at: string | null
          created_by: string | null
          daily_send_limit: number | null
          description: string | null
          id: string
          language: string | null
          max_emails: number | null
          name: string
          status: string | null
          target_type: string
          tone: string | null
          total_completed: number | null
          total_enrolled: number | null
          total_replied: number | null
          updated_at: string | null
        }
        Insert: {
          avg_open_rate?: number | null
          avg_reply_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_send_limit?: number | null
          description?: string | null
          id?: string
          language?: string | null
          max_emails?: number | null
          name: string
          status?: string | null
          target_type: string
          tone?: string | null
          total_completed?: number | null
          total_enrolled?: number | null
          total_replied?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_open_rate?: number | null
          avg_reply_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_send_limit?: number | null
          description?: string | null
          id?: string
          language?: string | null
          max_emails?: number | null
          name?: string
          status?: string | null
          target_type?: string
          tone?: string | null
          total_completed?: number | null
          total_enrolled?: number | null
          total_replied?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          max_attempts: number
          verified: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          max_attempts?: number
          verified?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          verified?: boolean
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          audience: string
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          label: string
          platform: string
          updated_at: string
        }
        Insert: {
          audience?: string
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          label: string
          platform: string
          updated_at?: string
        }
        Update: {
          audience?: string
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          label?: string
          platform?: string
          updated_at?: string
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
      mundus_partner_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          job_title: string | null
          linkedin: string | null
          mobile: string | null
          notes: string | null
          partner_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          linkedin?: string | null
          mobile?: string | null
          notes?: string | null
          partner_id: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          linkedin?: string | null
          mobile?: string | null
          notes?: string | null
          partner_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mundus_partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "mundus_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      mundus_partners: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          country: string | null
          coverage_regions: string[] | null
          created_at: string | null
          created_by: string | null
          id: string
          logo_url: string | null
          notes: string | null
          owner_id: string | null
          partner_type: string
          partnership_since: string | null
          postal_code: string | null
          services_offered: string[] | null
          state: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          coverage_regions?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          owner_id?: string | null
          partner_type: string
          partnership_since?: string | null
          postal_code?: string | null
          services_offered?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          coverage_regions?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          owner_id?: string | null
          partner_type?: string
          partnership_since?: string | null
          postal_code?: string | null
          services_offered?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      mw_assignment_rules: {
        Row: {
          created_at: string
          criteria: Json
          id: string
          is_active: boolean
          name: string
          priority: number
          strategy: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          strategy?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          strategy?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mw_contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          instance_id: string | null
          is_business: boolean
          jid: string
          last_seen_at: string | null
          metadata: Json
          name: string | null
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          push_name: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_business?: boolean
          jid: string
          last_seen_at?: string | null
          metadata?: Json
          name?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          push_name?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_business?: boolean
          jid?: string
          last_seen_at?: string | null
          metadata?: Json
          name?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          push_name?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mw_contacts_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "mw_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_conversation_notes: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mw_conversation_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "mw_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_conversation_summaries: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          model: string | null
          sentiment: string | null
          summary: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          sentiment?: string | null
          summary: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          sentiment?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "mw_conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "mw_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_conversation_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          conversation_id: string
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          conversation_id: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mw_conversation_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "mw_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_conversation_topics: {
        Row: {
          analysis: string | null
          confidence: number | null
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          topics: string[]
        }
        Insert: {
          analysis?: string | null
          confidence?: number | null
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          topics?: string[]
        }
        Update: {
          analysis?: string | null
          confidence?: number | null
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          topics?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "mw_conversation_topics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "mw_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_conversations: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string
          id: string
          instance_id: string
          is_archived: boolean
          last_message_at: string | null
          last_message_preview: string | null
          sentiment: string | null
          sentiment_confidence: number | null
          status: string
          topic_confidence: number | null
          topic_tags: string[]
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          id?: string
          instance_id: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          sentiment?: string | null
          sentiment_confidence?: number | null
          status?: string
          topic_confidence?: number | null
          topic_tags?: string[]
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          instance_id?: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          sentiment?: string | null
          sentiment_confidence?: number | null
          status?: string
          topic_confidence?: number | null
          topic_tags?: string[]
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mw_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "mw_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mw_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "mw_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_instances: {
        Row: {
          created_at: string
          created_by: string | null
          evolution_api_key: string | null
          evolution_base_url: string | null
          evolution_instance_id: string | null
          id: string
          instance_id_external: string | null
          last_connected_at: string | null
          message_count_30d: number
          name: string
          phone_number: string | null
          provider_type: string
          qr_code: string | null
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evolution_api_key?: string | null
          evolution_base_url?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_id_external?: string | null
          last_connected_at?: string | null
          message_count_30d?: number
          name: string
          phone_number?: string | null
          provider_type?: string
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evolution_api_key?: string | null
          evolution_base_url?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_id_external?: string | null
          last_connected_at?: string | null
          message_count_30d?: number
          name?: string
          phone_number?: string | null
          provider_type?: string
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      mw_macros: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          scope: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          scope?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scope?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mw_message_edits: {
        Row: {
          edited_at: string
          edited_by: string | null
          id: string
          message_id: string
          previous_body: string | null
        }
        Insert: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          message_id: string
          previous_body?: string | null
        }
        Update: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          message_id?: string
          previous_body?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mw_message_edits_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          reactor_jid: string | null
          reactor_user_id: string | null
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          reactor_jid?: string | null
          reactor_user_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          reactor_jid?: string | null
          reactor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mw_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          external_id: string | null
          from_me: boolean
          id: string
          is_edited: boolean
          media_mime: string | null
          media_size: number | null
          media_url: string | null
          metadata: Json
          reply_to_id: string | null
          sender_jid: string | null
          sender_user_id: string | null
          sent_at: string
          status: string
          type: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          external_id?: string | null
          from_me?: boolean
          id?: string
          is_edited?: boolean
          media_mime?: string | null
          media_size?: number | null
          media_url?: string | null
          metadata?: Json
          reply_to_id?: string | null
          sender_jid?: string | null
          sender_user_id?: string | null
          sent_at?: string
          status?: string
          type?: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          external_id?: string | null
          from_me?: boolean
          id?: string
          is_edited?: boolean
          media_mime?: string | null
          media_size?: number | null
          media_url?: string | null
          metadata?: Json
          reply_to_id?: string | null
          sender_jid?: string | null
          sender_user_id?: string | null
          sent_at?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mw_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "mw_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mw_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "mw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mw_setup_progress: {
        Row: {
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mw_team_members: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      negotiation_messages: {
        Row: {
          content: string | null
          created_at: string | null
          emailed: boolean | null
          emailed_at: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          negotiation_id: string
          proposal_status: string | null
          read_at: string | null
          sender_side: string
          sender_user_id: string
          structured_data: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          emailed?: boolean | null
          emailed_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          negotiation_id: string
          proposal_status?: string | null
          read_at?: string | null
          sender_side: string
          sender_user_id: string
          structured_data?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          emailed?: boolean | null
          emailed_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          negotiation_id?: string
          proposal_status?: string | null
          read_at?: string | null
          sender_side?: string
          sender_user_id?: string
          structured_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          negotiation_id: string
          supplier_email: string | null
          supplier_name: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          negotiation_id: string
          supplier_email?: string | null
          supplier_name?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          negotiation_id?: string
          supplier_email?: string | null
          supplier_name?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_tokens_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          agreed_items: Json
          buyer_company_id: string
          buyer_message: string | null
          chat_enabled: boolean | null
          created_at: string
          created_by_user_id: string
          current_round: number | null
          deleted_at: string | null
          expires_at: string | null
          fcl_count: number
          freight_cost_per_kg: number
          id: string
          incoterm: string
          insurance_per_kg: number | null
          locked_until: string | null
          max_rounds: number | null
          negotiation_type: string | null
          offer_id: string
          office_id: string | null
          order_id: string | null
          port_id: string | null
          rejection_cooldown_until: string | null
          rejection_notes: string | null
          rejection_reason: string | null
          settled_round_proposal_id: string | null
          settled_total_value: number | null
          status: string
          supplier_message: string | null
          updated_at: string
        }
        Insert: {
          agreed_items?: Json
          buyer_company_id: string
          buyer_message?: string | null
          chat_enabled?: boolean | null
          created_at?: string
          created_by_user_id: string
          current_round?: number | null
          deleted_at?: string | null
          expires_at?: string | null
          fcl_count: number
          freight_cost_per_kg?: number
          id?: string
          incoterm: string
          insurance_per_kg?: number | null
          locked_until?: string | null
          max_rounds?: number | null
          negotiation_type?: string | null
          offer_id: string
          office_id?: string | null
          order_id?: string | null
          port_id?: string | null
          rejection_cooldown_until?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          settled_round_proposal_id?: string | null
          settled_total_value?: number | null
          status?: string
          supplier_message?: string | null
          updated_at?: string
        }
        Update: {
          agreed_items?: Json
          buyer_company_id?: string
          buyer_message?: string | null
          chat_enabled?: boolean | null
          created_at?: string
          created_by_user_id?: string
          current_round?: number | null
          deleted_at?: string | null
          expires_at?: string | null
          fcl_count?: number
          freight_cost_per_kg?: number
          id?: string
          incoterm?: string
          insurance_per_kg?: number | null
          locked_until?: string | null
          max_rounds?: number | null
          negotiation_type?: string | null
          offer_id?: string
          office_id?: string | null
          order_id?: string | null
          port_id?: string | null
          rejection_cooldown_until?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          settled_round_proposal_id?: string | null
          settled_total_value?: number | null
          status?: string
          supplier_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
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
            foreignKeyName: "negotiations_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          {
            foreignKeyName: "negotiations_settled_round_proposal_fk"
            columns: ["settled_round_proposal_id"]
            isOneToOne: false
            referencedRelation: "round_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          deal_closed: boolean
          email: boolean
          id: string
          in_app: boolean
          negotiation_rounds: boolean
          new_buyer_request: boolean
          new_chat_message: boolean
          new_request_response: boolean
          offer_deactivated: boolean
          order_status_changes: boolean
          shipping_instructions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_closed?: boolean
          email?: boolean
          id?: string
          in_app?: boolean
          negotiation_rounds?: boolean
          new_buyer_request?: boolean
          new_chat_message?: boolean
          new_request_response?: boolean
          offer_deactivated?: boolean
          order_status_changes?: boolean
          shipping_instructions?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_closed?: boolean
          email?: boolean
          id?: string
          in_app?: boolean
          negotiation_rounds?: boolean
          new_buyer_request?: boolean
          new_chat_message?: boolean
          new_request_response?: boolean
          offer_deactivated?: boolean
          order_status_changes?: boolean
          shipping_instructions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      offer_distributions: {
        Row: {
          channel: string | null
          clicked_at: string | null
          created_at: string | null
          id: string
          offer_id: string
          opened_at: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string | null
          target_company_id: string | null
          target_country: string | null
          target_email: string | null
        }
        Insert: {
          channel?: string | null
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          offer_id: string
          opened_at?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          target_company_id?: string | null
          target_country?: string | null
          target_email?: string | null
        }
        Update: {
          channel?: string | null
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          offer_id?: string
          opened_at?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          target_company_id?: string | null
          target_country?: string | null
          target_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_distributions_offer_id_fkey"
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
          packaging: string | null
          plant_number: string | null
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
          packaging?: string | null
          plant_number?: string | null
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
          packaging?: string | null
          plant_number?: string | null
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
      offer_views: {
        Row: {
          id: string
          offer_id: string
          session_duration_seconds: number | null
          source: string | null
          viewed_at: string | null
          viewer_company_id: string | null
          viewer_country: string | null
          viewer_ip: string | null
          viewer_user_id: string | null
        }
        Insert: {
          id?: string
          offer_id: string
          session_duration_seconds?: number | null
          source?: string | null
          viewed_at?: string | null
          viewer_company_id?: string | null
          viewer_country?: string | null
          viewer_ip?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          id?: string
          offer_id?: string
          session_duration_seconds?: number | null
          source?: string | null
          viewed_at?: string | null
          viewer_company_id?: string | null
          viewer_country?: string | null
          viewer_ip?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_views_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          container_size: string
          created_at: string | null
          cut_region: string
          deleted_at: string | null
          exw_pickup_location: string | null
          id: string
          is_halal: boolean | null
          is_kosher: boolean | null
          observation: string | null
          offer_number: number
          office_id: string | null
          origin_city: string | null
          origin_country: string | null
          origin_port: string | null
          origin_port_id: string | null
          payment_terms: string
          price: number | null
          request_id: string | null
          shipment_month: number
          shipment_year: number
          status: string | null
          supplier_id: string
          supplier_name: string
          supplier_rating: number | null
          total_fcl: number | null
          updated_at: string | null
          view_count: number
        }
        Insert: {
          container_size: string
          created_at?: string | null
          cut_region?: string
          deleted_at?: string | null
          exw_pickup_location?: string | null
          id?: string
          is_halal?: boolean | null
          is_kosher?: boolean | null
          observation?: string | null
          offer_number?: number
          office_id?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_port?: string | null
          origin_port_id?: string | null
          payment_terms: string
          price?: number | null
          request_id?: string | null
          shipment_month: number
          shipment_year: number
          status?: string | null
          supplier_id: string
          supplier_name: string
          supplier_rating?: number | null
          total_fcl?: number | null
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          container_size?: string
          created_at?: string | null
          cut_region?: string
          deleted_at?: string | null
          exw_pickup_location?: string | null
          id?: string
          is_halal?: boolean | null
          is_kosher?: boolean | null
          observation?: string | null
          offer_number?: number
          office_id?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_port?: string | null
          origin_port_id?: string | null
          payment_terms?: string
          price?: number | null
          request_id?: string | null
          shipment_month?: number
          shipment_year?: number
          status?: string | null
          supplier_id?: string
          supplier_name?: string
          supplier_rating?: number | null
          total_fcl?: number | null
          updated_at?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_requests"
            referencedColumns: ["id"]
          },
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
          buyer_company_id: string | null
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
          negotiation_id: string | null
          offer_id: string
          office_id: string | null
          order_number: number
          placed_at: string | null
          reject_justification: string | null
          revenue_cancel_reason: string | null
          revenue_cancelled_at: string | null
          revenue_due_date: string | null
          revenue_status: string
          revenue_status_changed_at: string | null
          status: string | null
        }
        Insert: {
          buyer_company_id?: string | null
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
          negotiation_id?: string | null
          offer_id: string
          office_id?: string | null
          order_number?: number
          placed_at?: string | null
          reject_justification?: string | null
          revenue_cancel_reason?: string | null
          revenue_cancelled_at?: string | null
          revenue_due_date?: string | null
          revenue_status?: string
          revenue_status_changed_at?: string | null
          status?: string | null
        }
        Update: {
          buyer_company_id?: string | null
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
          negotiation_id?: string | null
          offer_id?: string
          office_id?: string | null
          order_number?: number
          placed_at?: string | null
          reject_justification?: string | null
          revenue_cancel_reason?: string | null
          revenue_cancelled_at?: string | null
          revenue_due_date?: string | null
          revenue_status?: string
          revenue_status_changed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "orders_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          auction_id: string | null
          body_html: string
          bounced_count: number
          campaign_type: string
          clicked_count: number
          created_at: string
          delivered_count: number
          id: string
          offer_id: string | null
          opened_count: number
          provider_id: string | null
          recipients_count: number
          sent_at: string | null
          sent_by: string | null
          sent_count: number
          status: string
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          auction_id?: string | null
          body_html: string
          bounced_count?: number
          campaign_type: string
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          id?: string
          offer_id?: string | null
          opened_count?: number
          provider_id?: string | null
          recipients_count?: number
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number
          status?: string
          subject: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          auction_id?: string | null
          body_html?: string
          bounced_count?: number
          campaign_type?: string
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          id?: string
          offer_id?: string | null
          opened_count?: number
          provider_id?: string | null
          recipients_count?: number
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "outreach_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_emails: {
        Row: {
          body_html: string | null
          clicked_at: string | null
          contact_company: string | null
          contact_email: string
          contact_name: string | null
          country: string | null
          created_at: string
          id: string
          offer_id: string
          opened_at: string | null
          replied_at: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          subject: string
        }
        Insert: {
          body_html?: string | null
          clicked_at?: string | null
          contact_company?: string | null
          contact_email: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          offer_id: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          body_html?: string | null
          clicked_at?: string | null
          contact_company?: string | null
          contact_email?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          offer_id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_emails_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          clicks_count: number
          company_name: string | null
          contact_email: string
          contact_id: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          opens_count: number
          sent_at: string | null
          status: string
          tracking_id: string
          updated_at: string
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          clicks_count?: number
          company_name?: string | null
          contact_email: string
          contact_id?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          opens_count?: number
          sent_at?: string | null
          status?: string
          tracking_id?: string
          updated_at?: string
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          clicks_count?: number
          company_name?: string | null
          contact_email?: string
          contact_id?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          opens_count?: number
          sent_at?: string | null
          status?: string
          tracking_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_templates: {
        Row: {
          body_html: string
          body_text: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_default: boolean
          language: string
          name: string
          subject: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_html: string
          body_text?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          language?: string
          name: string
          subject: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_html?: string
          body_text?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          language?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
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
      port_sharing: {
        Row: {
          certificate_options: string[] | null
          certificate_prompt: string | null
          country_id: string
          created_at: string | null
          id: string
          uses_ports_from_country_id: string
        }
        Insert: {
          certificate_options?: string[] | null
          certificate_prompt?: string | null
          country_id: string
          created_at?: string | null
          id?: string
          uses_ports_from_country_id: string
        }
        Update: {
          certificate_options?: string[] | null
          certificate_prompt?: string | null
          country_id?: string
          created_at?: string | null
          id?: string
          uses_ports_from_country_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "port_sharing_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_sharing_uses_ports_from_country_id_fkey"
            columns: ["uses_ports_from_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
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
      prospect_phone_reveals: {
        Row: {
          apollo_person_id: string
          created_at: string
          id: string
          mobile: string | null
          phone: string | null
          raw: Json | null
          updated_at: string
        }
        Insert: {
          apollo_person_id: string
          created_at?: string
          id?: string
          mobile?: string | null
          phone?: string | null
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          apollo_person_id?: string
          created_at?: string
          id?: string
          mobile?: string | null
          phone?: string | null
          raw?: Json | null
          updated_at?: string
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
          created_at: string
          created_by_user_id: string
          freight_per_kg: number | null
          id: string
          incoterm: string | null
          insurance_per_kg: number | null
          message: string | null
          negotiation_id: string
          round: number
          side: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          freight_per_kg?: number | null
          id?: string
          incoterm?: string | null
          insurance_per_kg?: number | null
          message?: string | null
          negotiation_id: string
          round: number
          side?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          freight_per_kg?: number | null
          id?: string
          incoterm?: string | null
          insurance_per_kg?: number | null
          message?: string | null
          negotiation_id?: string
          round?: number
          side?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_proposals_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_proposals_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_containers: {
        Row: {
          arrived_date: string | null
          bl_document_url: string | null
          bl_draft_url: string | null
          bl_extracted_data: Json | null
          bl_number: string | null
          container_number: string | null
          created_at: string | null
          delivered_date: string | null
          departed_date: string | null
          destination_country: string | null
          destination_port: string | null
          destination_port_id: string | null
          discharged_date: string | null
          gate_in_date: string | null
          gate_out_date: string | null
          id: string
          order_id: string | null
          origin_country: string | null
          origin_port: string | null
          origin_port_id: string | null
          position: number | null
          seal_number: string | null
          shipping_line: string | null
          status: string | null
          stuffed_date: string | null
          updated_at: string | null
          vessel_loaded_date: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          arrived_date?: string | null
          bl_document_url?: string | null
          bl_draft_url?: string | null
          bl_extracted_data?: Json | null
          bl_number?: string | null
          container_number?: string | null
          created_at?: string | null
          delivered_date?: string | null
          departed_date?: string | null
          destination_country?: string | null
          destination_port?: string | null
          destination_port_id?: string | null
          discharged_date?: string | null
          gate_in_date?: string | null
          gate_out_date?: string | null
          id?: string
          order_id?: string | null
          origin_country?: string | null
          origin_port?: string | null
          origin_port_id?: string | null
          position?: number | null
          seal_number?: string | null
          shipping_line?: string | null
          status?: string | null
          stuffed_date?: string | null
          updated_at?: string | null
          vessel_loaded_date?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          arrived_date?: string | null
          bl_document_url?: string | null
          bl_draft_url?: string | null
          bl_extracted_data?: Json | null
          bl_number?: string | null
          container_number?: string | null
          created_at?: string | null
          delivered_date?: string | null
          departed_date?: string | null
          destination_country?: string | null
          destination_port?: string | null
          destination_port_id?: string | null
          discharged_date?: string | null
          gate_in_date?: string | null
          gate_out_date?: string | null
          id?: string
          order_id?: string | null
          origin_country?: string | null
          origin_port?: string | null
          origin_port_id?: string | null
          position?: number | null
          seal_number?: string | null
          shipping_line?: string | null
          status?: string | null
          stuffed_date?: string | null
          updated_at?: string | null
          vessel_loaded_date?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_containers_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_containers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_containers_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instructions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_shipping_lines: Json | null
          buyer_address: string | null
          buyer_name: string | null
          consignee_address: string | null
          consignee_fax: string | null
          consignee_name: string | null
          consignee_phone: string | null
          country_of_destination: string | null
          created_at: string
          doc_delivery_address: string | null
          doc_delivery_city: string | null
          doc_delivery_company: string | null
          doc_delivery_contact_name: string | null
          doc_delivery_contact_phone: string | null
          doc_delivery_country: string | null
          doc_delivery_postal_code: string | null
          doc_delivery_state: string | null
          documents_requested: Json | null
          id: string
          importer_reference: string | null
          notify_address: string | null
          notify_fax: string | null
          notify_name: string | null
          notify_phone: string | null
          notify_same_as_consignee: boolean | null
          observations: string | null
          offer_id: string | null
          order_id: string | null
          order_number: string | null
          port_of_destination: string | null
          request_id: string | null
          submitted_at: string | null
          submitted_by_ip: string | null
          telex_release: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_shipping_lines?: Json | null
          buyer_address?: string | null
          buyer_name?: string | null
          consignee_address?: string | null
          consignee_fax?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          country_of_destination?: string | null
          created_at?: string
          doc_delivery_address?: string | null
          doc_delivery_city?: string | null
          doc_delivery_company?: string | null
          doc_delivery_contact_name?: string | null
          doc_delivery_contact_phone?: string | null
          doc_delivery_country?: string | null
          doc_delivery_postal_code?: string | null
          doc_delivery_state?: string | null
          documents_requested?: Json | null
          id?: string
          importer_reference?: string | null
          notify_address?: string | null
          notify_fax?: string | null
          notify_name?: string | null
          notify_phone?: string | null
          notify_same_as_consignee?: boolean | null
          observations?: string | null
          offer_id?: string | null
          order_id?: string | null
          order_number?: string | null
          port_of_destination?: string | null
          request_id?: string | null
          submitted_at?: string | null
          submitted_by_ip?: string | null
          telex_release?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_shipping_lines?: Json | null
          buyer_address?: string | null
          buyer_name?: string | null
          consignee_address?: string | null
          consignee_fax?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          country_of_destination?: string | null
          created_at?: string
          doc_delivery_address?: string | null
          doc_delivery_city?: string | null
          doc_delivery_company?: string | null
          doc_delivery_contact_name?: string | null
          doc_delivery_contact_phone?: string | null
          doc_delivery_country?: string | null
          doc_delivery_postal_code?: string | null
          doc_delivery_state?: string | null
          documents_requested?: Json | null
          id?: string
          importer_reference?: string | null
          notify_address?: string | null
          notify_fax?: string | null
          notify_name?: string | null
          notify_phone?: string | null
          notify_same_as_consignee?: boolean | null
          observations?: string | null
          offer_id?: string | null
          order_id?: string | null
          order_number?: string | null
          port_of_destination?: string | null
          request_id?: string | null
          submitted_at?: string | null
          submitted_by_ip?: string | null
          telex_release?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instructions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instructions_requests: {
        Row: {
          buyer_email: string
          buyer_name: string | null
          created_at: string
          expires_at: string
          id: string
          offer_id: string | null
          order_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          submitted_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          buyer_email: string
          buyer_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          offer_id?: string | null
          order_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          buyer_email?: string
          buyer_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          offer_id?: string | null
          order_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instructions_requests_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      supplier_negotiation_settings: {
        Row: {
          allow_manual_override: boolean
          auto_close_on_final: boolean
          created_at: string
          expiration_hours: number | null
          lock_minutes: number
          supplier_company_id: string
          updated_at: string
        }
        Insert: {
          allow_manual_override?: boolean
          auto_close_on_final?: boolean
          created_at?: string
          expiration_hours?: number | null
          lock_minutes?: number
          supplier_company_id: string
          updated_at?: string
        }
        Update: {
          allow_manual_override?: boolean
          auto_close_on_final?: boolean
          created_at?: string
          expiration_hours?: number | null
          lock_minutes?: number
          supplier_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_negotiation_settings_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          account_status: string
          auth_user_id: string | null
          avatar_url: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string | null
          full_name: string
          id: string
          invited_at: string | null
          job_title: string | null
          language: string | null
          notes: string | null
          phone: string | null
          profile_type: string | null
          role: string
          token: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          account_status?: string
          auth_user_id?: string | null
          avatar_url?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          invited_at?: string | null
          job_title?: string | null
          language?: string | null
          notes?: string | null
          phone?: string | null
          profile_type?: string | null
          role?: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          account_status?: string
          auth_user_id?: string | null
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          invited_at?: string | null
          job_title?: string | null
          language?: string | null
          notes?: string | null
          phone?: string | null
          profile_type?: string | null
          role?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_offices: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          role: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          address: string | null
          approval_user_id: string | null
          certificate_url: string | null
          city: string | null
          company_id: string
          company_name: string | null
          countries_of_operation: string[] | null
          country: string | null
          created_at: string | null
          created_user_id: string | null
          email: string
          id: string
          name: string
          phone: string | null
          proteins: string[] | null
          registration_country: string | null
          reject_reason: string | null
          reviewed_at: string | null
          role: string | null
          scan_result: Json | null
          state: string | null
          status: string | null
          tax_id: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_user_id?: string | null
          certificate_url?: string | null
          city?: string | null
          company_id: string
          company_name?: string | null
          countries_of_operation?: string[] | null
          country?: string | null
          created_at?: string | null
          created_user_id?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          proteins?: string[] | null
          registration_country?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          role?: string | null
          scan_result?: Json | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_user_id?: string | null
          certificate_url?: string | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          countries_of_operation?: string[] | null
          country?: string | null
          created_at?: string | null
          created_user_id?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          proteins?: string[] | null
          registration_country?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          role?: string | null
          scan_result?: Json | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          website?: string | null
          zip?: string | null
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
          active_office_id: string | null
          avatar_url: string | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          email: string
          id: string
          inviter_id: string | null
          is_owner: boolean | null
          last_invite_sent_at: string | null
          name: string
          phone: string | null
          preferred_language: string | null
          preferred_unit: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          active_company_id?: string | null
          active_office_id?: string | null
          avatar_url?: string | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          email: string
          id: string
          inviter_id?: string | null
          is_owner?: boolean | null
          last_invite_sent_at?: string | null
          name: string
          phone?: string | null
          preferred_language?: string | null
          preferred_unit?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          active_company_id?: string | null
          active_office_id?: string | null
          avatar_url?: string | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          inviter_id?: string | null
          is_owner?: boolean | null
          last_invite_sent_at?: string | null
          name?: string
          phone?: string | null
          preferred_language?: string | null
          preferred_unit?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_type?: string | null
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
            foreignKeyName: "users_active_office_id_fkey"
            columns: ["active_office_id"]
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
      accept_negotiation: {
        Args: { p_negotiation_id: string; p_user_id: string }
        Returns: Json
      }
      accept_team_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      current_user_company_id: { Args: never; Returns: string }
      current_user_company_ids: { Args: never; Returns: string[] }
      enqueue_app_notifications: {
        Args: {
          p_body?: string
          p_category?: string
          p_company_id: string
          p_icon?: string
          p_link_label?: string
          p_link_url?: string
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_user_ids: string[]
        }
        Returns: number
      }
      enqueue_email: {
        Args: {
          p_html_body: string
          p_subject: string
          p_template_name: string
          p_template_vars?: Json
          p_to_email: string
        }
        Returns: string
      }
      get_company_active_user_ids: {
        Args: { p_company_id: string }
        Returns: {
          user_id: string
        }[]
      }
      get_company_primary_contact: {
        Args: { p_company_id: string }
        Returns: {
          email: string
          full_name: string
        }[]
      }
      increment_offer_views: { Args: { offer_id: string }; Returns: undefined }
      is_company_master: { Args: { _company_id: string }; Returns: boolean }
      is_mundus_admin: { Args: never; Returns: boolean }
      reject_negotiation: {
        Args: { p_negotiation_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      resolve_customer_product: {
        Args: { p_company_id: string; p_cut_id: string }
        Returns: string
      }
      submit_initial_bid: {
        Args: {
          p_buyer_company_id: string
          p_buyer_message?: string
          p_created_by_user_id: string
          p_fcl_count?: number
          p_freight_cost_per_kg?: number
          p_incoterm?: string
          p_insurance_per_kg?: number
          p_items?: Json
          p_offer_id: string
          p_port_id?: string
        }
        Returns: Json
      }
      submit_negotiation_round: {
        Args: { p_items: Json; p_negotiation_id: string; p_user_id: string }
        Returns: Json
      }
      track_email_click: { Args: { email_id: string }; Returns: undefined }
      track_email_open: { Args: { email_id: string }; Returns: undefined }
      user_can_access_negotiation: {
        Args: { p_negotiation_id: string }
        Returns: boolean
      }
      user_can_create_negotiation: {
        Args: { p_buyer_company_id: string; p_created_by_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      auction_bid_status: "submitted" | "winning" | "lost" | "withdrawn"
      auction_status:
        | "scheduled"
        | "open"
        | "closed"
        | "awarded"
        | "contracted"
        | "cancelled"
        | "expired"
      auction_visibility: "blind" | "open"
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
      auction_bid_status: ["submitted", "winning", "lost", "withdrawn"],
      auction_status: [
        "scheduled",
        "open",
        "closed",
        "awarded",
        "contracted",
        "cancelled",
        "expired",
      ],
      auction_visibility: ["blind", "open"],
    },
  },
} as const
