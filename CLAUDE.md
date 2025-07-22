# InLINKS - Claude Development Guide

## Project Overview
InLINKS is a comprehensive inventory management system built with Flask (backend) and React (frontend) for managing materials, projects, and workflows. It features role-based access control, real-time inventory tracking, and project management capabilities.

## Tech Stack
- **Backend**: Flask 2.3.3, Flask-SQLAlchemy 3.1.1, SQLite
- **Frontend**: React 19.1.0, Vite, Tailwind CSS 4.1.11, Material-UI 7.2.0, lucide
- **Authentication**: JWT tokens
- **Database**: SQLite with prefixed ID system

## Project Structure

### Backend (`/backend`)
- **app.py**: Main Flask application with CORS and JWT setup
- **models.py**: SQLAlchemy models for all database entities
- **config.py**: Configuration settings and constants
- **routes/**: Organized API endpoints
  - `/common/`: Auth, users, material types, workflow types
  - `/inventory/`: Lots, cartons, items, stock management
  - `process_routes.py`: Projects, work orders, tasks
- **utils/**: Helper utilities
  - `auth_middleware.py`: JWT authentication
  - `db_utils.py`: Database initialization and utilities
  - `item_utils.py`: Item-specific helper functions

### Frontend (`/frontend`)
- **src/App.jsx**: Main React application with routing
- **src/pages/**: Page components for different views
- **src/componenets/**: Reusable UI components
- **src/hooks/**: Custom React hooks (e.g., usePermissions)
- **src/services/**: API service layers

## Key Conventions

### ID System
All entities use prefixed sequential IDs:
- User Types: `UT001`, `UT002`, ...
- Users: `USR001`, `USR002`, ...
- Material Types: `MT001`, `MT002`, ...
- Lots: `LOT001`, `LOT002`, ...
- Projects: `PRJ001`, `PRJ002`, ...
- Work Orders: `WO001`, `WO002`, ...

### Status Values
**Item Status:**
- `available` - Ready for assignment
- `assigned` - Assigned to task
- `used` - Consumed/used

**Sub Task Status:**
- `design` - Design phase
- `pulling_cable` - Cable pulling
- `terminated` - Termination phase
- `completed` - Task finished

### User Types & Permissions
- **admin**: Full system access
- **worker**: Project/task execution
- **client**: View-only access to relevant projects
- **consultant**: Project oversight and consultation
- **pm**: Project management capabilities

## Database Collections

### Common Collection
- User Types, Users, Material Types, Workflow Types, Log Types

### Stock Collection
- **Lots**: Factory material lots with tracking
- **Cartons**: Sub-containers within lots
- **Items**: Individual trackable items
- **Stock Logs**: Audit trail for inventory movements

### Process Collection
- **Projects**: Main project containers
- **Work Orders**: Tasks within projects
- **Tasks**: Individual work items
- **Sub Tasks**: Detailed task breakdown


## API Authentication
- JWT tokens required for protected endpoints
- Token format: `Authorization: Bearer <token>`
- Base URL: `http://localhost:5000`

## Common Development Tasks

### Adding New API Endpoints
1. Add model in `models.py`
2. Create route handler in appropriate `routes/` file
3. Add ID generation logic in `db_utils.py`
4. Update frontend services if needed

### Adding New Frontend Pages
1. Create component in `src/pages/`
2. Add route in `App.jsx`
3. Create/update API service in `src/services/`
4. Add navigation links as needed

### Database Schema Changes
1. Update models in `models.py`
2. Run database migration (manual process for SQLite)
3. Update seed data in `db_utils.py`
4. Test with `test_api.py`

## Security Notes
- JWT secret keys defined in `config.py`
- Role-based access control implemented
- Input validation on all endpoints
- CORS configured for development


