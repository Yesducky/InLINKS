"""
Utility routes - Dashboard, Search, Sample Data, Error Handlers
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Project, WorkOrder, Task, Item, MaterialType

utility_bp = Blueprint('utility', __name__)

@utility_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Get dashboard statistics"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    stats = {
        'total_projects': Project.query.count(),
        'total_work_orders': WorkOrder.query.count(),
        'total_tasks': Task.query.count(),
        'total_items': Item.query.count(),
        'available_items': Item.query.filter_by(status='available').count(),
        'assigned_items': Item.query.filter_by(status='assigned').count(),
        'used_items': Item.query.filter_by(status='used').count(),
        'user_info': {
            'id': user.id,
            'username': user.username,
            'user_type': user.user_type.type if user.user_type else None
        }
    }

    return jsonify(stats)

@utility_bp.route('/search', methods=['GET'])
@jwt_required()
def search():
    """Search across all entities"""
    query = request.args.get('q', '')
    entity_type = request.args.get('type', 'all')

    results = {}

    if entity_type in ['all', 'projects']:
        projects = Project.query.filter(Project.project_name.contains(query)).limit(10).all()
        results['projects'] = [{
            'id': p.id,
            'name': p.project_name,
            'type': 'project'
        } for p in projects]

    if entity_type in ['all', 'items']:
        items = Item.query.join(MaterialType).filter(MaterialType.material_name.contains(query)).limit(10).all()
        results['items'] = [{
            'id': i.id,
            'name': f"{i.material_type.material_name} ({i.quantity} {i.material_type.material_unit})",
            'type': 'item',
            'status': i.status
        } for i in items]

    if entity_type in ['all', 'users']:
        users = User.query.filter(User.username.contains(query)).limit(10).all()
        results['users'] = [{
            'id': u.id,
            'name': u.username,
            'type': 'user',
            'user_type': u.user_type.type if u.user_type else None
        } for u in users]

    return jsonify(results)


# Error handlers
@utility_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@utility_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@utility_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500
