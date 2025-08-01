"""
Menu routes - Card menu management with user type-based access control
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
from models import CardMenu, User, UserType
from utils.db_utils import generate_id
from __init__ import db

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('/card-menus', methods=['GET'])
@jwt_required()
def get_card_menus():
    """Get card menus filtered by user type"""
    try:
        # Get current user from JWT
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 401

        # Get user type
        user_type = UserType.query.get(current_user.user_type_id)
        if not user_type:
            return jsonify({'error': 'User type not found'}), 401

        # Get allowed card menu IDs for this user type
        allowed_card_ids = []
        if user_type.card_menus_id:
            allowed_card_ids = json.loads(user_type.card_menus_id)

        card_menus = CardMenu.query.filter(
            CardMenu.id.in_(allowed_card_ids),
            CardMenu.is_active == True
        ).order_by(CardMenu.order_index).all()


        # Return card menu data
        filtered_menus = []
        for menu in card_menus:
            filtered_menus.append({
                'id': menu.id,
                'title': menu.title,
                'icon_name': menu.icon_name,
                'icon_color': menu.icon_color,
                'route_path': menu.route_path,
                'order_index': menu.order_index
            })

        return jsonify(filtered_menus), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@menu_bp.route('/card-menus/admin', methods=['GET', 'POST'])
@jwt_required()
def admin_card_menus():
    """Admin endpoints for managing card menus"""
    try:
        # Get current user and verify admin access
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        user_type = UserType.query.get(current_user.user_type_id)
        if not user_type or user_type.type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        if request.method == 'GET':
            # Get all card menus for admin management
            card_menus = CardMenu.query.order_by(CardMenu.order_index).all()
            return jsonify([{
                'id': menu.id,
                'title': menu.title,
                'icon_name': menu.icon_name,
                'icon_color': menu.icon_color,
                'route_path': menu.route_path,
                'order_index': menu.order_index,
                'is_active': menu.is_active,
                'created_at': menu.created_at.isoformat(),
                'updated_at': menu.updated_at.isoformat()
            } for menu in card_menus]), 200

        elif request.method == 'POST':
            # Create new card menu
            data = request.get_json()

            required_fields = ['title', 'icon_name', 'icon_color']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            menu_id = generate_id('CM', CardMenu)

            card_menu = CardMenu(
                id=menu_id,
                title=data['title'],
                icon_name=data['icon_name'],
                icon_color=data['icon_color'],
                route_path=data.get('route_path'),
                order_index=data.get('order_index', 0),
                is_active=data.get('is_active', True)
            )

            db.session.add(card_menu)
            db.session.commit()

            return jsonify({
                'message': 'Card menu created successfully',
                'id': menu_id
            }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@menu_bp.route('/card-menus/admin/<menu_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_card_menu_detail(menu_id):
    """Admin endpoints for updating/deleting specific card menu"""
    try:
        # Get current user and verify admin access
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        user_type = UserType.query.get(current_user.user_type_id)
        if not user_type or user_type.type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        card_menu = CardMenu.query.get(menu_id)
        if not card_menu:
            return jsonify({'error': 'Card menu not found'}), 404

        if request.method == 'PUT':
            # Update card menu
            data = request.get_json()

            if 'title' in data:
                card_menu.title = data['title']
            if 'icon_name' in data:
                card_menu.icon_name = data['icon_name']
            if 'icon_color' in data:
                card_menu.icon_color = data['icon_color']
            if 'route_path' in data:
                card_menu.route_path = data['route_path']
            if 'order_index' in data:
                card_menu.order_index = data['order_index']
            if 'is_active' in data:
                card_menu.is_active = data['is_active']

            db.session.commit()

            return jsonify({'message': 'Card menu updated successfully'}), 200

        elif request.method == 'DELETE':
            # Delete card menu
            db.session.delete(card_menu)
            db.session.commit()

            return jsonify({'message': 'Card menu deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@menu_bp.route('/user-types/<user_type_id>/card-menus', methods=['GET', 'PUT'])
@jwt_required()
def manage_user_type_card_menus(user_type_id):
    """Manage card menu assignments for a specific user type"""
    try:
        # Get current user and verify admin access
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        current_user_type = UserType.query.get(current_user.user_type_id)
        if not current_user_type or current_user_type.type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        # Get the target user type
        target_user_type = UserType.query.get(user_type_id)
        if not target_user_type:
            return jsonify({'error': 'User type not found'}), 404

        if request.method == 'GET':
            # Get assigned card menus for this user type
            assigned_card_ids = []
            if target_user_type.card_menus_id:
                assigned_card_ids = json.loads(target_user_type.card_menus_id)

            # Get all available card menus
            all_card_menus = CardMenu.query.order_by(CardMenu.order_index).all()

            return jsonify({
                'user_type': {
                    'id': target_user_type.id,
                    'type': target_user_type.type,
                    'permission': target_user_type.permission
                },
                'assigned_card_menus': assigned_card_ids,
                'available_card_menus': [{
                    'id': menu.id,
                    'title': menu.title,
                    'icon_name': menu.icon_name,
                    'icon_color': menu.icon_color,
                    'is_active': menu.is_active
                } for menu in all_card_menus]
            }), 200

        elif request.method == 'PUT':
            # Update card menu assignments for this user type
            data = request.get_json()

            if 'card_menu_ids' not in data:
                return jsonify({'error': 'Missing card_menu_ids field'}), 400

            # Validate that all provided card menu IDs exist
            card_menu_ids = data['card_menu_ids']
            if card_menu_ids:
                existing_menus = CardMenu.query.filter(CardMenu.id.in_(card_menu_ids)).all()
                if len(existing_menus) != len(card_menu_ids):
                    return jsonify({'error': 'One or more card menu IDs do not exist'}), 400

            # Update the user type's card menu assignments
            target_user_type.card_menus_id = json.dumps(card_menu_ids) if card_menu_ids else None
            db.session.commit()

            return jsonify({'message': 'Card menu assignments updated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@menu_bp.route('/card-menus/seed', methods=['POST'])
@jwt_required()
def seed_card_menus():
    """Seed initial card menu data"""
    try:
        # Get current user and verify admin access
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        user_type = UserType.query.get(current_user.user_type_id)
        if not user_type or user_type.type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        # Check if menus already exist
        existing_menus = CardMenu.query.count()
        if existing_menus > 0:
            return jsonify({'message': 'Card menus already exist'}), 400

        # Initial card menu data based on your frontend cardData
        initial_menus = [
            {
                'title': '庫存總覽',
                'icon_name': 'Inventory',
                'icon_color': 'text-blue-600',
                'route_path': '/stock-overview',
                'order_index': 1
            },
            {
                'title': '新增物料',
                'icon_name': 'Add',
                'icon_color': 'text-green-600',
                'route_path': '/add-material',
                'order_index': 2
            },
            {
                'title': '掃碼核驗',
                'icon_name': 'QrCodeScanner',
                'icon_color': 'text-purple-600',
                'route_path': '/qr-scan',
                'order_index': 3
            },
            {
                'title': '項目管理',
                'icon_name': 'Assignment',
                'icon_color': 'text-orange-600',
                'route_path': '/project-management',
                'order_index': 4
            },
            {
                'title': '用戶管理',
                'icon_name': 'People',
                'icon_color': 'text-teal-600',
                'route_path': '/user-management',
                'order_index': 5
            },
            {
                'title': '生成標籤',
                'icon_name': 'Label',
                'icon_color': 'text-indigo-600',
                'route_path': '/generate-labels',
                'order_index': 6
            }
        ]

        # Create card menus and collect their IDs
        created_menu_ids = []
        for menu_data in initial_menus:
            menu_id = generate_id('CM', CardMenu)

            card_menu = CardMenu(
                id=menu_id,
                title=menu_data['title'],
                icon_name=menu_data['icon_name'],
                icon_color=menu_data['icon_color'],
                route_path=menu_data['route_path'],
                order_index=menu_data['order_index'],
                is_active=True
            )

            db.session.add(card_menu)
            created_menu_ids.append(menu_id)

        db.session.commit()

        # Assign all menus to admin user type, and specific menus to other types
        admin_user_type = UserType.query.filter_by(type='admin').first()
        if admin_user_type:
            admin_user_type.card_menus_id = json.dumps(created_menu_ids)

        # For other user types, exclude user management (index 4)
        other_menu_ids = [menu_id for i, menu_id in enumerate(created_menu_ids) if i != 4]
        other_user_types = UserType.query.filter(UserType.type != 'admin').all()
        for other_type in other_user_types:
            other_type.card_menus_id = json.dumps(other_menu_ids)

        db.session.commit()

        return jsonify({
            'message': 'Card menus seeded successfully',
            'created_menus': len(created_menu_ids),
            'menu_ids': created_menu_ids
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
