from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.auth_middleware import require_permission, get_user_permissions
from models import Permission, UserTypePermission, User, UserType, PermissionAudit
from __init__ import db

permission_bp = Blueprint('permission', __name__)

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

@permission_bp.route('/auth/permissions', methods=['GET'])
@jwt_required()
def get_current_user_permissions():
    """Get current user's permissions"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_type = UserType.query.get(user.user_type_id)
    permissions = get_user_permissions(user)
    
    return jsonify({
        'user_id': user.id,
        'username': user.username,
        'user_type': {
            'id': user_type.id if user_type else None,
            'type': user_type.type if user_type else None,
            'permission': user_type.permission if user_type else None
        },
        'permissions': permissions
    })

@permission_bp.route('/user-types', methods=['GET'])
@require_permission('admin.roles')
def get_user_types():
    """Get all user types"""
    user_types = UserType.query.all()
    return jsonify([{
        'id': ut.id,
        'type': ut.type,
        'permission': ut.permission,
        'card_menus_id': ut.card_menus_id,
        'user_ids': ut.user_ids,
        'created_at': ut.created_at.isoformat() if ut.created_at else None
    } for ut in user_types])

@permission_bp.route('/users/<user_id>/permissions', methods=['GET'])
@require_permission('admin.users')
def get_user_permissions_by_id(user_id):
    """Get permissions for a specific user"""
    user = User.query.get_or_404(user_id)
    user_type = UserType.query.get(user.user_type_id)
    permissions = get_user_permissions(user)
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type_id': user.user_type_id,
            'is_active': user.is_active
        },
        'user_type': {
            'id': user_type.id if user_type else None,
            'type': user_type.type if user_type else None,
            'permission': user_type.permission if user_type else None
        },
        'permissions': permissions
    })

@permission_bp.route('/audit', methods=['GET'])
@require_permission('admin.roles')
def get_permission_audit():
    """Get permission audit logs"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    user_id = request.args.get('user_id')
    
    query = PermissionAudit.query.order_by(PermissionAudit.timestamp.desc())
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    audit_logs = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'audit_logs': [{
            'id': log.id,
            'user_id': log.user_id,
            'permission_id': log.permission_id,
            'action': log.action,
            'resource_id': log.resource_id,
            'status': log.status,
            'timestamp': log.timestamp.isoformat() if log.timestamp else None,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent
        } for log in audit_logs.items],
        'pagination': {
            'page': audit_logs.page,
            'per_page': audit_logs.per_page,
            'total': audit_logs.total,
            'pages': audit_logs.pages,
            'has_next': audit_logs.has_next,
            'has_prev': audit_logs.has_prev
        }
    })

