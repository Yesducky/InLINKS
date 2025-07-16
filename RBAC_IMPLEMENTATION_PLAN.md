# Role-Based Access Control (RBAC) Implementation Plan

## Overview
Transform the current basic authentication system into a comprehensive RBAC system with dynamic permissions.

## 1. Database Schema Updates

### New Tables Needed:
```sql
-- Permissions table for granular access control
CREATE TABLE permissions (
    id VARCHAR(50) PRIMARY KEY,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for user type permissions
CREATE TABLE user_type_permissions (
    user_type_id VARCHAR(20) NOT NULL,
    permission_id VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_type_id, permission_id),
    FOREIGN KEY (user_type_id) REFERENCES UserType(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- Audit log for permission actions
CREATE TABLE permission_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(50) NOT NULL,
    permission_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    status VARCHAR(20) NOT NULL, -- 'granted', 'denied'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

### Sample Permissions:
```sql
INSERT INTO permissions VALUES
('items.read', 'items', 'read', 'View item details'),
('items.write', 'items', 'write', 'Edit item details'),
('items.delete', 'items', 'delete', 'Delete items'),
('items.create', 'items', 'create', 'Create new items'),
('lots.read', 'lots', 'read', 'View lot details'),
('lots.write', 'lots', 'write', 'Edit lot details'),
('inventory.read', 'inventory', 'read', 'View inventory'),
('inventory.write', 'inventory', 'write', 'Manage inventory'),
('admin.users', 'admin', 'users', 'Manage users'),
('admin.roles', 'admin', 'roles', 'Manage roles'),
('dashboard.view', 'dashboard', 'view', 'Access dashboard');
```

## 2. Backend Implementation

### A. Permission Middleware (`auth_middleware.py`)
```python
from functools import wraps
from flask import jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import User, UserType, Permission, UserTypePermission, PermissionAudit
import logging

def require_permission(permission_id):
    """Decorator to check if user has specific permission"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            try:
                current_user_id = get_jwt_identity()
                user = User.query.get(current_user_id)
                
                if not user or not user.is_active:
                    log_permission_attempt(current_user_id, permission_id, 'denied', 'inactive_user')
                    return jsonify({'error': 'User inactive'}), 403
                
                if has_permission(user, permission_id):
                    log_permission_attempt(current_user_id, permission_id, 'granted')
                    return f(*args, **kwargs)
                else:
                    log_permission_attempt(current_user_id, permission_id, 'denied', 'insufficient_permissions')
                    return jsonify({'error': 'Insufficient permissions'}), 403
                    
            except Exception as e:
                current_app.logger.error(f"Permission check error: {str(e)}")
                return jsonify({'error': 'Authorization error'}), 500
                
        return decorated_function
    return decorator

def has_permission(user, permission_id):
    """Check if user has specific permission"""
    user_type = UserType.query.get(user.user_type_id)
    if not user_type:
        return False
    
    # Check if user type has this permission
    permission_exists = UserTypePermission.query.filter_by(
        user_type_id=user_type.id,
        permission_id=permission_id
    ).first()
    
    return permission_exists is not None

def log_permission_attempt(user_id, permission_id, status, reason=None):
    """Log permission attempts for audit"""
    try:
        audit_log = PermissionAudit(
            user_id=user_id,
            permission_id=permission_id,
            action=request.method,
            resource_id=request.endpoint,
            status=status,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Failed to log permission attempt: {str(e)}")
```

### B. Update API Routes
```python
# Example for items_routes.py
from auth_middleware import require_permission

@items_bp.route('/items', methods=['GET'])
@require_permission('items.read')
def get_items():
    # Implementation

@items_bp.route('/items/<item_id>', methods=['PUT'])
@require_permission('items.write')
def update_item(item_id):
    # Implementation

@items_bp.route('/items/<item_id>', methods=['DELETE'])
@require_permission('items.delete')
def delete_item(item_id):
    # Implementation
```

### C. Permission Management API
```python
# New route: permission_routes.py
@permission_bp.route('/permissions', methods=['GET'])
@require_permission('admin.roles')
def get_permissions():
    """Get all available permissions"""
    permissions = Permission.query.all()
    return jsonify([{
        'id': p.id,
        'resource': p.resource,
        'action': p.action,
        'description': p.description
    } for p in permissions])

@permission_bp.route('/user-types/<user_type_id>/permissions', methods=['GET'])
@require_permission('admin.roles')
def get_user_type_permissions(user_type_id):
    """Get permissions for specific user type"""
    permissions = db.session.query(Permission).join(
        UserTypePermission,
        Permission.id == UserTypePermission.permission_id
    ).filter(UserTypePermission.user_type_id == user_type_id).all()
    
    return jsonify([{
        'id': p.id,
        'resource': p.resource,
        'action': p.action,
        'description': p.description
    } for p in permissions])

@permission_bp.route('/user-types/<user_type_id>/permissions', methods=['POST'])
@require_permission('admin.roles')
def assign_permissions(user_type_id):
    """Assign permissions to user type"""
    data = request.json
    permission_ids = data.get('permission_ids', [])
    
    # Remove existing permissions
    UserTypePermission.query.filter_by(user_type_id=user_type_id).delete()
    
    # Add new permissions
    for permission_id in permission_ids:
        utp = UserTypePermission(
            user_type_id=user_type_id,
            permission_id=permission_id
        )
        db.session.add(utp)
    
    db.session.commit()
    return jsonify({'message': 'Permissions updated successfully'})
```

## 3. Frontend Implementation

### A. Permission Service (`src/services/permissionService.js`)
```javascript
class PermissionService {
    constructor() {
        this.permissions = new Set();
        this.userType = null;
    }

    async initialize() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return false;

            const response = await fetch('/api/auth/permissions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.permissions = new Set(data.permissions);
                this.userType = data.userType;
                return true;
            }
        } catch (error) {
            console.error('Failed to initialize permissions:', error);
        }
        return false;
    }

    hasPermission(permissionId) {
        return this.permissions.has(permissionId);
    }

    canRead(resource) {
        return this.hasPermission(`${resource}.read`);
    }

    canWrite(resource) {
        return this.hasPermission(`${resource}.write`);
    }

    canDelete(resource) {
        return this.hasPermission(`${resource}.delete`);
    }

    canCreate(resource) {
        return this.hasPermission(`${resource}.create`);
    }

    isAdmin() {
        return this.hasPermission('admin.users') || this.hasPermission('admin.roles');
    }
}

export default new PermissionService();
```

### B. Permission Hook (`src/hooks/usePermissions.js`)
```javascript
import { useState, useEffect } from 'react';
import permissionService from '../services/permissionService';

export const usePermissions = () => {
    const [permissions, setPermissions] = useState(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializePermissions = async () => {
            const success = await permissionService.initialize();
            if (success) {
                setPermissions(permissionService.permissions);
            }
            setLoading(false);
        };

        initializePermissions();
    }, []);

    return {
        permissions,
        loading,
        hasPermission: (permissionId) => permissions.has(permissionId),
        canRead: (resource) => permissions.has(`${resource}.read`),
        canWrite: (resource) => permissions.has(`${resource}.write`),
        canDelete: (resource) => permissions.has(`${resource}.delete`),
        canCreate: (resource) => permissions.has(`${resource}.create`),
        isAdmin: () => permissions.has('admin.users') || permissions.has('admin.roles')
    };
};
```

### C. Permission Component (`src/components/PermissionGate.jsx`)
```javascript
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

const PermissionGate = ({ 
    permission, 
    resource, 
    action, 
    children, 
    fallback = null,
    requireAll = false 
}) => {
    const { hasPermission, canRead, canWrite, canDelete, canCreate, loading } = usePermissions();

    if (loading) {
        return <div>Loading...</div>;
    }

    let hasAccess = false;

    if (permission) {
        // Direct permission check
        if (Array.isArray(permission)) {
            hasAccess = requireAll 
                ? permission.every(p => hasPermission(p))
                : permission.some(p => hasPermission(p));
        } else {
            hasAccess = hasPermission(permission);
        }
    } else if (resource && action) {
        // Resource.action permission check
        switch (action) {
            case 'read':
                hasAccess = canRead(resource);
                break;
            case 'write':
                hasAccess = canWrite(resource);
                break;
            case 'delete':
                hasAccess = canDelete(resource);
                break;
            case 'create':
                hasAccess = canCreate(resource);
                break;
            default:
                hasAccess = hasPermission(`${resource}.${action}`);
        }
    }

    return hasAccess ? children : fallback;
};

export default PermissionGate;
```

## 4. Usage Examples

### Updated Item.jsx Component
```javascript
import PermissionGate from '../components/PermissionGate';

const Item = () => {
    // ... existing code ...

    return (
        <div className="item-container">
            <PermissionGate resource="items" action="read">
                <div className="item-details">
                    {/* Item details */}
                </div>
            </PermissionGate>

            <PermissionGate resource="items" action="write">
                <button onClick={() => setEditMode(true)}>
                    Edit
                </button>
            </PermissionGate>

            <PermissionGate permission="admin.users">
                <div className="admin-only-fields">
                    {/* Admin-only content */}
                </div>
            </PermissionGate>
        </div>
    );
};
```

### Dashboard with Dynamic Permissions
```javascript
const Dashboard = () => {
    const { canRead } = usePermissions();

    return (
        <div className="dashboard">
            <PermissionGate resource="dashboard" action="view">
                <div className="dashboard-content">
                    {/* Dashboard content */}
                </div>
            </PermissionGate>

            <PermissionGate resource="inventory" action="read">
                <DashboardCard title="Inventory" />
            </PermissionGate>
        </div>
    );
};
```

## 5. Implementation Steps

1. **Database Migration**: Create new tables and seed initial permissions
2. **Backend API Updates**: Add permission middleware to all routes
3. **Frontend Service**: Implement permission service and hooks
4. **Component Updates**: Replace hard-coded checks with PermissionGate
5. **Admin Interface**: Build permission management UI
6. **Testing**: Test all permission scenarios
7. **Monitoring**: Set up audit logging and monitoring

## 6. Security Benefits

- **Server-side authorization**: All permissions validated on backend
- **Granular control**: Fine-grained permissions for each resource/action
- **Audit trails**: Complete logging of all permission checks
- **Dynamic management**: Permissions can be changed without code deployment
- **Scalability**: Easy to add new permissions and roles

## 7. Migration Strategy

1. **Phase 1**: Implement backend permission system alongside existing checks
2. **Phase 2**: Update frontend to use permission service
3. **Phase 3**: Remove hard-coded role checks
4. **Phase 4**: Add admin interface for permission management
5. **Phase 5**: Full rollout with monitoring

This comprehensive RBAC system will provide secure, scalable, and maintainable access control for your application.