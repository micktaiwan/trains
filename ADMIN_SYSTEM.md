# Admin System - Quick Reference

## 🔑 Access

- **URL**: `/admin`
- **First user created** automatically becomes admin
- **Promotion**: Existing admins can promote other users

## 📋 Features

### Dashboard
- Real-time statistics (users, games, teams, objects, chat)
- Recent admin actions history
- Auto-refresh every 30 seconds

### User Management
- List all users with status (online/offline)
- Promote/demote admin role
- Reset passwords
- Delete users
- **Protection**: Cannot modify your own account

### Game Management
- List games with statistics (players, teams, objects)
- View game (opens in new tab)
- Edit game name and clock
- Delete game (cascades to objects, teams, chats)

### Chat Moderation
- View all chat messages (lobby + games)
- Filter by limit (50/100/200/500)
- Delete messages

### Activity Logs
- Tracks all admin actions
- Displays: who, what, when, details

## 🔒 Security

- All methods verify `await Helpers.requireAdmin(userId)`
- Publications return empty for non-admins
- Route guard on `/admin`
- Cannot modify own admin account
- All actions logged to `AdminLogs` collection

## 📊 Collections

### AdminLogs
```javascript
{
  action: String,         // delete_user, toggle_admin, etc.
  adminId: String,
  targetUserId: String,
  targetUsername: String,
  timestamp: Date,
  details: Object/String
}
```

### Users (field added)
```javascript
{
  roles: [String]  // ['admin'] or ['user']
}
```

## 🔧 Available Methods

**Users**: `adminGetUsers()`, `adminDeleteUser(userId)`, `adminToggleAdmin(userId)`, `adminResetPassword(userId, newPassword)`

**Games**: `adminGetAllGames()`, `adminDeleteGame(gameId)`, `adminUpdateGame(gameId, updates)`

**Chat**: `adminGetAllChats(limit)`, `adminDeleteChat(chatId)`

**Stats**: `adminGetStats()`, `adminGetLogs(limit)`

## 🎨 UI

- Semantic UI / Fomantic UI styling
- Tab-based navigation
- Confirmation modals for destructive actions
- Responsive tables with inline actions

## 📝 Files

**Server**: `server/adminHooks.js`, `server/publishAdmin.js`, `lib/methods/methodsAdmin.js`

**Client**: `client/ui/admin/*.{html,js,less}`

**Shared**: `lib/collections.js` (AdminLogs), `lib/router.js` (/admin route), `classes/helpers.js` (isAdmin/requireAdmin)
