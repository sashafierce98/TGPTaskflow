# TGP TaskFlow - Product Requirements Document

## Original Problem Statement
Build a Kanban Board application for TGP Bioplastics, a plastic manufacturing facility. The app should allow the entire team to create and manage Kanban boards with customizable columns, WIP limits, and collaborative features.

## Core Requirements
- Admin approval system for user access (organization-only access)
- First user automatically becomes admin
- Google OAuth authentication
- Customizable columns (Backlog, To Do, WIP, Done, etc.)
- Drag-and-drop card management
- Special "Questions" column for Q&A (non-draggable)
- Organization-wide board visibility
- Hover tooltips for board/card descriptions

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: Google OAuth2 + JWT
- **Drag & Drop**: @hello-pangea/dnd

## What's Been Implemented

### Authentication & Authorization
- [x] Google OAuth integration
- [x] Admin approval system for new users
- [x] First user automatically becomes admin
- [x] JWT session management
- [x] Protected routes

### Board Management
- [x] Create, edit, delete boards
- [x] Organization-wide board visibility
- [x] Hover tooltips for descriptions

### Column Management
- [x] Add, edit, delete columns
- [x] WIP (Work-In-Progress) limits
- [x] Custom column colors

### Card Management
- [x] Create, edit, delete cards
- [x] Priority levels (low, medium, high)
- [x] Due dates
- [x] Drag-and-drop between columns

### Special Features
- [x] "Questions" column (non-draggable, Q&A support)
- [x] Threaded answers on questions

### Admin Panel
- [x] View all users
- [x] Approve pending users
- [x] Change user roles (user/admin)
- [x] Remove users

## Bug Fixes (January 12, 2025)

### P0 - Drag-and-Drop Glitch (FIXED)
- **Issue**: Cards "hang weirdly" after being dropped into a new column
- **Root Cause**: `setTimeout(() => fetchBoardData(), 300)` was causing a refetch that triggered a re-render mid-animation
- **Fix**: Removed the post-drop refetch, using pure optimistic update. Only refetch on error to revert.
- **Files**: `/app/frontend/src/pages/BoardView.js`, `/app/frontend/src/App.css`

### P1 - Inconsistent Dialog Colors (FIXED)
- **Issue**: Dialogs appeared yellow on Chrome/Windows but white on Safari/Mac
- **Root Cause**: CSS variables (`bg-background`, `bg-popover`, `focus:bg-accent`) were interpreted differently across browsers
- **Fix**: Changed to explicit Tailwind colors (`bg-white`, `text-slate-900`, `focus:bg-slate-100`)
- **Files**: `/app/frontend/src/components/ui/dialog.jsx`, `/app/frontend/src/components/ui/select.jsx`

## On Hold Features

### Email/Password Authentication with OTP
User explicitly requested to pause this feature. Requirements when resumed:
- Admin creates user accounts from admin portal
- Login uses email as username
- OTP sent to user's email for login
- Admin portal collects: Name, Employee ID, Email, Password, Photo, Blood group, Department
- `resend` library installed but not yet used

## Future/Backlog Tasks

### Refactoring
- [ ] Break down `BoardView.js` (1000+ lines) into smaller components:
  - Column.js
  - Card.js
  - EditCardDialog.js
  - QuestionCard.js

### Potential Enhancements
- [ ] Card assignments to specific users
- [ ] Activity log/history
- [ ] Card comments (separate from Questions)
- [ ] Due date notifications
- [ ] Board templates
- [ ] Export/import boards

## Key Files Reference
- `/app/backend/server.py` - All backend logic and API endpoints
- `/app/frontend/src/pages/BoardView.js` - Main Kanban board interface
- `/app/frontend/src/pages/Dashboard.js` - Board list and creation
- `/app/frontend/src/pages/AdminPanel.js` - User management
- `/app/frontend/src/components/ui/dialog.jsx` - Dialog component
- `/app/frontend/src/components/ui/select.jsx` - Select dropdown component

## API Endpoints
- **Auth**: `/api/auth/google`, `/api/auth/callback`, `/api/auth/session`
- **Admin**: `/api/admin/users`, `/api/admin/users/{user_id}/approve`, `/api/admin/users/{user_id}/role`, `/api/admin/users/{user_id}`
- **Boards**: `/api/boards` (GET, POST), `/api/boards/{board_id}` (GET, PUT, DELETE)
- **Columns**: `/api/boards/{board_id}/columns` (POST), `/api/columns/{column_id}` (PUT, DELETE)
- **Cards**: `/api/columns/{column_id}/cards` (POST), `/api/cards/{card_id}` (PUT, DELETE)
- **Comments**: `/api/cards/{card_id}/comments` (POST, GET)
