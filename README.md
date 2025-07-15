# InLINKS Backend API

A Flask-based REST API for managing inventory, projects, and workflows with SQLite database and JWT authentication.

## Database Structure

The application uses SQLite with three main collections:

### Common Collection
- **User Types**: User roles with permissions (admin, worker, client, consultant, pm)
- **Users**: User accounts with authentication
- **Material Types**: Types of materials with units
- **Workflow Types**: Predefined workflow templates
- **Log Types**: Categories for logging activities

### Stock Collection
- **Lots**: Material lots from factory with tracking
- **Cartons**: Sub-containers within lots
- **Items**: Individual items with status tracking
- **Stock Logs**: Audit trail for stock movements

### Process Collection
- **Projects**: Main project containers
- **Work Orders**: Tasks within projects
- **Tasks**: Individual work items
- **Sub Tasks**: Detailed task breakdown with status tracking

## Installation

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
- Lots: `LOT001`, `LOT002`, ...
- Cartons: `CTN001`, `CTN002`, ...
- Items: `ITM001`, `ITM002`, ...
- Stock Logs: `SL001`, `SL002`, ...
- Projects: `PRJ001`, `PRJ002`, ...
- Work Orders: `WO001`, `WO002`, ...
- Tasks: `TSK001`, `TSK002`, ...
- Sub Tasks: `ST001`, `ST002`, ...

## Status Values

### ItemOverview Status
- `available` - Available for assignment
- `assigned` - Assigned to a task
- `used` - Already consumed/used

### Sub Task Status
- `design` - Design phase
- `pulling_cable` - Cable pulling phase
- `terminated` - Termination phase
- `completed` - Task completed

## Testing

Run the test script to verify API functionality:
```bash
python test_api.py
```

## Database File

The SQLite database file `inlinks.db` will be created automatically in the backend directory when the application starts.

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
