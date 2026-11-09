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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      campanha_produtos: {
        Row: {
          campanha_id: string
          created_at: string
          id: string
          id_produto_mercaflow: number | null
          imagem_url: string | null
          meta: number | null
          nome: string
          ordem: number
        }
        Insert: {
          campanha_id: string
          created_at?: string
          id?: string
          id_produto_mercaflow?: number | null
          imagem_url?: string | null
          meta?: number | null
          nome: string
          ordem?: number
        }
        Update: {
          campanha_id?: string
          created_at?: string
          id?: string
          id_produto_mercaflow?: number | null
          imagem_url?: string | null
          meta?: number | null
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "campanha_produtos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          created_at: string
          id: string
          mes: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          mes?: string
          nome?: string
        }
        Relationships: []
      }
      importacoes: {
        Row: {
          arquivo: string
          created_at: string
          id: string
          linhas: number
          unidades: number
        }
        Insert: {
          arquivo: string
          created_at?: string
          id?: string
          linhas?: number
          unidades?: number
        }
        Update: {
          arquivo?: string
          created_at?: string
          id?: string
          linhas?: number
          unidades?: number
        }
        Relationships: []
      }
      metas: {
        Row: {
          mes: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          mes: string
          quantidade: number
          updated_at?: string
        }
        Update: {
          mes?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: []
      }
      metas_loja: {
        Row: {
          loja: string
          mes: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          loja: string
          mes: string
          quantidade: number
          updated_at?: string
        }
        Update: {
          loja?: string
          mes?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: []
      }
      sincronizacoes: {
        Row: {
          campanhas: string[] | null
          concluido_em: string | null
          gatilho: string
          id: string
          iniciado_em: string
          linhas: number | null
          mensagem: string | null
          origem: string
          status: string
          unidades: number | null
        }
        Insert: {
          campanhas?: string[] | null
          concluido_em?: string | null
          gatilho: string
          id?: string
          iniciado_em?: string
          linhas?: number | null
          mensagem?: string | null
          origem?: string
          status?: string
          unidades?: number | null
        }
        Update: {
          campanhas?: string[] | null
          concluido_em?: string | null
          gatilho?: string
          id?: string
          iniciado_em?: string
          linhas?: number | null
          mensagem?: string | null
          origem?: string
          status?: string
          unidades?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          created_at: string
          data: string
          id: string
          importacao_id: string | null
          loja: string
          quantidade: number
          quantidade_campanha: number
          vendedor: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          importacao_id?: string | null
          loja: string
          quantidade: number
          quantidade_campanha?: number
          vendedor: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          importacao_id?: string | null
          loja?: string
          quantidade?: number
          quantidade_campanha?: number
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_produto: {
        Row: {
          data: string
          id_produto: number
          loja: string
          produto: string
          quantidade: number
          vendedor: string
        }
        Insert: {
          data: string
          id_produto: number
          loja: string
          produto: string
          quantidade: number
          vendedor: string
        }
        Update: {
          data?: string
          id_produto?: number
          loja?: string
          produto?: string
          quantidade?: number
          vendedor?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_sincronizacao_mercaflow: {
        Args: { _linhas: Json; _periodos: Json }
        Returns: Json
      }
      aplicar_vendas_produto: {
        Args: { _linhas: Json; _periodos: Json }
        Returns: number
      }
      extrato_vendedor: {
        Args: { _mes: string; _vendedor: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      painel_dia: { Args: { _data: string }; Returns: Json }
      painel_mes: { Args: { _mes: string }; Returns: Json }
      painel_produtos: { Args: { _loja?: string; _mes: string }; Returns: Json }
      ultima_sincronizacao: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const
