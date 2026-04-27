# Guide des listes partagées

## Fonctionnalités

Le système de listes partagées permet de :

- ✅ **Créer des listes partagées** : Liste de courses, liste de tâches, etc.
- ✅ **Ajouter des éléments** : Texte, quantité, notes
- ✅ **Cocher/décocher** : Marquer les éléments comme terminés
- ✅ **Personnaliser** : Nom, description, couleur pour chaque liste
- ✅ **Partage en temps réel** : Tous les membres de la famille peuvent voir et modifier

## Utilisation

### Créer une liste

1. Allez dans **"Listes partagées"** dans le menu
2. Cliquez sur le bouton **+** à côté de "Listes partagées"
3. Remplissez le formulaire :
   - **Nom** : Nom de la liste (ex: "Liste de courses")
   - **Description** (optionnel) : Description de la liste
   - **Couleur** : Choisissez une couleur pour identifier la liste
4. Cliquez sur **"Créer"**

### Ajouter des éléments

1. Sélectionnez une liste dans la colonne de gauche
2. Cliquez sur **"Ajouter"**
3. Remplissez le formulaire :
   - **Élément** : Nom de l'élément (requis)
   - **Quantité** (optionnel) : Ex: "2 kg", "1 pack"
   - **Notes** (optionnel) : Notes supplémentaires
4. Cliquez sur **"Ajouter"**

### Cocher/décocher des éléments

- Cliquez sur le cercle à côté d'un élément pour le cocher
- Cliquez à nouveau pour le décocher
- Les éléments cochés apparaissent barrés

### Modifier une liste

1. Cliquez sur l'icône **✏️** à côté du nom de la liste
2. Modifiez les informations
3. Cliquez sur **"Modifier"**

### Supprimer

- **Supprimer une liste** : Cliquez sur l'icône **🗑️** (seulement si vous l'avez créée)
- **Supprimer un élément** : Cliquez sur le **X** à côté de l'élément

## Migration

Pour activer les listes partagées, exécutez la migration :

```sql
-- Dans Supabase SQL Editor
-- Exécutez: 009_add_shared_lists.sql
```

Cette migration crée :
- La table `shared_lists` pour les listes
- La table `shared_list_items` pour les éléments
- Les politiques RLS pour la sécurité
- Les fonctions et triggers nécessaires

## Structure

### Tables

1. **shared_lists**
   - id, family_id, name, description, color
   - created_by, created_at, updated_at

2. **shared_list_items**
   - id, list_id, text, checked
   - quantity, notes
   - created_by, checked_at, checked_by

### Sécurité

- Seuls les membres de la famille peuvent voir les listes
- Tous les membres peuvent ajouter/modifier des éléments
- Seul le créateur peut supprimer une liste
- Tous les membres peuvent supprimer des éléments

## Cas d'usage

1. **Liste de courses** : Créez une liste "Courses" et ajoutez les articles à acheter
2. **Liste de tâches ménagères** : Partagez les tâches à faire
3. **Liste de préparation** : Pour des événements ou vacances
4. **Liste de souhaits** : Pour les anniversaires, Noël, etc.

## Navigation

La section "Listes partagées" est accessible via :
- Le menu de navigation (icône 📋)
- Le dashboard principal (carte "Listes partagées")

