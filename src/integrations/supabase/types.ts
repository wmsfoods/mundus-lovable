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
          domain: string | null
          estimated_employees: number | null
          founded_year: number | null
          headcount_growth_12m: number | null
          headcount_growth_6m: number | null
          id: string
          industry: string | null
          is_public: boolean | null
          keywords: string[] | null
          linkedin_url: string | null
          logo_url: string | null
          market_region: string | null
          market_segment: string | null
          merged_into_id: string | null
          mundus_company_id: string | null
          naics_codes: string[] | null
          name: string
          notes: string | null
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
          domain?: string | null
          estimated_employees?: number | null
          founded_year?: number | null
          headcount_growth_12m?: number | null
          headcount_growth_6m?: number | null
          id?: string
          industry?: string | null
          is_public?: boolean | null
          keywords?: string[] | null
          linkedin_url?: string | null
          logo_url?: string | null
          market_region?: string | null
          market_segment?: string | null
          merged_into_id?: string | null
          mundus_company_id?: string | null
          naics_codes?: string[] | null
          name: string
          notes?: string | null
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
          domain?: string | null
          estimated_employees?: number | null
          founded_year?: number | null
          headcount_growth_12m?: number | null
          headcount_growth_6m?: number | null
          id?: string
          industry?: string | null
          is_public?: boolean | null
          keywords?: string[] | null
          linkedin_url?: string | null
          logo_url?: string | null
          market_region?: string | null
          market_segment?: string | null
          merged_into_id?: string | null
          mundus_company_id?: string | null
          naics_codes?: string[] | null
          name?: string
          notes?: string | null
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
          created_at: string
          id: string
          offer_item_id: string
          price_per_kg: number
          quantity_kg: number
          round_proposal_id: string
          total_value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          offer_item_id: string
          price_per_kg: number
          quantity_kg: number
          round_proposal_id: string
          total_value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          offer_item_id?: string
          price_per_kg?: number
          quantity_kg?: number
          round_proposal_id?: string
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
          buyer_company_id: string
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          expires_at: string | null
          fcl_count: number
          freight_cost_per_kg: number
          id: string
          incoterm: string
          locked_until: string | null
          offer_id: string
          order_id: string | null
          port_id: string | null
          settled_round_proposal_id: string | null
          settled_total_value: number | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_company_id: string
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          expires_at?: string | null
          fcl_count: number
          freight_cost_per_kg?: number
          id?: string
          incoterm: string
          locked_until?: string | null
          offer_id: string
          order_id?: string | null
          port_id?: string | null
          settled_round_proposal_id?: string | null
          settled_total_value?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          expires_at?: string | null
          fcl_count?: number
          freight_cost_per_kg?: number
          id?: string
          incoterm?: string
          locked_until?: string | null
          offer_id?: string
          order_id?: string | null
          port_id?: string | null
          settled_round_proposal_id?: string | null
          settled_total_value?: number | null
          status?: string
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
          created_at: string
          created_by_user_id: string
          id: string
          negotiation_id: string
          round: number
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          negotiation_id: string
          round: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          negotiation_id?: string
          round?: number
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
      accept_negotiation: {
        Args: { p_negotiation_id: string; p_user_id: string }
        Returns: Json
      }
      current_user_company_id: { Args: never; Returns: string }
      is_mundus_admin: { Args: never; Returns: boolean }
      reject_negotiation: {
        Args: { p_negotiation_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      submit_negotiation_round: {
        Args: { p_items: Json; p_negotiation_id: string; p_user_id: string }
        Returns: Json
      }
      user_can_access_negotiation: {
        Args: { p_negotiation_id: string }
        Returns: boolean
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
