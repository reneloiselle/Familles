export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string
          name: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          created_by?: string
        }
        Relationships: []
      }
      calendar_subscriptions: {
        Row: {
          id: string
          family_member_id: string
          url: string
          name: string
          color: string | null
          created_at: string
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          family_member_id: string
          url: string
          name: string
          color?: string | null
          created_at?: string
          last_synced_at?: string | null
        }
        Update: {
          id?: string
          family_member_id?: string
          url?: string
          name?: string
          color?: string | null
          created_at?: string
          last_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_subscriptions_family_member_id_fkey'
            columns: ['family_member_id']
            isOneToOne: false
            referencedRelation: 'family_members'
            referencedColumns: ['id']
          },
        ]
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          user_id: string | null
          role: 'parent' | 'child'
          email: string | null
          name: string | null
          invitation_status: 'pending' | 'accepted' | 'declined' | null
          created_at: string
          avatar_url: string | null
          color: string | null
        }
        Insert: {
          id?: string
          family_id: string
          user_id?: string | null
          role: 'parent' | 'child'
          email?: string | null
          name?: string | null
          invitation_status?: 'pending' | 'accepted' | 'declined' | null
          created_at?: string
          avatar_url?: string | null
          color?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string | null
          role?: 'parent' | 'child'
          email?: string | null
          name?: string | null
          invitation_status?: 'pending' | 'accepted' | 'declined' | null
          created_at?: string
          avatar_url?: string | null
          color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'family_members_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      schedules: {
        Row: {
          id: string
          family_member_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          date: string
          created_at: string
          created_by: string | null
          subscription_id: string | null
          external_uid: string | null
          last_synced_at: string | null
          location: string | null
        }
        Insert: {
          id?: string
          family_member_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          date: string
          created_at?: string
          created_by?: string | null
          subscription_id?: string | null
          external_uid?: string | null
          last_synced_at?: string | null
          location?: string | null
        }
        Update: {
          id?: string
          family_member_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          date?: string
          created_at?: string
          created_by?: string | null
          subscription_id?: string | null
          external_uid?: string | null
          last_synced_at?: string | null
          location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'schedules_family_member_id_fkey'
            columns: ['family_member_id']
            isOneToOne: false
            referencedRelation: 'family_members'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          family_id: string
          assigned_to: string | null
          title: string
          description: string | null
          status: 'todo' | 'completed'
          due_date: string | null
          created_at: string
          created_by: string
          priority: 'low' | 'medium' | 'high' | null
        }
        Insert: {
          id?: string
          family_id: string
          assigned_to?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'completed'
          due_date?: string | null
          created_at?: string
          created_by: string
          priority?: 'low' | 'medium' | 'high' | null
        }
        Update: {
          id?: string
          family_id?: string
          assigned_to?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'completed'
          due_date?: string | null
          created_at?: string
          created_by?: string
          priority?: 'low' | 'medium' | 'high' | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'family_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      shared_lists: {
        Row: {
          id: string
          family_id: string
          name: string
          description: string | null
          color: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          description?: string | null
          color?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          description?: string | null
          color?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shared_lists_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      shared_list_items: {
        Row: {
          id: string
          list_id: string
          text: string
          checked: boolean
          quantity: string | null
          notes: string | null
          product_id: string | null
          created_by: string
          created_at: string
          updated_at: string
          checked_at: string | null
          checked_by: string | null
        }
        Insert: {
          id?: string
          list_id: string
          text: string
          checked?: boolean
          quantity?: string | null
          notes?: string | null
          product_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          checked_at?: string | null
          checked_by?: string | null
        }
        Update: {
          id?: string
          list_id?: string
          text?: string
          checked?: boolean
          quantity?: string | null
          notes?: string | null
          product_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          checked_at?: string | null
          checked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'shared_list_items_list_id_fkey'
            columns: ['list_id']
            isOneToOne: false
            referencedRelation: 'shared_lists'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shared_list_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          id: string
          family_id: string
          name: string
          brand: string | null
          format: string | null
          price: number | null
          upc: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          brand?: string | null
          format?: string | null
          price?: number | null
          upc?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          brand?: string | null
          format?: string | null
          price?: number | null
          upc?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      stores: {
        Row: {
          id: string
          family_id: string
          name: string
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stores_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      product_store_placements: {
        Row: {
          id: string
          product_id: string
          store_id: string
          aisle: string | null
          comment: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          store_id: string
          aisle?: string | null
          comment?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          store_id?: string
          aisle?: string | null
          comment?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_store_placements_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_store_placements_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          id: string
          family_id: string
          family_member_id: string | null
          email: string
          role: 'parent' | 'child'
          token: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          invited_by: string
          expires_at: string
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          family_id: string
          family_member_id?: string | null
          email: string
          role: 'parent' | 'child'
          token?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          invited_by: string
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          family_member_id?: string | null
          email?: string
          role?: 'parent' | 'child'
          token?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          invited_by?: string
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_family_member_id_fkey'
            columns: ['family_member_id']
            isOneToOne: false
            referencedRelation: 'family_members'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_email: {
        Args: {
          user_uuid: string
        }
        Returns: string
      }
      find_user_by_email: {
        Args: {
          user_email: string
        }
        Returns: string
      }
      accept_invitation: {
        Args: {
          invitation_token: string
        }
        Returns: string
      }
      accept_pending_invitations: {
        Args: Record<string, never>
        Returns: number
      }
      can_user_view_family: {
        Args: {
          p_family_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_user_parent_of_family: {
        Args: {
          p_family_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_user_access_list: {
        Args: {
          p_list_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_user_access_product: {
        Args: {
          p_product_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_user_access_store: {
        Args: {
          p_store_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      resolve_or_create_product: {
        Args: {
          p_family_id: string
          p_user_id: string
          p_name: string
          p_brand?: string | null
          p_format?: string | null
          p_price?: number | null
          p_upc?: string | null
        }
        Returns: string
      }
      add_shared_list_items_with_products: {
        Args: {
          p_list_id: string
          p_user_id: string
          p_lines: string[]
          p_link_products?: boolean
          p_create_if_missing?: boolean
        }
        Returns: Database['public']['Tables']['shared_list_items']['Row'][]
      }
      find_product: {
        Args: {
          p_family_id: string
          p_name: string
          p_upc?: string | null
        }
        Returns: string | null
      }
      format_product_label: {
        Args: {
          p_name: string
          p_brand?: string | null
          p_format?: string | null
        }
        Returns: string
      }
      normalize_product_upc: {
        Args: {
          p_upc: string
        }
        Returns: string
      }
    }
    Enums: {
      member_role: 'parent' | 'child'
      task_status: 'todo' | 'completed'
    }
  }
}

