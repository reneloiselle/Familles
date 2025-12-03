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
        }
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
        }
      }
      tasks: {
        Row: {
          id: string
          family_id: string
          assigned_to: string | null
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'completed'
          due_date: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          family_id: string
          assigned_to?: string | null
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          due_date?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          family_id?: string
          assigned_to?: string | null
          title?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          due_date?: string | null
          created_at?: string
          created_by?: string
        }
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
      }
      shared_list_items: {
        Row: {
          id: string
          list_id: string
          text: string
          checked: boolean
          quantity: string | null
          notes: string | null
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
          created_by?: string
          created_at?: string
          updated_at?: string
          checked_at?: string | null
          checked_by?: string | null
        }
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
    }
    Enums: {
      member_role: 'parent' | 'child'
      task_status: 'pending' | 'in_progress' | 'completed'
    }
  }
}

