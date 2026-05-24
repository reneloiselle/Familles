# mcp-server — instructions agents

Serveur **Model Context Protocol** (Node.js, **stdio**) exposant tâches, agenda et listes Familles via **Supabase** (service role).

## Commandes

```bash
cd mcp-server
npm install
cp env.example .env    # puis éditer .env (ne pas commiter)
npm run build
npm start              # ou script défini dans package.json
```

## Configuration

| Variable | Rôle |
|----------|------|
| `SUPABASE_URL` | URL projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès serveur (secret) |
| `MCP_API_KEY` | Optionnel — clé `fml_…` par défaut pour les outils |

Voir `README.md` pour la config Cursor et la migration des clés API (`FamilleWeb`).

## Code

- Point d’entrée : `src/index.ts` (outils MCP, auth par `apiKey` ou `userId`).
- Build : sortie compilée selon `tsconfig` / scripts npm du package.

## Sécurité

- `SUPABASE_SERVICE_ROLE_KEY` : **jamais** dans le client web/mobile ni dans un repo public.
- Les outils MCP doivent respecter le **scope famille** des clés API (`MCP_API_KEY` / `apiKey` passé par l’outil).
- Ne pas logger les clés en clair.

## Schéma données

Tables principales : `tasks`, `schedules`, `shared_lists`, `family_members`, etc. — alignées sur les migrations `FamilleWeb/supabase/migrations/`.

En cas de changement de schéma : mettre à jour le serveur MCP et la route `FamilleWeb/app/api/mcp/` si la gestion des clés est impactée.

## À éviter

- Exposer de nouveaux outils MCP sans contrôle d’accès (famille / utilisateur).
- Contourner RLS en exposant des données d’une autre famille via une requête mal filtrée.
