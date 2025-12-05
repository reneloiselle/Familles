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

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Fonction helper pour obtenir l'utilisateur et la famille
async function getUserAndFamily(userId: string) {
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
      description: 'Récupère les tâches d\'une famille. Peut filtrer par statut (pending, in_progress, completed)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID)',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'all'],
            description: 'Filtrer par statut (optionnel, par défaut: all)',
            default: 'all',
          },
        },
        required: ['userId'],
      },
    },
    {
      name: 'create_task',
      description: 'Crée une nouvelle tâche pour la famille',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur qui crée la tâche (UUID)',
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
        required: ['userId', 'title'],
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
      description: 'Récupère les horaires/événements de l\'agenda. Peut filtrer par date ou membre de famille',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (UUID)',
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
        required: ['userId'],
      },
    },
    {
      name: 'create_schedule',
      description: 'Crée un nouvel événement dans l\'agenda',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur qui crée l\'événement (UUID)',
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
  ],
}));

// Gérer les appels d'outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Gestion des tâches
      case 'get_tasks': {
        const { userId, status = 'all' } = args as { userId: string; status?: string };
        const { familyId } = await getUserAndFamily(userId);

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
        const { userId, title, description, assignedTo, dueDate } = args as {
          userId: string;
          title: string;
          description?: string;
          assignedTo?: string;
          dueDate?: string;
        };
        const { familyId } = await getUserAndFamily(userId);

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            family_id: familyId,
            title,
            description: description || null,
            assigned_to: assignedTo || null,
            due_date: dueDate || null,
            status: 'pending',
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
        const { userId, date, familyMemberId } = args as {
          userId: string;
          date?: string;
          familyMemberId?: string;
        };

        const { familyMember } = await getUserAndFamily(userId);
        const familyId = familyMember.family_id;

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
        const { userId, familyMemberId, title, description, date, startTime, endTime } = args as {
          userId: string;
          familyMemberId: string;
          title: string;
          description?: string;
          date: string;
          startTime: string;
          endTime: string;
        };

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

