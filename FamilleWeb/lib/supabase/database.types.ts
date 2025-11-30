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
          user_id: string
          role: 'parent' | 'child'
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id: string
          role: 'parent' | 'child'
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string
          role?: 'parent' | 'child'
          created_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      member_role: 'parent' | 'child'
      task_status: 'pending' | 'in_progress' | 'completed'
    }
  }
}

