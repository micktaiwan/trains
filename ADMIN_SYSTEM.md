# Backend d'Administration - Documentation

## 🎯 Vue d'ensemble

Le système d'administration complet a été implémenté pour le jeu Trains. Il permet de gérer les utilisateurs, les jeux, modérer le chat et surveiller le système en temps réel.

## 🔑 Accès

- **URL**: `/admin`
- **Attribution du rôle admin**: Le **premier utilisateur créé** devient automatiquement administrateur
- **Protection**: Routes et méthodes protégées côté serveur

## 📋 Fonctionnalités

### 1. Dashboard (Tableau de bord)
- Statistiques en temps réel:
  - Nombre total d'utilisateurs
  - Utilisateurs en ligne
  - Nombre de jeux (total et actifs)
  - Objets sur la carte
  - Équipes et messages chat
- Historique des actions administratives récentes
- Auto-refresh toutes les 30 secondes

### 2. Gestion des Utilisateurs
- Liste complète de tous les utilisateurs
- Informations affichées:
  - Username et email
  - Rôle (Admin/User)
  - Statut (Online/Offline)
  - Dernière connexion
- Actions disponibles:
  - ✅ Promouvoir/Rétrograder admin
  - 🔑 Réinitialiser le mot de passe
  - 🗑️ Supprimer un utilisateur
- Protection: Impossible de modifier son propre compte

### 3. Gestion des Jeux
- Liste de tous les jeux avec statistiques:
  - Nombre de joueurs
  - Nombre d'équipes
  - Nombre d'objets
  - Horloge du jeu
- Actions:
  - 👁️ Voir le jeu (ouvre dans un nouvel onglet)
  - ✏️ Éditer (nom et horloge)
  - 🗑️ Supprimer (supprime aussi objets, équipes et chats associés)

### 4. Modération du Chat
- Historique complet de tous les messages
- Filtres par limite (50/100/200/500 messages)
- Distinction Lobby / Game chat
- Action: Supprimer un message
- Auto-refresh toutes les 30 secondes

### 5. Journal d'Activité (Admin Logs)
- Trace toutes les actions administratives:
  - Suppression d'utilisateurs
  - Changement de rôles
  - Réinitialisation de mots de passe
  - Modifications/suppressions de jeux
  - Suppressions de messages chat
  - Attribution automatique du premier admin
- Affichage avec icônes colorées et détails

## 🗂️ Architecture

### Fichiers créés

#### Backend (Server)
- `server/adminHooks.js` - Hook pour attribution auto du rôle admin
- `server/publishAdmin.js` - Publications réactives pour l'admin
- `lib/methods/methodsAdmin.js` - Méthodes Meteor protégées

#### Frontend (Client)
- `client/ui/admin/admin.html` - Template principal avec navigation par onglets
- `client/ui/admin/admin.js` - Contrôleur principal
- `client/ui/admin/admin.less` - Styles LESS
- `client/ui/admin/adminDashboard.html` + `.js` - Dashboard
- `client/ui/admin/adminUsers.html` + `.js` - Gestion users
- `client/ui/admin/adminGames.html` + `.js` - Gestion jeux
- `client/ui/admin/adminChat.html` + `.js` - Modération chat
- `client/ui/admin/adminLogs.html` + `.js` - Journal d'activité

#### Shared
- `lib/collections.js` - Collection AdminLogs ajoutée
- `lib/router.js` - Route `/admin` avec guard
- `classes/helpers.js` - Méthodes `isAdmin()` et `requireAdmin()`

#### Modifications
- `client/ui/lobby/lobby.html` - Lien "Admin" dans le menu
- `client/ui/lobby/lobby.js` - Helper `isAdmin()`

## 🔒 Sécurité

### Vérifications côté serveur
- Toutes les méthodes admin vérifient `await Helpers.requireAdmin(userId)`
- Les publications retournent vide si l'utilisateur n'est pas admin
- Protection contre la modification de son propre compte admin

### Vérifications côté client
- Route `/admin` vérifie le rôle et affiche "Access Denied" si non-admin
- Lien "Admin" visible uniquement pour les admins dans le lobby

### Logging
- Toutes les actions sont tracées dans la collection `AdminLogs`
- Détails conservés: qui, quoi, quand, détails de l'action

## 🎨 Interface Utilisateur

- Design utilisant **Fomantic-UI** (déjà en place via CDN)
- Style cohérent avec le reste de l'application
- Navigation par onglets pour organiser les fonctionnalités
- Modales de confirmation pour les actions destructives
- Tables responsives avec actions en ligne
- Icônes et couleurs sémantiques

## 🚀 Utilisation

### Pour devenir admin
1. Créer le **premier compte utilisateur** → devient automatiquement admin
2. OU être promu par un admin existant via l'interface

### Pour accéder au panel
1. Se connecter avec un compte admin
2. Cliquer sur "Admin" dans le menu du lobby
3. OU naviguer directement vers `/admin`

### Navigation
- Utiliser les onglets pour basculer entre les sections
- Les données se rafraîchissent automatiquement (réactivité Meteor)
- Boutons "Refresh" disponibles pour forcer une mise à jour

## 📊 Collections MongoDB

### AdminLogs
```javascript
{
  action: String,           // Type d'action (delete_user, toggle_admin, etc.)
  adminId: String,          // ID de l'admin qui a fait l'action
  targetUserId: String,     // ID de l'utilisateur cible (optionnel)
  targetUsername: String,   // Username cible (optionnel)
  timestamp: Date,          // Date/heure de l'action
  details: Object/String    // Détails supplémentaires de l'action
}
```

### Users (champ ajouté)
```javascript
{
  roles: [String]  // ['admin'] ou ['user']
}
```

## 🔧 Méthodes Meteor disponibles

### Gestion utilisateurs
- `adminGetUsers()` - Liste tous les utilisateurs
- `adminDeleteUser(userId)` - Supprime un utilisateur
- `adminToggleAdmin(userId)` - Change le rôle admin/user
- `adminResetPassword(userId, newPassword)` - Réinitialise le mot de passe

### Gestion jeux
- `adminGetAllGames()` - Liste tous les jeux avec stats
- `adminDeleteGame(gameId)` - Supprime un jeu
- `adminUpdateGame(gameId, updates)` - Modifie un jeu

### Modération chat
- `adminGetAllChats(limit)` - Récupère les messages chat
- `adminDeleteChat(chatId)` - Supprime un message

### Statistiques
- `adminGetStats()` - Statistiques système complètes
- `adminGetLogs(limit)` - Récupère les logs admin

## ✅ Tests recommandés

1. Créer le premier utilisateur et vérifier le rôle admin
2. Créer un second utilisateur (devrait être "user")
3. Promouvoir le second utilisateur en admin
4. Tester toutes les actions de gestion (users, games, chat)
5. Vérifier que les logs sont correctement enregistrés
6. Tester l'accès avec un compte non-admin (devrait être refusé)
7. Vérifier la réactivité des données (changements en temps réel)

## 🐛 Débogage

Si le système ne fonctionne pas:
1. Vérifier la console serveur pour les erreurs
2. Vérifier que les publications sont actives
3. Utiliser la console browser pour voir les erreurs client
4. Vérifier que le premier utilisateur a bien `roles: ['admin']`
5. Tester les méthodes Meteor manuellement dans la console

## 📝 Notes importantes

- Le système est compatible **Meteor 3** avec async/await
- Utilise **Fomantic-UI** via CDN (pas de problème de build)
- Toutes les actions destructives demandent confirmation
- Les données sensibles ne sont pas exposées (pas de mots de passe)
- Le système est extensible (facile d'ajouter de nouvelles fonctionnalités)
