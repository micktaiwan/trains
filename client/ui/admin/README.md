# Admin Panel

## Overview

Administrative interface for managing users, games, and chat moderation. Accessible at `/admin` (requires admin role).

## Features

### Dashboard (`adminDashboard.html`)
- Real-time statistics (users, games, map objects, teams, chats)
- Recent admin activity logs
- Auto-refresh every 30 seconds

### User Management (`adminUsers.html`)
- View all users with online status
- Reset user passwords
- Toggle admin role (cannot modify own role)
- Delete users (removes from teams/games)

### Game Management (`adminGames.html`)
- View all games with player/team/object counts
- Edit game properties (name, clock)
- Delete games (cascades to map objects, teams, chats)
- Direct links to view games

### Chat Moderation (`adminChat.html`)
- View recent chat messages (lobby and in-game)
- Filter by limit (50/100/200/500 messages)
- Delete inappropriate messages
- Auto-refresh every 30 seconds

### Activity Logs (`adminLogs.html`)
- Audit trail of all admin actions
- Timestamps, action types, affected entities
- Filterable history

## File Structure

```
/client/ui/admin/
  admin.html           → Main layout with tabs
  admin.js             → Tab initialization, dashboard logic
  adminGames.html/.js  → Game management
  adminUsers.html/.js  → User management
  adminChat.html/.js   → Chat moderation
  adminLogs.html/.js   → Activity logs
```

## Server Methods

All admin methods in `lib/methods/methodsAdmin.js`:
- `adminGetUsers()` - List all users
- `adminDeleteUser(userId)` - Delete user
- `adminToggleAdmin(userId)` - Toggle admin role
- `adminResetPassword(userId, password)` - Reset password
- `adminGetAllGames()` - List games with stats
- `adminDeleteGame(gameId)` - Delete game cascade
- `adminUpdateGame(gameId, updates)` - Edit game
- `adminGetAllChats(limit)` - Get chat messages
- `adminDeleteChat(chatId)` - Delete message
- `adminGetStats()` - Dashboard statistics
- `adminGetLogs(limit)` - Activity logs

## Technical Notes

For Semantic UI + Blaze integration patterns (modal handling, event delegation), see the main **[CLAUDE.md](../../../CLAUDE.md)** documentation.
