#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MCP_API_KEY = process.env.MCP_API_KEY; // Clé API optionnelle pour authentification par défaut

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans les variables d\'environnement');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Créer le serveur MCP
const server = new Server(
  {
    name: 'familles-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================
// Fonctions de génération et vérification des clés API
// ============================================

/**
 * Génère une nouvelle clé API
 * Format: fml_<prefix>_<random>
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Générer le préfixe (8 caractères)
  const prefix = crypto.randomBytes(6).toString('base64url').substring(0, 8);
  
  // Générer la partie aléatoire (32 caractères)
  const random = crypto.randomBytes(24).toString('base64url').substring(0, 32);
  
  // Clé complète
  const key = `fml_${prefix}_${random}`;
  
  // Hash SHA-256 pour stockage sécurisé
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  return { key, hash, prefix };
}

/**
 * Vérifie le format et calcule le hash d'une clé API
 */
function verifyApiKeyFormat(providedKey: string): string | null {
  // Vérifier le format
  if (!providedKey.startsWith('fml_') || providedKey.split('_').length !== 3) {
    return null;
  }
  
  // Calculer le hash
  const hash = crypto.createHash('sha256').update(providedKey).digest('hex');
  
  return hash;
}

/**
 * Authentifie une clé API et retourne les informations associées
 */
async function authenticateApiKey(apiKey: string): Promise<{
  isValid: boolean;
  familyId?: string;
  scope?: 'family' | 'all';
  keyId?: string;
  error?: string;
}> {
  const hash = verifyApiKeyFormat(apiKey);
  if (!hash) {
    return { isValid: false, error: 'Format de clé API invalide' };
  }
  
  // Chercher la clé dans la base de données
  const { data: keyData, error } = await supabase
    .from('mcp_api_keys')
    .select('id, family_id, scope, is_active, expires_at')
    .eq('key_hash', hash)
    .maybeSingle();
  
  if (error || !keyData) {
    return { isValid: false, error: 'Clé API non trouvée' };
  }
  
  // Vérifier si la clé est active
  if (!keyData.is_active) {
    return { isValid: false, error: 'Clé API désactivée' };
  }
  
  // Vérifier l'expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { isValid: false, error: 'Clé API expirée' };
  }
  
  // Mettre à jour last_used_at
  await supabase
    .from('mcp_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);
  
  return {
    isValid: true,
    familyId: keyData.family_id || undefined,
    scope: keyData.scope as 'family' | 'all',
    keyId: keyData.id,
  };
}

/**
 * Obtient l'utilisateur et la famille à partir d'une clé API
 */
async function getUserAndFamilyFromApiKey(
  apiKey: string,
  requestedUserId?: string
): Promise<{
  familyMember?: any;
  familyId: string;
  family?: any;
  scope: 'family' | 'all';
}> {
  const auth = await authenticateApiKey(apiKey);
  
  if (!auth.isValid) {
    throw new Error(auth.error || 'Clé API invalide ou expirée');
  }
  
  // Si scope = 'all', permettre l'accès à toutes les familles
  if (auth.scope === 'all') {
    if (!requestedUserId) {
      throw new Error('userId requis pour les clés avec scope "all"');
    }
    const result = await getUserAndFamily(requestedUserId);
    return {
      ...result,
      scope: 'all' as const,
    };
  }
  
  // Si scope = 'family', limiter à la famille de la clé
  if (auth.scope === 'family') {
    if (!auth.familyId) {
      throw new Error('familyId manquant pour la clé API');
    }
    
    const { data: family, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', auth.familyId)
      .single();
    
    if (error || !family) {
      throw new Error('Famille non trouvée');
    }
    
    // Si userId fourni, vérifier qu'il appartient à cette famille
    if (requestedUserId) {
      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .select('*, families(*)')
        .eq('user_id', requestedUserId)
        .eq('family_id', auth.familyId)
        .maybeSingle();
      
      if (memberError || !member) {
        throw new Error('Utilisateur n\'appartient pas à cette famille');
      }
      
      return {
        familyMember: member,
        familyId: auth.familyId,
        family: member.families,
        scope: 'family',
      };
    }
    
    return {
      familyId: auth.familyId,
      family,
      scope: 'family',
    };
  }
  
  throw new Error('Scope invalide');
}

// Fonction helper pour obtenir l'utilisateur et la famille (ancienne méthode, conservée pour compatibilité)
async function getUserAndFamily(userId: string): Promise<{
  familyMember: any;
  familyId: string;
  family: any;
}> {
  // Récupérer le membre de famille
  const { data: familyMember, error: memberError } = await supabase
    .from('family_members')
    .select('*, families(*)')
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError || !familyMember) {
    throw new Error(`Utilisateur non trouvé ou non membre d'une famille: ${memberError?.message || 'Aucun membre trouvé'}`);
  }

  return {
    familyMember,
    familyId: familyMember.family_id,
    family: familyMember.families,
  };
}

// Définir les outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Outils pour les tâches
    {
      name: 'get_tasks',
      description: 'Récupère les tâches d\'une famille. Peut filtrer par statut (todo, completed). Accepte une clé API optionnelle pour l\'authentification.',
      inputSchema: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Clé API pour l\'authentification (optionnel, format: fml_xxxx_xxxx)',
          },
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID, requis si pas de clé API)',
          },
          status: {
            type: 'string',
            enum: ['todo', 'completed', 'all'],
            description: 'Filtrer par statut (optionnel, par défaut: all)',
            default: 'all',
          },
        },
        required: [],
      },
    },
    {
      name: 'create_task',
      description: 'Crée une nouvelle tâche pour la famille. Accepte une clé API optionnelle pour l\'authentification.',
      inputSchema: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Clé API pour l\'authentification (optionnel, format: fml_xxxx_xxxx)',
          },
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur qui crée la tâche (UUID, requis si pas de clé API)',
          },
          title: {
            type: 'string',
            description: 'Titre de la tâche',
          },
          description: {
            type: 'string',
            description: 'Description de la tâche (optionnel)',
          },
          assignedTo: {
            type: 'string',
            description: 'ID du membre de famille à qui assigner la tâche (optionnel, UUID)',
          },
          dueDate: {
            type: 'string',
            description: 'Date d\'échéance au format YYYY-MM-DD (optionnel)',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_task_status',
      description: 'Met à jour le statut d\'une tâche',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID de la tâche (UUID)',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed'],
            description: 'Nouveau statut de la tâche',
          },
        },
        required: ['taskId', 'status'],
      },
    },
    {
      name: 'delete_task',
      description: 'Supprime une tâche',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID de la tâche à supprimer (UUID)',
          },
        },
        required: ['taskId'],
      },
    },
    // Outils pour l'agenda
    {
      name: 'get_schedules',
      description: 'Récupère les horaires/événements de l\'agenda. Peut filtrer par date ou membre de famille. Accepte une clé API optionnelle pour l\'authentification.',
      inputSchema: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Clé API pour l\'authentification (optionnel, format: fml_xxxx_xxxx)',
          },
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID, requis si pas de clé API)',
          },
          date: {
            type: 'string',
            description: 'Date au format YYYY-MM-DD pour filtrer (optionnel)',
          },
          familyMemberId: {
            type: 'string',
            description: 'ID du membre de famille pour filtrer (optionnel, UUID)',
          },
        },
        required: [],
      },
    },
    {
      name: 'create_schedule',
      description: 'Crée un nouvel événement dans l\'agenda. Accepte une clé API optionnelle pour l\'authentification.',
      inputSchema: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Clé API pour l\'authentification (optionnel, format: fml_xxxx_xxxx)',
          },
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur qui crée l\'événement (UUID, requis si pas de clé API)',
          },
          familyMemberId: {
            type: 'string',
            description: 'ID du membre de famille pour qui créer l\'événement (UUID)',
          },
          title: {
            type: 'string',
            description: 'Titre de l\'événement',
          },
          description: {
            type: 'string',
            description: 'Description de l\'événement (optionnel)',
          },
          date: {
            type: 'string',
            description: 'Date au format YYYY-MM-DD',
          },
          startTime: {
            type: 'string',
            description: 'Heure de début au format HH:MM (ex: 09:00)',
          },
          endTime: {
            type: 'string',
            description: 'Heure de fin au format HH:MM (ex: 10:00)',
          },
        },
        required: ['userId', 'familyMemberId', 'title', 'date', 'startTime', 'endTime'],
      },
    },
    {
      name: 'delete_schedule',
      description: 'Supprime un événement de l\'agenda',
      inputSchema: {
        type: 'object',
        properties: {
          scheduleId: {
            type: 'string',
            description: 'ID de l\'événement à supprimer (UUID)',
          },
        },
        required: ['scheduleId'],
      },
    },
    // Outils pour les listes partagées
    {
      name: 'get_shared_lists',
      description: 'Récupère toutes les listes partagées d\'une famille',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID)',
          },
        },
        required: ['userId'],
      },
    },
    {
      name: 'create_shared_list',
      description: 'Crée une nouvelle liste partagée',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur qui crée la liste (UUID)',
          },
          name: {
            type: 'string',
            description: 'Nom de la liste',
          },
          description: {
            type: 'string',
            description: 'Description de la liste (optionnel)',
          },
          color: {
            type: 'string',
            description: 'Couleur de la liste en hexadécimal (optionnel, par défaut: #3b82f6)',
            default: '#3b82f6',
          },
        },
        required: ['userId', 'name'],
      },
    },
    {
      name: 'get_shared_list_items',
      description: 'Récupère les éléments d\'une liste partagée',
      inputSchema: {
        type: 'object',
        properties: {
          listId: {
            type: 'string',
            description: 'ID de la liste (UUID)',
          },
        },
        required: ['listId'],
      },
    },
    {
      name: 'add_shared_list_items',
      description: 'Ajoute des éléments à une liste partagée',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur qui ajoute les éléments (UUID)',
          },
          listId: {
            type: 'string',
            description: 'ID de la liste (UUID)',
          },
          items: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Liste des textes des éléments à ajouter',
          },
        },
        required: ['userId', 'listId', 'items'],
      },
    },
    {
      name: 'toggle_shared_list_item',
      description: 'Coche ou décoche un élément de liste',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID)',
          },
          itemId: {
            type: 'string',
            description: 'ID de l\'élément (UUID)',
          },
          checked: {
            type: 'boolean',
            description: 'true pour cocher, false pour décocher',
          },
        },
        required: ['userId', 'itemId', 'checked'],
      },
    },
    {
      name: 'delete_shared_list_item',
      description: 'Supprime un élément d\'une liste partagée',
      inputSchema: {
        type: 'object',
        properties: {
          itemId: {
            type: 'string',
            description: 'ID de l\'élément à supprimer (UUID)',
          },
        },
        required: ['itemId'],
      },
    },
    {
      name: 'delete_shared_list',
      description: 'Supprime une liste partagée et tous ses éléments',
      inputSchema: {
        type: 'object',
        properties: {
          listId: {
            type: 'string',
            description: 'ID de la liste à supprimer (UUID)',
          },
        },
        required: ['listId'],
      },
    },
    // Outils pour la gestion des clés API
    {
      name: 'create_api_key',
      description: 'Crée une nouvelle clé API pour une famille ou toutes les familles',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur créateur (UUID)',
          },
          familyId: {
            type: 'string',
            description: 'ID de la famille (requis si scope=family, UUID)',
          },
          name: {
            type: 'string',
            description: 'Nom descriptif de la clé',
          },
          description: {
            type: 'string',
            description: 'Description optionnelle de la clé',
          },
          scope: {
            type: 'string',
            enum: ['family', 'all'],
            description: 'Portée de la clé: "family" pour une famille, "all" pour toutes les familles',
          },
          expiresAt: {
            type: 'string',
            description: 'Date d\'expiration au format ISO 8601 (optionnel)',
          },
        },
        required: ['userId', 'name', 'scope'],
      },
    },
    {
      name: 'list_api_keys',
      description: 'Liste les clés API d\'une famille ou de l\'utilisateur',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID)',
          },
          familyId: {
            type: 'string',
            description: 'ID de la famille pour filtrer (optionnel, UUID)',
          },
        },
        required: ['userId'],
      },
    },
    {
      name: 'revoke_api_key',
      description: 'Révoque (désactive) une clé API sans la supprimer',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID)',
          },
          keyId: {
            type: 'string',
            description: 'ID de la clé à révoquer (UUID)',
          },
        },
        required: ['userId', 'keyId'],
      },
    },
    {
      name: 'delete_api_key',
      description: 'Supprime définitivement une clé API',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID)',
          },
          keyId: {
            type: 'string',
            description: 'ID de la clé à supprimer (UUID)',
          },
        },
        required: ['userId', 'keyId'],
      },
    },
  ],
}));

// Gérer les appels d'outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Gestion des tâches
      case 'get_tasks': {
        const { apiKey, userId, status = 'all' } = args as { apiKey?: string; userId?: string; status?: string };
        
        // Authentification : clé API (paramètre ou env), ou userId
        let familyId: string;
        const effectiveApiKey = apiKey || MCP_API_KEY;
        
        if (effectiveApiKey) {
          const auth = await getUserAndFamilyFromApiKey(effectiveApiKey, userId);
          familyId = auth.familyId;
        } else if (userId) {
          const result = await getUserAndFamily(userId);
          familyId = result.familyId;
        } else {
          throw new Error('apiKey ou userId requis');
        }

        let query = supabase
          .from('tasks')
          .select('*, family_members(id, user_id, role, avatar_url)')
          .eq('family_id', familyId);

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query
          .order('due_date', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
      }

      case 'create_task': {
        const { apiKey, userId, title, description, assignedTo, dueDate } = args as {
          apiKey?: string;
          userId?: string;
          title: string;
          description?: string;
          assignedTo?: string;
          dueDate?: string;
        };
        
        // Authentification : clé API (paramètre ou env), ou userId
        let familyId: string;
        let actualUserId: string;
        const effectiveApiKey = apiKey || MCP_API_KEY;
        
        if (effectiveApiKey) {
          const auth = await getUserAndFamilyFromApiKey(effectiveApiKey, userId);
          familyId = auth.familyId;
          actualUserId = userId || auth.familyMember?.user_id || '';
          if (!actualUserId) {
            throw new Error('userId requis avec clé API pour créer une tâche');
          }
        } else if (userId) {
          const result = await getUserAndFamily(userId);
          familyId = result.familyId;
          actualUserId = userId;
        } else {
          throw new Error('apiKey ou userId requis');
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            family_id: familyId,
            title,
            description: description || null,
            assigned_to: assignedTo || null,
            due_date: dueDate || null,
            status: 'todo',
            created_by: actualUserId,
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'update_task_status': {
        const { taskId, status } = args as { taskId: string; status: string };

        const { data, error } = await supabase
          .from('tasks')
          .update({ status })
          .eq('id', taskId)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'delete_task': {
        const { taskId } = args as { taskId: string };

        const { error } = await supabase.from('tasks').delete().eq('id', taskId);

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: `Tâche ${taskId} supprimée avec succès`,
            },
          ],
        };
      }

      // Gestion de l'agenda
      case 'get_schedules': {
        const { apiKey, userId, date, familyMemberId } = args as {
          apiKey?: string;
          userId?: string;
          date?: string;
          familyMemberId?: string;
        };

        // Authentification : clé API (paramètre ou env), ou userId
        let familyId: string;
        let familyMember: any;
        const effectiveApiKey = apiKey || MCP_API_KEY;
        
        if (effectiveApiKey) {
          const auth = await getUserAndFamilyFromApiKey(effectiveApiKey, userId);
          familyId = auth.familyId;
          familyMember = auth.familyMember;
        } else if (userId) {
          const result = await getUserAndFamily(userId);
          familyId = result.familyId;
          familyMember = result.familyMember;
        } else {
          throw new Error('apiKey ou userId requis');
        }

        // Récupérer tous les membres de la famille
        const { data: members, error: membersError } = await supabase
          .from('family_members')
          .select('id')
          .eq('family_id', familyId);

        if (membersError) throw membersError;

        const memberIds = familyMemberId
          ? [familyMemberId]
          : members?.map((m) => m.id) || [];

        if (memberIds.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify([], null, 2),
              },
            ],
          };
        }

        let query = supabase
          .from('schedules')
          .select('*, family_members(id, user_id, role, email, name, avatar_url)')
          .in('family_member_id', memberIds);

        if (date) {
          query = query.eq('date', date);
        }

        const { data, error } = await query
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
      }

      case 'create_schedule': {
        const { apiKey, userId, familyMemberId, title, description, date, startTime, endTime } = args as {
          apiKey?: string;
          userId?: string;
          familyMemberId: string;
          title: string;
          description?: string;
          date: string;
          startTime: string;
          endTime: string;
        };

        // Authentification : clé API (paramètre ou env), ou userId
        const effectiveApiKey = apiKey || MCP_API_KEY;
        if (!effectiveApiKey && !userId) {
          throw new Error('apiKey ou userId requis');
        }

        const { data, error } = await supabase
          .from('schedules')
          .insert({
            family_member_id: familyMemberId,
            title,
            description: description || null,
            date,
            start_time: startTime,
            end_time: endTime,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'delete_schedule': {
        const { scheduleId } = args as { scheduleId: string };

        const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: `Événement ${scheduleId} supprimé avec succès`,
            },
          ],
        };
      }

      // Gestion des listes partagées
      case 'get_shared_lists': {
        const { userId } = args as { userId: string };
        const { familyId } = await getUserAndFamily(userId);

        const { data, error } = await supabase
          .from('shared_lists')
          .select('*')
          .eq('family_id', familyId)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
      }

      case 'create_shared_list': {
        const { userId, name, description, color = '#3b82f6' } = args as {
          userId: string;
          name: string;
          description?: string;
          color?: string;
        };
        const { familyId } = await getUserAndFamily(userId);

        const { data, error } = await supabase
          .from('shared_lists')
          .insert({
            family_id: familyId,
            name,
            description: description || null,
            color,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'get_shared_list_items': {
        const { listId } = args as { listId: string };

        const { data, error } = await supabase
          .from('shared_list_items')
          .select('*')
          .eq('list_id', listId)
          .order('checked', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
      }

      case 'add_shared_list_items': {
        const { userId, listId, items } = args as {
          userId: string;
          listId: string;
          items: string[];
        };

        const itemsToInsert = items.map((text) => ({
          list_id: listId,
          text: text.trim(),
          created_by: userId,
        }));

        const { data, error } = await supabase
          .from('shared_list_items')
          .insert(itemsToInsert)
          .select();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
      }

      case 'toggle_shared_list_item': {
        const { userId, itemId, checked } = args as {
          userId: string;
          itemId: string;
          checked: boolean;
        };

        const updates: any = {
          checked,
        };

        if (checked) {
          updates.checked_at = new Date().toISOString();
          updates.checked_by = userId;
        } else {
          updates.checked_at = null;
          updates.checked_by = null;
        }

        const { data, error } = await supabase
          .from('shared_list_items')
          .update(updates)
          .eq('id', itemId)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'delete_shared_list_item': {
        const { itemId } = args as { itemId: string };

        const { error } = await supabase
          .from('shared_list_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: `Élément ${itemId} supprimé avec succès`,
            },
          ],
        };
      }

      case 'delete_shared_list': {
        const { listId } = args as { listId: string };

        const { error } = await supabase.from('shared_lists').delete().eq('id', listId);

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: `Liste ${listId} supprimée avec succès`,
            },
          ],
        };
      }

      // Gestion des clés API
      case 'create_api_key': {
        const { userId, familyId, name, description, scope, expiresAt } = args as {
          userId: string;
          familyId?: string;
          name: string;
          description?: string;
          scope: 'family' | 'all';
          expiresAt?: string;
        };

        // Vérifier les permissions
        if (scope === 'family' && !familyId) {
          throw new Error('familyId requis pour scope "family"');
        }

        if (scope === 'family') {
          // Vérifier que l'utilisateur est parent de la famille
          const { data: member, error: memberError } = await supabase
            .from('family_members')
            .select('role')
            .eq('user_id', userId)
            .eq('family_id', familyId)
            .maybeSingle();

          if (memberError || !member || member.role !== 'parent') {
            throw new Error('Seuls les parents peuvent créer des clés API pour leur famille');
          }
        }

        // Générer la clé
        const { key, hash, prefix } = generateApiKey();

        // Insérer dans la base de données
        const { data, error } = await supabase
          .from('mcp_api_keys')
          .insert({
            family_id: scope === 'family' ? familyId : null,
            key_hash: hash,
            key_prefix: prefix,
            name,
            description: description || null,
            scope,
            expires_at: expiresAt || null,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        // Retourner la clé (seule fois où elle est visible)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: data.id,
                key: key, // ⚠️ À afficher une seule fois
                name: data.name,
                scope: data.scope,
                familyId: data.family_id,
                expiresAt: data.expires_at,
                createdAt: data.created_at,
                warning: '⚠️ IMPORTANT: Sauvegardez cette clé maintenant. Elle ne sera plus visible après.',
              }, null, 2),
            },
          ],
        };
      }

      case 'list_api_keys': {
        const { userId, familyId } = args as { userId: string; familyId?: string };

        let query = supabase
          .from('mcp_api_keys')
          .select('id, key_prefix, name, description, scope, is_active, last_used_at, expires_at, created_at, family_id')
          .eq('created_by', userId);

        if (familyId) {
          query = query.eq('family_id', familyId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Masquer les clés complètes, afficher seulement le préfixe
        const safeData = (data || []).map((key: any) => ({
          id: key.id,
          keyPrefix: key.key_prefix,
          maskedKey: `fml_${key.key_prefix}_****`, // Masquer la partie aléatoire
          name: key.name,
          description: key.description,
          scope: key.scope,
          isActive: key.is_active,
          lastUsedAt: key.last_used_at,
          expiresAt: key.expires_at,
          createdAt: key.created_at,
          familyId: key.family_id,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(safeData, null, 2),
            },
          ],
        };
      }

      case 'revoke_api_key': {
        const { userId, keyId } = args as { userId: string; keyId: string };

        // Vérifier que l'utilisateur est le créateur
        const { data: key, error: keyError } = await supabase
          .from('mcp_api_keys')
          .select('created_by')
          .eq('id', keyId)
          .maybeSingle();

        if (keyError || !key) {
          throw new Error('Clé API non trouvée');
        }

        if (key.created_by !== userId) {
          throw new Error('Vous n\'êtes pas autorisé à révoquer cette clé');
        }

        // Désactiver la clé
        const { data, error } = await supabase
          .from('mcp_api_keys')
          .update({ is_active: false })
          .eq('id', keyId)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Clé API révoquée avec succès',
                key: {
                  id: data.id,
                  name: data.name,
                  isActive: data.is_active,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'delete_api_key': {
        const { userId, keyId } = args as { userId: string; keyId: string };

        // Vérifier que l'utilisateur est le créateur
        const { data: key, error: keyError } = await supabase
          .from('mcp_api_keys')
          .select('created_by, name')
          .eq('id', keyId)
          .maybeSingle();

        if (keyError || !key) {
          throw new Error('Clé API non trouvée');
        }

        if (key.created_by !== userId) {
          throw new Error('Vous n\'êtes pas autorisé à supprimer cette clé');
        }

        // Supprimer la clé
        const { error } = await supabase
          .from('mcp_api_keys')
          .delete()
          .eq('id', keyId);

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Clé API "${key.name}" supprimée définitivement`,
                keyId,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Outil inconnu: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Erreur: ${error.message || String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Gérer les ressources (optionnel, pour l'instant vide)
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [],
}));

server.setRequestHandler(ReadResourceRequestSchema, async () => {
  throw new Error('Aucune ressource disponible');
});

// Démarrer le serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Serveur MCP Familles démarré');
}

main().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

