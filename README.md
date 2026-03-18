# InLINKS

A full-stack blockchain-based construction material management system with Flask backend and React frontend. Features role-based access control, real-time inventory tracking, and project management capabilities.

| | | | |
|:---:|:---:|:---:|:---:|
| <img width="780" height="1688" alt="screenshot-1772956784710" src="https://github.com/user-attachments/assets/a9b2c3dc-6847-4493-b0af-e9c559771a1b" /> | <img width="780" height="1688" alt="screenshot-1772956671963" src="https://github.com/user-attachments/assets/d8840f5b-5590-4b77-8133-030d04a35eea" /> | <img width="780" height="1688" alt="screenshot-1773742791801" src="https://github.com/user-attachments/assets/d06c8975-0f7d-4249-8485-2570965c9990" /> | <img width="780" height="1688" alt="screenshot-1772956762240" src="https://github.com/user-attachments/assets/e6c32db1-703c-4188-a0d5-8fbd1a3b11c2" /> |
| <img width="780" height="1688" alt="screenshot-1773742939637" src="https://github.com/user-attachments/assets/856bba8c-b4cf-4eea-a505-83ac50defcdb" /> | <img width="780" height="1688" alt="screenshot-1773740013443" src="https://github.com/user-attachments/assets/b83d677d-48a1-4d2b-9a36-0c22070dd898" /> | <img width="780" height="1688" alt="screenshot-1773742587373" src="https://github.com/user-attachments/assets/833a113d-50ff-41d8-bf5d-20c9a60fb0bb" /> | <img width="780" height="1688" alt="screenshot-1773740118773" src="https://github.com/user-attachments/assets/d3189955-9f22-43bb-923a-1dbc115ae639" /> | <img width="780" height="1688" alt="screenshot-1773740170250" src="https://github.com/user-attachments/assets/15966db3-acba-40c1-a0f4-33efb46435fc" />



 
## Tech Stack

- **Backend**: Flask 2.3.3, Flask-SQLAlchemy 3.1.1, SQLite
- **Frontend**: React 19.1.0, Vite, Tailwind CSS 4.1.11, Material-UI 7.2.0
- **Mobile**: Capacitor with Android/iOS support
- **Authentication**: JWT tokens
- **Database**: SQLite with prefixed ID system

## Database Structure

The application uses SQLite with multiple collections organized by functionality:

### Common Collection
- **User Types**: User roles with permissions (admin, worker, client, consultant, pm) and card menu access
- **Users**: User accounts with authentication, user type assignment, and activity tracking
- **Material Types**: Types of materials with units (cm, meter, unit, etc.)
- **Workflow Types**: Predefined workflow templates for processes
- **Log Types**: Categories for logging activities
- **Process State Types**: State definitions for projects, work orders, tasks, and subtasks with Chinese translations, colors, and icons
- **Item State Types**: State definitions for items (available, assigned, used) with Chinese translations and visual styling

### Stock Collection
- **Lots**: Material lots from factory with tracking, linked to material types and projects
- **Cartons**: Sub-containers within lots, containing items
- **Items**: Individual trackable items with quantity, status, state, location, scan count, and label information
- **Stock Logs**: Audit trail for stock movements with user, item, lot, and carton references

### Process Collection
- **Projects**: Main project containers with state, dates, priority, and person in charge
- **Work Orders**: Tasks within projects with workflow types, assignees, estimated hours, and lot assignments
- **Tasks**: Individual work items with state management and assignees
- **Sub Tasks**: Detailed task breakdown with state tracking and assignees
- **Process Logs**: Activity logging for all process entities with user tracking

### Menu Collection
- **Card Menus**: Dashboard card definitions with Chinese titles, icons, colors, and routing
- **Permissions**: Resource-based permission definitions
- **User Type Permissions**: Many-to-many relationship between user types and permissions
- **Permission Audit**: Security audit trail for permission checks

### Blockchain Collection
- **Blockchain Blocks**: Immutable blocks containing transactions with hash chaining
- **Blockchain Transactions**: Item state changes (CREATE, SPLIT, ASSIGN, UPDATE, TRANSFER) with quantity and location tracking
- **Blockchain Item States**: Current state snapshots of items with transaction references

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn
- Android Studio (for mobile development)
- Xcode (for iOS development on macOS)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Mobile App Setup with Capacitor

1. **Add Capacitor to the frontend project** (from frontend directory):
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "InLINKS" "com.inlinks.inventory" --web-dir=dist
```

2. **Add mobile platforms**:
```bash
# For Android
npm install @capacitor/android
npx cap add android

# For iOS (macOS only)
npm install @capacitor/ios
npx cap add ios
```

3. **Build the frontend**:
```bash
npm run build
```

4. **Sync with native platforms**:
```bash
npx cap sync
```

5. **Open in IDE**:
```bash
# Open Android Studio
npx cap open android

# Open Xcode (macOS only)
npx cap open ios
```

6. **Run on device/emulator**:
```bash
# Run Android app
npx cap run android

# Run iOS app (macOS only)
npx cap run ios
```

#### Capacitor Configuration

Update `capacitor.config.json` to match your backend URL:
```json
{
  "appId": "com.inlinks.inventory",
  "appName": "InLINKS",
  "webDir": "dist",
  "server": {
    "cleartext": true,
    "allowHttp": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "launchAutoHide": true
    }
  }
}
```

#### Mobile Development Tips

- **Android**: Enable USB debugging on your device and accept the development certificate
- **iOS**: Use a paid Apple Developer account for device testing
- **Hot reload**: Use `npm run dev` for frontend changes, then `npx cap copy` to sync to mobile
- **API calls**: Update API base URL in frontend services to use your machine's IP address for mobile testing

#### Building for Production

```bash
# Build optimized frontend
npm run build

# Copy to native platforms
npx cap copy

# Build release APK (Android)
cd android
./gradlew assembleRelease

# Build release IPA (iOS)
# Use Xcode to archive and distribute
```

## Project Structure

```
InLINKS/
├── backend/                    # Flask backend API
│   ├── app.py                 # Main Flask application
│   ├── models.py              # SQLAlchemy models
│   ├── config.py              # Configuration settings
│   ├── requirements.txt       # Python dependencies
│   ├── routes/                # API route handlers
│   │   ├── common/            # Auth, users, material types
│   │   ├── inventory/         # Lots, cartons, items
│   │   └── process_routes.py  # Projects, work orders, tasks
│   └── utils/                 # Helper utilities
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── App.jsx           # Main React application
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   └── services/         # API service layers
│   ├── capacitor.config.json # Capacitor configuration
│   └── package.json          # Node.js dependencies
└── android/                   # Generated Android project (after cap add android)

```

## Environment Configuration

### Frontend (.env file in frontend/)
```
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_TITLE=InLINKS Inventory
```

### Mobile (capacitor.config.json)
```json
{
  "appId": "com.inlinks.inventory",
  "appName": "InLINKS",
  "webDir": "dist",
  "server": {
    "cleartext": true,
    "allowHttp": true,
    "hostname": "localhost"
  }
}
```

## Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
    "username": "admin",
    "password": "admin123",
    "user_type_id": "UT001"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "admin"
}
```

Returns JWT token to use in subsequent requests:
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user_id": "USR001",
    "username": "admin",
    "user_type_id": "UT001"
}
```

## API Endpoints

All protected endpoints require `Authorization: Bearer <token>` header.

### Common Collection

#### User Types
- `GET /api/user_types` - List all user types
- `POST /api/user_types` - Create new user type

#### Users
- `GET /api/users` - List all users

#### Material Types
- `GET /api/material_types` - List all material types
- `POST /api/material_types` - Create new material type
```json
{
    "material_name": "Cable Cat6",
    "material_unit": "meter"
}
```

#### Workflow Types
- `GET /api/workflow_types` - List all workflow types
- `POST /api/workflow_types` - Create new workflow type

### Stock Collection

#### Lots
- `GET /api/lots` - List all lots
- `POST /api/lots` - Create new lot
```json
{
    "material_type_id": "MT001",
    "factory_lot_number": "LOT2025001"
}
```

#### Cartons
- `GET /api/cartons` - List all cartons
- `POST /api/cartons` - Create new carton

#### Items
- `GET /api/items` - List all items
- `POST /api/items` - Create new item
```json
{
    "material_type_id": "MT001",
    "quantity": 100.0,
    "status": "available"
}
```

#### Stock Logs
- `GET /api/stock_logs` - List all stock logs
- `POST /api/stock_logs` - Create new stock log

### Process Collection

#### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
```json
{
    "project_name": "Office Network Setup",
    "person_in_charge_id": "USR001"
}
```

#### Work Orders
- `GET /api/work_orders` - List all work orders
- `POST /api/work_orders` - Create new work order

#### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task

#### Sub Tasks
- `GET /api/subtasks` - List all subtasks
- `POST /api/subtasks` - Create new subtask

### Utility Endpoints

#### Dashboard
```http
GET /api/dashboard
```
Returns overview statistics and user info.

#### Search
```http
GET /api/search?q=Cable&type=all
```
Search across projects, items, and users. Types: `all`, `projects`, `items`, `users`

#### Initialize Sample Data
```http
POST /api/init_sample_data
```
Populates database with sample user types, material types, and workflow types.

## ID Prefixes

All entities use prefixed sequential IDs:
- User Types: `UT001`, `UT002`, ...
- Users: `USR001`, `USR002`, ...
- Material Types: `MT001`, `MT002`, ...
- Workflow Types: `WT001`, `WT002`, ...
- Log Types: `LT001`, `LT002`, ...
- Process State Types: `PST001`, `PST002`, ...
- Item State Types: `IST001`, `IST002`, ...
- Lots: `LOT001`, `LOT002`, ...
- Cartons: `CTN001`, `CTN002`, ...
- Items: `ITM001`, `ITM002`, ...
- Stock Logs: `SL001`, `SL002`, ...
- Projects: `PRJ001`, `PRJ002`, ...
- Work Orders: `WO001`, `WO002`, ...
- Tasks: `TSK001`, `TSK002`, ...
- Sub Tasks: `SUB001`, `SUB002`, ...
- Process Logs: `PL001`, `PL002`, ...
- Card Menus: `CM001`, `CM002`, ...
- Blockchain Blocks: `BC001`, `BC002`, ...
- Blockchain Transactions: `BCT001`, `BCT002`, ...
- Blockchain Item States: `BIS001`, `BIS002`, ...

## Status Values

### Item Status
Items use state-based management through ItemStateType entities:
- **Available states**: Defined in `item_state_types` table with Chinese translations
- **State tracking**: Each item links to `item_state_types.id` for current state
- **Blockchain integration**: All state changes are recorded in blockchain transactions

### Process Status
Projects, Work Orders, Tasks, and SubTasks use process state management:
- **State types**: Defined in `process_state_types` table for each entity type
- **Entity-specific states**: Separate state definitions for project, workorder, task, subtask
- **Visual styling**: States include background color, text color, and icon configuration
- **Chinese support**: All states have Chinese translations

### Blockchain Transaction Types
- `CREATE` - New item creation
- `SPLIT` - Item quantity division
- `ASSIGN` - Item assignment to tasks
- `UPDATE` - Item property updates
- `TRANSFER` - Item location transfers

## Development Workflow

### 1. Start Backend
```bash
cd backend
.venv\Scripts\activate  # Windows
python app.py
```

### 2. Start Frontend (new terminal)
```bash
cd frontend
npm run dev
```

### 3. Test Mobile (optional)
```bash
# Build and sync to mobile
cd frontend
npm run build
npx cap sync

# Run on device/emulator
npx cap run android  # or ios
```

### 4. Make Changes
- **Backend**: Edit Python files, Flask will auto-reload
- **Frontend**: Edit React files, Vite will hot-reload
- **Mobile**: After frontend changes, run `npm run build && npx cap copy`

## Database File

The SQLite database file `inlinks.db` will be created automatically in the backend directory when the application starts.

## Troubleshooting

### Common Issues

#### Backend Issues
- **Port 5000 already in use**: Change port in `backend/app.py` or kill existing process
- **Database locked**: Ensure only one Flask instance is running
- **Import errors**: Check virtual environment is activated and requirements installed

#### Frontend Issues
- **Port 5173 already in use**: Change port in `frontend/vite.config.js`
- **CORS errors**: Ensure backend is running and CORS is enabled
- **Build failures**: Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

#### Mobile Issues
- **API calls failing on mobile**: Update API base URL to use your machine's IP address instead of `localhost`
- **Build errors**: Ensure Android Studio and Xcode are properly installed
- **Sync failures**: Run `npx cap sync --force` to force sync

#### Network Configuration for Mobile
Update your frontend API service to use your machine's IP:
```javascript
// In frontend/src/services/api.js
const API_BASE_URL = 'http://192.168.1.100:5000'; // Replace with your IP
```

Find your IP address:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig | grep inet
```

### Performance Optimization

#### Backend
- Use connection pooling for database
- Implement caching with Redis
- Add database indexes for frequently queried columns

#### Frontend
- Enable code splitting in Vite
- Optimize images and assets
- Use lazy loading for components

#### Mobile
- Enable production builds for testing
- Minimize bundle size
- Use native plugins sparingly

## Security Notes

- Change the `SECRET_KEY` and `JWT_SECRET_KEY` in production
- Use environment variables for sensitive configuration
- Implement proper permission checking based on user types
- Add rate limiting for production use

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error
