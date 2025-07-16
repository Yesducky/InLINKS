from functools import wraps
from flask import jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import User, UserType, Permission, UserTypePermission, PermissionAudit
from __init__ import db
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


def get_user_permissions(user):
    """
    Get all permissions for a user
    """
    user_type = UserType.query.get(user.user_type_id)
    if not user_type:
        return []
    
    # Get all permissions for this user type
    permissions = db.session.query(Permission).join(
        UserTypePermission,
        Permission.id == UserTypePermission.permission_id
    ).filter(UserTypePermission.user_type_id == user_type.id).all()
    
    return [permission.id for permission in permissions]

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