# Implementation Plan: TalkSpace Feature Expansion

## Overview

This plan implements 14 major feature expansions to TalkSpace: group chats, contact sync, read receipts UI, status updates, comprehensive settings, privacy controls, chat management (pin/archive/mute), message search, message editing, pinned group messages, enhanced emoji/stickers, and chat customization. The implementation follows a dependency-based ordering: database models → backend APIs → middleware → Socket.IO events → frontend state management → UI components → testing.

## Tasks

- [ ] 1. Set up database models and migrations
  - [-] 1.1 Create GroupChat model with message sub-schema
    - Create `backend/src/models/groupChat.model.ts`
    - Define IGroupMessage interface with editing fields and reactions
    - Define IGroupChat interface with members, admins, and pinnedMessages
    - Add indexes for members and message queries
    - _Requirements: 1.2, 2.1, 14.1, 15.1_

  - [-] 1.2 Create StatusUpdate model with TTL index
    - Create `backend/src/models/statusUpdate.model.ts`
    - Define IStatusUpdate interface with privacy fields
    - Add TTL index on expiryTime for auto-deletion
    - Add compound indexes for user and friend queries
    - _Requirements: 6.1, 7.1_

  - [-] 1.3 Create PrivacySettings model
    - Create `backend/src/models/privacySettings.model.ts`
    - Define IPrivacySettings interface with visibility enums
    - Add unique index on userId
    - Set default values for all privacy fields
    - _Requirements: 9.1_

  - [-] 1.4 Create UserSettings model with chat customization
    - Create `backend/src/models/userSettings.model.ts`
    - Define IUserSettings interface with all setting categories
    - Define IChatCustomization sub-interface for wallpapers and themes
    - Add unique index on userId
    - _Requirements: 8.11, 17.1, 17.5_

  - [ ] 1.5 Create StickerPack model
    - Create `backend/src/models/stickerPack.model.ts`
    - Define IStickerPack and ISticker interfaces
    - Add fields for pack metadata and sticker array
    - _Requirements: 16.7_

  - [~] 1.6 Extend User model with chat management fields
    - Add pinnedChats array to User model (chatId, chatType, pinnedAt)
    - Add archivedChats array to User model (chatId, chatType, archivedAt)
    - Add mutedChats array to User model (chatId, chatType, muteUntil)
    - Add recentEmojis array for emoji picker
    - Add indexes for chat management queries
    - _Requirements: 10.1, 11.1, 12.1, 16.5_

  - [~] 1.7 Extend Message model with editing fields
    - Add isEdited boolean field
    - Add editedAt timestamp field
    - Add editHistory array (originalText, editedAt)
    - Add text index for message search
    - _Requirements: 14.1, 13.2_

- [~] 2. Checkpoint - Verify database models compile
  - Ensure all models compile without errors
  - Verify all TypeScript interfaces are correctly defined
  - Ask the user if questions arise

- [ ] 3. Implement backend utility functions and middleware
  - [~] 3.1 Create privacy filter utility
    - Create `backend/src/utils/privacyFilter.ts`
    - Implement shouldHide() function for visibility logic
    - Implement applyPrivacyFilters() for user sanitization
    - Implement canViewStatus() for status privacy checking
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

  - [~] 3.2 Create group permission middleware
    - Create `backend/src/middlewares/groupPermission.middleware.ts`
    - Implement groupPermissionMiddleware to verify membership
    - Implement requireGroupAdmin middleware for admin-only actions
    - Attach group and isAdmin to request object
    - _Requirements: 1.3, 3.2_

  - [~] 3.3 Create rate limiters for new features
    - Extend `backend/src/middlewares/rateLimiter.ts`
    - Add contactSyncLimiter (3 requests per hour)
    - Add statusRateLimiter (10 statuses per hour)
    - Add groupCreationLimiter (5 groups per day)
    - _Requirements: 4.7, 6.2_

  - [~] 3.4 Create contact hashing utility
    - Create `backend/src/utils/contactSync.ts`
    - Implement hashContact() using SHA-256
    - Implement matchHashedContacts() for batch matching
    - _Requirements: 4.3, 4.4_

  - [~] 3.5 Create serialization utilities for property testing
    - Create `backend/src/utils/serialization.ts`
    - Implement serializeGroupChat() and parseGroupChat()
    - Implement serializePrivacySettings() and parsePrivacySettings()
    - Implement serializeStatusUpdate() and parseStatusUpdate()
    - Add validation logic with descriptive error messages
    - _Requirements: 18.1, 18.2, 18.3, 19.1, 19.2, 19.3, 20.1, 20.2, 20.3_

- [ ] 4. Implement Group Chat backend APIs
  - [~] 4.1 Create group controller with CRUD operations
    - Create `backend/src/controllers/groups/group.controller.ts`
    - Implement createGroup() - validate members are friends, set creator as admin
    - Implement getMyGroups() - return user's groups sorted by last message
    - Implement getGroupDetails() - return full group info with members
    - Implement updateGroup() - allow admins to update name, avatar, description
    - Implement leaveGroup() - handle admin promotion if last admin leaves
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 3.1, 3.3_

  - [~] 4.2 Implement group member management
    - Implement addMember() in group controller - verify friendship, notify all
    - Implement removeMember() - enforce admin-only, notify all members
    - Implement promoteToAdmin() - enforce admin-only
    - Implement demoteAdmin() - verify at least one admin remains
    - _Requirements: 1.4, 1.5, 3.4, 3.5_

  - [~] 4.3 Implement group messaging APIs
    - Implement sendGroupMessage() - validate membership, persist to messages array
    - Implement getGroupMessages() with pagination (20 messages per page)
    - Implement deleteGroupMessage() - mark as deleted, validate sender
    - Implement editGroupMessage() - validate sender, 15-minute window, add to history
    - Implement reactToGroupMessage() - add/remove reactions
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 14.2, 14.3, 14.4_

  - [~] 4.4 Implement pinned message APIs
    - Implement pinMessage() - enforce admin-only, max 3 pins
    - Implement unpinMessage() - enforce admin-only
    - Implement getPinnedMessages() - return pinned messages with metadata
    - _Requirements: 15.2, 15.3, 15.4, 15.5_

  - [~] 4.5 Create group routes and wire to app
    - Create `backend/src/routes/groupRoute.ts`
    - Define all group routes with appropriate middleware
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 1.1, 1.4, 2.1, 3.1, 15.2_

- [ ] 5. Implement Status Update backend APIs
  - [~] 5.1 Create status controller with CRUD operations
    - Create `backend/src/controllers/status/status.controller.ts`
    - Implement createStatus() - upload media to Cloudinary, set 24h expiry
    - Implement getFriendsStatuses() - filter by privacy settings, return active statuses
    - Implement getMyStatuses() - return user's own statuses with viewer lists
    - Implement getStatusById() - verify visibility permissions
    - Implement markStatusViewed() - add viewer to viewerList
    - Implement deleteStatus() - verify ownership
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [~] 5.2 Create status routes and wire to app
    - Create `backend/src/routes/statusRoute.ts`
    - Define all status routes with statusRateLimiter
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 6.1, 6.5, 6.12_

- [ ] 6. Implement Privacy Settings backend APIs
  - [~] 6.1 Create privacy controller with CRUD operations
    - Create `backend/src/controllers/settings/privacy.controller.ts`
    - Implement getPrivacySettings() - create default if not exists
    - Implement updatePrivacySettings() - validate enum values
    - Implement blockUser() - add to User.blockedUsers array
    - Implement unblockUser() - remove from blockedUsers
    - Implement getBlockedUsers() - return list of blocked users
    - _Requirements: 9.1, 9.2, 9.10, 9.11_

  - [~] 6.2 Create privacy routes and wire to app
    - Create `backend/src/routes/privacyRoute.ts`
    - Define all privacy routes
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 9.11, 9.12_

  - [~] 6.3 Integrate privacy filters in existing user endpoints
    - Update user profile endpoint to apply privacy filters
    - Update friends list endpoint to apply filters
    - Use applyPrivacyFilters() utility in all user responses
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 7. Implement User Settings backend APIs
  - [~] 7.1 Create settings controller with CRUD operations
    - Create `backend/src/controllers/settings/settings.controller.ts`
    - Implement getUserSettings() - create default if not exists
    - Implement updateUserSettings() - validate and persist changes
    - Implement setChatWallpaper() - upload custom wallpaper to Cloudinary
    - Implement setChatTheme() - validate color values
    - Implement clearMediaCache() - update mediaCacheSize to 0
    - _Requirements: 8.11, 8.12, 17.2, 17.3, 17.4, 17.5_

  - [~] 7.2 Create settings routes and wire to app
    - Create `backend/src/routes/settingsRoute.ts`
    - Define all settings routes
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 8.1, 8.11_

- [ ] 8. Implement Contact Sync backend APIs
  - [~] 8.1 Create contact controller with sync logic
    - Create `backend/src/controllers/contacts/contact.controller.ts`
    - Implement syncContacts() - hash incoming contacts, match against User records
    - Return only matched users (never store raw contact data)
    - Apply contactSyncLimiter rate limiting
    - _Requirements: 4.3, 4.4, 4.5, 4.7, 4.8_

  - [~] 8.2 Create contact routes and wire to app
    - Create `backend/src/routes/contactRoute.ts`
    - Define contact sync route with rate limiter
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 4.1, 4.7_

- [ ] 9. Implement Chat Management backend APIs
  - [~] 9.1 Create chat management controller
    - Create `backend/src/controllers/chatManagement/chatManagement.controller.ts`
    - Implement pinChat() - add to User.pinnedChats, enforce 3-pin limit
    - Implement unpinChat() - remove from pinnedChats
    - Implement archiveChat() - add to archivedChats
    - Implement unarchiveChat() - remove from archivedChats
    - Implement getArchivedChats() - return archived conversations
    - Implement muteChat() - add to mutedChats with duration
    - Implement unmuteChat() - remove from mutedChats
    - _Requirements: 10.2, 10.3, 10.4, 11.2, 11.3, 11.5, 12.2, 12.3, 12.4_

  - [~] 9.2 Create chat management routes and wire to app
    - Create `backend/src/routes/chatManagementRoute.ts`
    - Define all chat management routes
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 10.8, 11.7, 12.7_

  - [~] 9.3 Integrate chat management in chat list endpoint
    - Update chat list endpoint to exclude archived chats
    - Sort pinned chats to top by pin timestamp
    - Filter muted chats from notification logic
    - _Requirements: 10.6, 11.4, 12.5_

- [ ] 10. Implement Message Search backend APIs
  - [~] 10.1 Create search controller with text search
    - Create `backend/src/controllers/search/search.controller.ts`
    - Implement searchMessages() for direct messages - use MongoDB text index
    - Implement searchGroupMessages() for group chats
    - Return results with context (1 message before/after)
    - Enforce authentication and chat membership
    - Add pagination support (limit 50 results per page)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [~] 10.2 Create search routes and wire to app
    - Create `backend/src/routes/searchRoute.ts`
    - Define search routes
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 13.1, 13.5_

- [ ] 11. Implement Message Editing backend APIs
  - [~] 11.1 Extend message controller with editing
    - Update `backend/src/controllers/messages/chat.controller.ts`
    - Implement editMessage() - verify sender, 15-minute window, add to editHistory
    - Implement getEditHistory() - return edit history for message
    - _Requirements: 14.2, 14.3, 14.4, 14.5_

  - [~] 11.2 Add message editing routes
    - Update `backend/src/routes/messageRoute.ts`
    - Add PATCH /:messageId/edit route
    - Add GET /:messageId/history route
    - _Requirements: 14.8, 14.10_

- [ ] 12. Implement Sticker backend APIs
  - [~] 12.1 Create sticker controller and seed data
    - Create `backend/src/controllers/stickers/sticker.controller.ts`
    - Implement getStickerPacks() - return all available packs
    - Implement getStickerPackById() - return single pack with all stickers
    - Create seed script to populate initial sticker packs
    - _Requirements: 16.7, 16.8_

  - [~] 12.2 Create sticker routes and wire to app
    - Create `backend/src/routes/stickerRoute.ts`
    - Define sticker routes
    - Import and mount routes in `backend/src/app.ts`
    - _Requirements: 16.6, 16.7_

- [~] 13. Checkpoint - Test all backend APIs
  - Verify all routes are registered correctly
  - Test authentication middleware on protected routes
  - Test each endpoint with Postman or similar
  - Ask the user if questions arise

- [ ] 14. Extend Socket.IO event handlers
  - [~] 14.1 Add group chat Socket.IO events
    - Update `backend/src/socket.ts`
    - Add "group-message" event - broadcast to all members except sender
    - Add "group-member-added" event - notify all members
    - Add "group-member-removed" event - notify all members and removed user
    - Add "group-admin-promoted" event - notify all members
    - Add "group-settings-updated" event - notify all members
    - Add "message-pinned" and "message-unpinned" events
    - _Requirements: 2.3, 2.7, 15.6_

  - [~] 14.2 Add status update Socket.IO events
    - Add "status-posted" event - emit to all online friends
    - Add "status-viewed" event - notify status creator
    - _Requirements: 6.12_

  - [~] 14.3 Add message editing Socket.IO events
    - Add "message-edited" event - notify recipient with new text
    - _Requirements: 14.6_

  - [~] 14.4 Add chat management sync events
    - Add "chat-pinned", "chat-archived", "chat-muted" events for multi-device sync
    - _Requirements: 10.6, 11.4, 12.5_

  - [~] 14.5 Update read receipt logic
    - Extend "messages-read" event to check readReceiptEnabled privacy setting
    - Only broadcast if sender and recipient have read receipts enabled
    - _Requirements: 5.6, 9.5_

- [ ] 15. Create frontend API client modules
  - [~] 15.1 Create group API client
    - Create `frontend/src/apis/group.api.ts`
    - Define functions for all group endpoints (create, getMyGroups, sendMessage, etc.)
    - Use axios with JWT authentication
    - _Requirements: 1.1, 2.1, 3.1_

  - [~] 15.2 Create status API client
    - Create `frontend/src/apis/status.api.ts`
    - Define functions for all status endpoints (create, getFriends, view, delete)
    - Handle FormData for media uploads
    - _Requirements: 6.1, 6.5_

  - [~] 15.3 Create privacy API client
    - Create `frontend/src/apis/privacy.api.ts`
    - Define functions for privacy settings and blocking
    - _Requirements: 9.11, 9.12_

  - [~] 15.4 Create settings API client
    - Create `frontend/src/apis/settings.api.ts`
    - Define functions for user settings and chat customization
    - _Requirements: 8.1, 17.6_

  - [~] 15.5 Create contact sync API client
    - Create `frontend/src/apis/contact.api.ts`
    - Define syncContacts() function
    - _Requirements: 4.1_

  - [~] 15.6 Create chat management API client
    - Create `frontend/src/apis/chatManagement.api.ts`
    - Define functions for pin, archive, mute operations
    - _Requirements: 10.7, 11.7, 12.7_

  - [~] 15.7 Create search API client
    - Create `frontend/src/apis/search.api.ts`
    - Define message search functions
    - _Requirements: 13.6_

  - [~] 15.8 Create sticker API client
    - Create `frontend/src/apis/sticker.api.ts`
    - Define sticker pack retrieval functions
    - _Requirements: 16.6_

  - [~] 15.9 Extend message API client with editing
    - Update `frontend/src/apis/message.api.ts`
    - Add editMessage() and getEditHistory() functions
    - _Requirements: 14.9_

- [ ] 16. Create frontend context providers
  - [~] 16.1 Create GroupContext with Socket.IO integration
    - Create `frontend/src/contexts/GroupContext.tsx`
    - Manage groups state, currentGroup, loading
    - Implement fetchGroups, createGroup, sendGroupMessage, leaveGroup
    - Listen to Socket.IO events: group-message, group-member-added, etc.
    - Update state in real-time from socket events
    - _Requirements: 1.8, 2.3, 2.4, 3.10_

  - [~] 16.2 Create StatusContext with Socket.IO integration
    - Create `frontend/src/contexts/StatusContext.tsx`
    - Manage friendsStatuses Map, myStatuses, loading
    - Implement createStatus, viewStatus, deleteStatus
    - Listen to Socket.IO events: status-posted, status-viewed
    - Update state in real-time from socket events
    - _Requirements: 6.8, 6.9, 6.10, 6.11, 6.12_

  - [~] 16.3 Create SettingsContext for privacy and user settings
    - Create `frontend/src/contexts/SettingsContext.tsx`
    - Manage userSettings, privacySettings, loading
    - Implement fetchSettings, updateUserSettings, updatePrivacySettings
    - Load settings on mount
    - _Requirements: 8.1, 9.11_

- [~] 17. Checkpoint - Verify contexts and API clients
  - Test context providers with mock data
  - Verify Socket.IO event listeners are working
  - Ensure all API clients handle errors correctly
  - Ask the user if questions arise

- [ ] 18. Implement Group Chat UI components
  - [~] 18.1 Create GroupList component
    - Create `frontend/src/components/groups/GroupList.tsx`
    - Display all groups from GroupContext
    - Show group avatar, name, last message, unread count
    - Handle group selection
    - _Requirements: 1.8, 2.4_

  - [~] 18.2 Create GroupChatWindow component
    - Create `frontend/src/components/groups/GroupChatWindow.tsx`
    - Display group messages with sender info
    - Show message input with all existing features (emoji, files, voice)
    - Integrate with sendGroupMessage from context
    - Display pinned messages at top
    - _Requirements: 2.4, 2.6, 15.7_

  - [~] 18.3 Create CreateGroupModal component
    - Create `frontend/src/components/groups/CreateGroupModal.tsx`
    - Display friend selection (multi-select)
    - Group name input and optional avatar upload
    - Call createGroup from context
    - _Requirements: 1.8_

  - [~] 18.4 Create GroupDetailsPanel component
    - Create `frontend/src/components/groups/GroupDetailsPanel.tsx`
    - Display group info (name, avatar, description)
    - Show member list with admin badges
    - Show add/remove member actions for admins
    - Show leave group action
    - Display shared media
    - _Requirements: 1.9, 3.6, 3.7_

  - [~] 18.5 Create PinnedMessagesPanel component
    - Create `frontend/src/components/groups/PinnedMessagesPanel.tsx`
    - Display pinned messages with pin/unpin actions for admins
    - Allow all members to view pinned messages
    - _Requirements: 15.7, 15.8, 15.9_

- [ ] 19. Implement Status Update UI components
  - [~] 19.1 Create StatusRing component
    - Create `frontend/src/components/status/StatusRing.tsx`
    - Display animated gradient ring around avatar for active statuses
    - Show different style for viewed vs unviewed
    - _Requirements: 6.8_

  - [~] 19.2 Create StatusList component
    - Create `frontend/src/components/status/StatusList.tsx`
    - Display horizontal scrollable list of friends with active statuses
    - Include "Add Status" button with user's avatar
    - _Requirements: 6.8_

  - [~] 19.3 Create StatusViewer component
    - Create `frontend/src/components/status/StatusViewer.tsx`
    - Fullscreen viewer with progress bars for multiple statuses
    - Display content (text/image/video) with timestamp
    - Auto-advance to next status after duration
    - Call viewStatus when status is shown
    - _Requirements: 6.10, 6.11_

  - [~] 19.4 Create CreateStatusModal component
    - Create `frontend/src/components/status/CreateStatusModal.tsx`
    - Text input with background color and font selection
    - Image and video upload options
    - Privacy selector (all friends, friends except, only share with)
    - Friend selection for privacy modes
    - _Requirements: 6.9, 7.5_

  - [~] 19.5 Create StatusViewersList component
    - Create `frontend/src/components/status/StatusViewersList.tsx`
    - Display list of users who viewed status (creator only)
    - Show viewer avatars, names, and view timestamps
    - _Requirements: 6.10_

- [ ] 20. Implement comprehensive Settings UI
  - [~] 20.1 Create SettingsPage component
    - Create `frontend/src/components/settings/SettingsPage.tsx`
    - Display navigation with all setting categories
    - Route to different setting panels
    - _Requirements: 8.1_

  - [~] 20.2 Create AccountSettings component
    - Create `frontend/src/components/settings/AccountSettings.tsx`
    - Display profile edit form (username, email, avatar)
    - Password change form
    - _Requirements: 8.2_

  - [~] 20.3 Create PrivacySettings component
    - Create `frontend/src/components/settings/PrivacySettings.tsx`
    - Display toggles/selectors for all privacy options
    - Last seen, online status, profile photo, status visibility
    - Read receipts, message permissions, group invite permissions
    - Blocked users list with unblock actions
    - Use SettingsContext to update privacy settings
    - _Requirements: 8.3, 9.11, 9.12_

  - [~] 20.4 Create NotificationSettings component
    - Create `frontend/src/components/settings/NotificationSettings.tsx`
    - Display toggles for push notifications, sound, vibration
    - _Requirements: 8.4_

  - [~] 20.5 Create ChatSettings component
    - Create `frontend/src/components/settings/ChatSettings.tsx`
    - Display enter key behavior toggle
    - Font size selector
    - Media auto-download preferences
    - _Requirements: 8.5_

  - [~] 20.6 Create AppearanceSettings component
    - Create `frontend/src/components/settings/AppearanceSettings.tsx`
    - Display theme selector (light, dark, auto)
    - Glassmorphic intensity slider
    - _Requirements: 8.6_

  - [~] 20.7 Create CallSettings component
    - Create `frontend/src/components/settings/CallSettings.tsx`
    - Display audio and video quality selectors
    - _Requirements: 8.7_

  - [~] 20.8 Create StorageSettings component
    - Create `frontend/src/components/settings/StorageSettings.tsx`
    - Display media cache size
    - Clear cache button
    - _Requirements: 8.8_

  - [~] 20.9 Create ContactsSettings component
    - Create `frontend/src/components/settings/ContactsSettings.tsx`
    - Display contact sync button and explanation
    - Show last sync time
    - _Requirements: 8.9_

  - [~] 20.10 Create AboutSettings component
    - Create `frontend/src/components/settings/AboutSettings.tsx`
    - Display app version, terms of service, privacy policy
    - _Requirements: 8.10_

- [ ] 21. Implement Read Receipt UI
  - [~] 21.1 Create ReadReceiptIndicator component
    - Create `frontend/src/components/messages/ReadReceiptIndicator.tsx`
    - Display checkmark icons based on message status
    - Clock icon for "sending", single grey check for "sent"
    - Double grey checks for "delivered", double blue checks for "read"
    - Red indicator for "failed"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [~] 21.2 Integrate ReadReceiptIndicator in message bubbles
    - Update existing MessageBubble component
    - Show ReadReceiptIndicator on sent messages only
    - Update status from Socket.IO "messages-read" event
    - _Requirements: 5.8_

- [ ] 22. Implement Chat Management UI
  - [~] 22.1 Create ChatListItem component enhancements
    - Update existing ChatListItem component
    - Add pin badge indicator for pinned chats
    - Add mute icon with duration for muted chats
    - Display archived badge (or exclude from main list)
    - _Requirements: 10.7, 11.8, 12.8_

  - [~] 22.2 Create ChatContextMenu component
    - Create `frontend/src/components/chat/ChatContextMenu.tsx`
    - Display pin/unpin action (enforce 3-pin limit)
    - Display archive/unarchive action
    - Display mute options (8 hours, 1 week, always)
    - Display unmute action for muted chats
    - Use chatManagement API client
    - _Requirements: 10.8, 11.7, 12.7, 12.9_

  - [~] 22.3 Create ArchivedChatsPage component
    - Create `frontend/src/components/chat/ArchivedChatsPage.tsx`
    - Display list of archived conversations
    - Show unarchive action
    - _Requirements: 11.8_

- [ ] 23. Implement Message Search UI
  - [~] 23.1 Create SearchBar component
    - Create `frontend/src/components/search/SearchBar.tsx`
    - Display search input in chat header
    - Debounce input (300ms) before triggering search
    - _Requirements: 13.6_

  - [~] 23.2 Create SearchResults component
    - Create `frontend/src/components/search/SearchResults.tsx`
    - Display search results with highlighting
    - Show message context (1 before/after)
    - Implement pagination for results
    - Handle click to jump to message in conversation
    - _Requirements: 13.7, 13.8_

- [ ] 24. Implement Message Editing UI
  - [~] 24.1 Create EditMessageModal component
    - Create `frontend/src/components/messages/EditMessageModal.tsx`
    - Display inline text editor with current message text
    - Show save and cancel buttons
    - Call editMessage API
    - _Requirements: 14.9_

  - [~] 24.2 Add "edited" indicator to message bubbles
    - Update MessageBubble component
    - Display "edited" text for messages with isEdited=true
    - Make "edited" clickable to show edit history
    - _Requirements: 14.7_

  - [~] 24.3 Add edit option to message context menu
    - Update message context menu
    - Show "Edit" option only for messages sent within 15 minutes
    - Open EditMessageModal on click
    - _Requirements: 14.8_

  - [~] 24.4 Create EditHistoryModal component
    - Create `frontend/src/components/messages/EditHistoryModal.tsx`
    - Display edit history with timestamps
    - Show original and edited versions
    - _Requirements: 14.10_

  - [~] 24.5 Update message state from Socket.IO events
    - Listen to "message-edited" event in message context
    - Update message text and set isEdited flag
    - _Requirements: 14.6_

- [ ] 25. Implement Enhanced Emoji and Sticker Picker
  - [~] 25.1 Create EmojiPicker component
    - Create `frontend/src/components/inputs/EmojiPicker.tsx`
    - Display emoji categories (smileys, animals, food, etc.)
    - Show recently used emojis from User.recentEmojis
    - Implement emoji search functionality
    - Support skin tone selection
    - Persist recently used emojis to backend
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [~] 25.2 Create StickerPicker component
    - Create `frontend/src/components/inputs/StickerPicker.tsx`
    - Fetch sticker packs from API on mount
    - Display pack thumbnails
    - Show sticker grid when pack is selected
    - Send sticker as message with mimeType="sticker"
    - _Requirements: 16.6, 16.7, 16.9_

  - [~] 25.3 Integrate pickers in message input
    - Update message input component
    - Add emoji and sticker picker buttons
    - Show picker modal on button click
    - _Requirements: 16.1, 16.6_

  - [~] 25.4 Update MessageBubble to render stickers
    - Update MessageBubble component
    - Detect mimeType="sticker" and render appropriately
    - Apply correct sizing for stickers
    - _Requirements: 16.10_

- [ ] 26. Implement Chat Customization UI
  - [~] 26.1 Create ChatCustomizationModal component
    - Create `frontend/src/components/customization/ChatCustomizationModal.tsx`
    - Display wallpaper options (preset gallery)
    - Show custom wallpaper upload option
    - Display theme color pickers (bubble colors, text colors)
    - Show reset to default option
    - Use settings API client to persist changes
    - _Requirements: 17.6, 17.7, 17.9, 17.10_

  - [~] 26.2 Create WallpaperGallery component
    - Create `frontend/src/components/customization/WallpaperGallery.tsx`
    - Display preset wallpaper options (solid colors, gradients, patterns)
    - Allow custom image upload with validation
    - _Requirements: 17.3, 17.4, 17.7_

  - [~] 26.3 Apply wallpaper and theme to chat interface
    - Update chat window component
    - Load customization from UserSettings
    - Apply wallpaper as background
    - Apply theme colors to message bubbles
    - _Requirements: 17.8_

- [ ] 27. Implement Contact Sync UI
  - [~] 27.1 Create ContactSyncButton component
    - Create `frontend/src/components/contacts/ContactSyncButton.tsx`
    - Trigger browser Contact Picker API
    - Extract phone numbers and emails from selected contacts
    - Hash contacts locally before sending
    - Call syncContacts API
    - Display matched contacts
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [~] 27.2 Create ContactMatchesList component
    - Create `frontend/src/components/contacts/ContactMatchesList.tsx`
    - Display matched users with avatars and usernames
    - Show "Add Friend" button for non-friends
    - Integrate with existing friend request flow
    - _Requirements: 4.6_

- [~] 28. Checkpoint - Test all UI components
  - Verify all components render correctly
  - Test user interactions (clicks, inputs, modals)
  - Verify Socket.IO updates trigger UI changes
  - Ask the user if questions arise

- [ ] 29. Integration and wiring
  - [~] 29.1 Wire group components to main app
    - Add GroupProvider to app root
    - Add GroupList to sidebar
    - Add group chat route
    - Add CreateGroupModal trigger button
    - _Requirements: 1.8, 1.9_

  - [~] 29.2 Wire status components to main app
    - Add StatusProvider to app root
    - Add StatusList to home/chat page header
    - Add CreateStatusModal trigger button
    - Add status ring to all user avatars in friend lists
    - _Requirements: 6.8, 6.9_

  - [~] 29.3 Wire settings to main app
    - Add SettingsProvider to app root
    - Add settings navigation link
    - Add all settings pages to routing
    - _Requirements: 8.1_

  - [~] 29.4 Wire chat management to chat list
    - Add context menu to each chat list item
    - Implement pin/archive/mute actions
    - Add archived chats link to sidebar
    - _Requirements: 10.7, 11.7, 12.7_

  - [~] 29.5 Wire search to chat window
    - Add search bar to chat header
    - Show search results overlay
    - Implement jump-to-message functionality
    - _Requirements: 13.6, 13.8_

  - [~] 29.6 Wire contact sync to settings
    - Add contact sync button to ContactsSettings
    - Display last sync time
    - Show matched contacts in modal
    - _Requirements: 4.1, 8.9_

- [ ]* 30. Write property-based tests for serialization
  - [ ]* 30.1 Set up fast-check testing framework
    - Install fast-check: `npm install --save-dev fast-check`
    - Create test directory: `backend/tests/properties/`
    - Configure test script in package.json
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ]* 30.2 Write property test for GroupChat round-trip serialization
    - Create `backend/tests/properties/groupChat.property.test.ts`
    - **Property 1: GroupChat Round-Trip Serialization**
    - **Validates: Requirements 18.4**
    - Use fast-check arbitraries for GroupChat data
    - Test serialize → parse → serialize produces identical output
    - Run 100 iterations minimum
    - _Requirements: 18.4_

  - [ ]* 30.3 Write property test for GroupChat validation
    - Add test to `groupChat.property.test.ts`
    - **Property 2: GroupChat Validation Rejects Invalid Data**
    - **Validates: Requirements 18.3**
    - Generate invalid GroupChat inputs (missing fields, wrong types)
    - Verify parsing fails with descriptive errors
    - _Requirements: 18.3_

  - [ ]* 30.4 Write property test for PrivacySettings round-trip serialization
    - Create `backend/tests/properties/privacySettings.property.test.ts`
    - **Property 3: PrivacySettings Round-Trip Serialization**
    - **Validates: Requirements 19.4**
    - Test serialize → parse → serialize produces identical output
    - _Requirements: 19.4_

  - [ ]* 30.5 Write property test for PrivacySettings enum validation
    - Add test to `privacySettings.property.test.ts`
    - **Property 4: PrivacySettings Enum Validation**
    - **Validates: Requirements 19.3**
    - Generate invalid enum values
    - Verify parsing rejects with descriptive errors
    - _Requirements: 19.3_

  - [ ]* 30.6 Write property test for StatusUpdate round-trip serialization
    - Create `backend/tests/properties/statusUpdate.property.test.ts`
    - **Property 5: StatusUpdate Round-Trip Serialization**
    - **Validates: Requirements 20.4**
    - Test serialize → parse → serialize produces identical output
    - _Requirements: 20.4_

  - [ ]* 30.7 Write property test for StatusUpdate content validation
    - Add test to `statusUpdate.property.test.ts`
    - **Property 6: StatusUpdate Content Validation**
    - **Validates: Requirements 20.3**
    - Generate invalid content types and oversized content
    - Verify parsing rejects with descriptive errors
    - _Requirements: 20.3_

- [ ]* 31. Write backend unit tests
  - [ ]* 31.1 Write group controller unit tests
    - Test createGroup with valid and invalid data
    - Test member addition/removal with permission checks
    - Test admin promotion/demotion edge cases
    - Test group message CRUD operations
    - Mock GroupChat model and socket emissions
    - _Requirements: 1.1, 1.4, 2.1, 3.1, 3.4_

  - [ ]* 31.2 Write status controller unit tests
    - Test status creation with media upload
    - Test status privacy filtering logic
    - Test viewer list updates
    - Test status expiry queries
    - Mock StatusUpdate model and Cloudinary
    - _Requirements: 6.1, 6.5, 6.6, 7.2, 7.3_

  - [ ]* 31.3 Write privacy controller unit tests
    - Test privacy setting updates
    - Test block/unblock user operations
    - Test privacy filter application
    - Mock PrivacySettings and User models
    - _Requirements: 9.1, 9.2, 9.10, 9.11_

  - [ ]* 31.4 Write chat management controller unit tests
    - Test pin/unpin with 3-pin limit enforcement
    - Test archive/unarchive operations
    - Test mute/unmute with duration handling
    - Mock User model
    - _Requirements: 10.2, 10.4, 11.2, 12.2_

  - [ ]* 31.5 Write search controller unit tests
    - Test message search with text index
    - Test result pagination
    - Test permission enforcement (membership check)
    - Mock Message and GroupChat models
    - _Requirements: 13.1, 13.2, 13.5_

  - [ ]* 31.6 Write contact sync utility tests
    - Test contact hashing (SHA-256)
    - Test hash matching against users
    - Test that raw contact data is never stored
    - _Requirements: 4.3, 4.4, 4.8_

  - [ ]* 31.7 Write middleware unit tests
    - Test groupPermissionMiddleware with member/non-member cases
    - Test privacy filter utility with various visibility settings
    - Test rate limiters (verify limits are enforced)
    - _Requirements: 1.3, 3.2, 4.7, 9.3_

- [ ]* 32. Write frontend component tests
  - [ ]* 32.1 Write GroupList component tests
    - Test rendering groups with unread counts
    - Test group selection
    - Test empty state
    - Use React Testing Library
    - _Requirements: 1.8_

  - [ ]* 32.2 Write StatusViewer component tests
    - Test status display with different content types
    - Test auto-advance to next status
    - Test progress bar rendering
    - _Requirements: 6.10_

  - [ ]* 32.3 Write PrivacySettings component tests
    - Test all toggles and selectors
    - Test blocked users list
    - Test settings update API calls
    - _Requirements: 9.11_

  - [ ]* 32.4 Write ChatContextMenu component tests
    - Test pin/unpin actions
    - Test archive/unarchive actions
    - Test mute options display
    - _Requirements: 10.8, 11.7, 12.7_

  - [ ]* 32.5 Write SearchBar and SearchResults tests
    - Test search input debouncing
    - Test result highlighting
    - Test jump-to-message navigation
    - _Requirements: 13.6, 13.7, 13.8_

  - [ ]* 32.6 Write EmojiPicker and StickerPicker tests
    - Test emoji category filtering
    - Test recently used emojis
    - Test sticker pack loading
    - _Requirements: 16.1, 16.6_

  - [ ]* 32.7 Write ChatCustomizationModal tests
    - Test wallpaper selection
    - Test theme color pickers
    - Test reset to default
    - _Requirements: 17.6, 17.10_

- [ ]* 33. Write integration tests
  - [ ]* 33.1 Write group chat flow integration test
    - Test complete flow: create group → add members → send message → pin message
    - Use Supertest for API testing
    - Verify database state at each step
    - _Requirements: 1.1, 1.4, 2.1, 15.2_

  - [ ]* 33.2 Write status update flow integration test
    - Test complete flow: post status → friend views status → status expires
    - Test privacy filtering (friends_except, only_share_with)
    - _Requirements: 6.1, 6.5, 7.2, 7.3_

  - [ ]* 33.3 Write message editing flow integration test
    - Test: send message → edit within 15 minutes → view edit history
    - Test editing after 15 minutes (should fail)
    - Test Socket.IO broadcast of edits
    - _Requirements: 14.2, 14.3, 14.4, 14.6_

  - [ ]* 33.4 Write privacy enforcement integration test
    - Set privacy settings → request data from another account → verify filtering
    - Test lastSeen, onlineStatus, avatar visibility
    - Test blocked user access denial
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.10_

  - [ ]* 33.5 Write chat management integration test
    - Test: pin chat → archive chat → mute chat → verify all states
    - Test automatic unarchive on new message
    - Test mute expiry handling
    - _Requirements: 10.2, 11.2, 11.6, 12.2, 12.6_

  - [ ]* 33.6 Write contact sync integration test
    - Test: hash contacts → match against users → return only matches
    - Verify rate limiting (max 3 requests per hour)
    - Verify no raw contact data is stored
    - _Requirements: 4.3, 4.4, 4.5, 4.7, 4.8_

  - [ ]* 33.7 Write Socket.IO integration tests
    - Test all new socket events with mock clients
    - Verify broadcasts reach correct recipients
    - Test room-based messaging for groups
    - _Requirements: 2.3, 6.12, 14.6, 15.6_

- [~] 34. Final checkpoint - End-to-end validation
  - Run full test suite (property tests, unit tests, integration tests)
  - Manually test critical user flows in browser
  - Verify all Socket.IO events trigger UI updates
  - Test file uploads to Cloudinary
  - Verify privacy settings enforcement across features
  - Test chat management (pin/archive/mute) persistence
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Implementation uses TypeScript throughout (backend and frontend)
- All new features extend existing architecture patterns
- Socket.IO is used for all real-time synchronization
- Property-based testing is ONLY for Requirements 18-20 (serialization logic)
- Backend enforces all privacy, permissions, and business logic rules
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Database indexes are critical for performance at scale
- Rate limiting prevents abuse of contact sync and status posting

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["1.6", "1.7"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["4.1", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1", "12.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "6.2", "7.2", "8.2", "9.2", "10.2", "12.2"] },
    { "id": 5, "tasks": ["4.5", "5.2", "6.2", "9.3", "11.1", "11.2"] },
    { "id": 6, "tasks": ["6.3"] },
    { "id": 7, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 8, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5", "15.6", "15.7", "15.8", "15.9"] },
    { "id": 9, "tasks": ["16.1", "16.2", "16.3"] },
    { "id": 10, "tasks": ["18.1", "18.3", "19.1", "19.2", "19.4", "20.1", "21.1", "22.2", "23.1", "25.1", "25.2", "26.1", "26.2", "27.1"] },
    { "id": 11, "tasks": ["18.2", "18.4", "18.5", "19.3", "19.5", "20.2", "20.3", "20.4", "20.5", "20.6", "20.7", "20.8", "20.9", "20.10", "22.1", "22.3", "23.2", "24.1", "24.2", "24.3", "24.4", "25.3", "26.3", "27.2"] },
    { "id": 12, "tasks": ["21.2", "24.5", "25.4"] },
    { "id": 13, "tasks": ["29.1", "29.2", "29.3", "29.4", "29.5", "29.6"] },
    { "id": 14, "tasks": ["30.1"] },
    { "id": 15, "tasks": ["30.2", "30.3", "30.4", "30.5", "30.6", "30.7"] },
    { "id": 16, "tasks": ["31.1", "31.2", "31.3", "31.4", "31.5", "31.6", "31.7"] },
    { "id": 17, "tasks": ["32.1", "32.2", "32.3", "32.4", "32.5", "32.6", "32.7"] },
    { "id": 18, "tasks": ["33.1", "33.2", "33.3", "33.4", "33.5", "33.6", "33.7"] }
  ]
}
```
