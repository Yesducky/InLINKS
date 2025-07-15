"""
Carton management routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Carton, MaterialType
from utils.db_utils import generate_id
from utils.item_utils import get_item_with_children_recursive
from __init__ import db
import json

carton_bp = Blueprint('carton', __name__)

@carton_bp.route('/cartons', methods=['GET', 'POST'])
@jwt_required()
def cartons():
    """
    GET: Retrieve all cartons
    POST: Create a new carton
    """
    if request.method == 'GET':
        cartons = Carton.query.all()
        return jsonify([{
            'id': c.id,
            'parent_lot_id': c.parent_lot_id,
            'material_type_id': c.material_type_id,
            'item_ids': c.item_ids,
            'log_ids': c.log_ids,
            'created_at': c.created_at.isoformat()
        } for c in cartons])

    elif request.method == 'POST':
        data = request.get_json()

        # Validate required fields
        if not data.get('parent_lot_id'):
            return jsonify({'error': 'parent_lot_id is required'}), 400
        if not data.get('material_type_id'):
            return jsonify({'error': 'material_type_id is required'}), 400

        carton_id = generate_id('CTN', Carton)

        carton = Carton(
            id=carton_id,
            parent_lot_id=data['parent_lot_id'],
            material_type_id=data['material_type_id'],
            item_ids=data.get('item_ids', '[]'),
            log_ids=data.get('log_ids', '[]')
        )

        try:
            db.session.add(carton)
            db.session.commit()
            return jsonify({'message': 'Carton created successfully', 'id': carton_id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to create carton', 'details': str(e)}), 500

@carton_bp.route('/cartons/<string:carton_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def carton_detail(carton_id):
    """
    GET: Retrieve a specific carton
    PUT: Update a specific carton
    DELETE: Delete a specific carton
    """
    carton = Carton.query.get_or_404(carton_id)

    if request.method == 'GET':
        # Get parent lot information
        from models import Lot
        parent_lot = Lot.query.get(carton.parent_lot_id)
        factory_lot_number = parent_lot.factory_lot_number if parent_lot else None

        return jsonify({
            'id': carton.id,
            'parent_lot_id': carton.parent_lot_id,
            'factory_lot_number': factory_lot_number,
            'material_type_id': carton.material_type_id,
            'item_ids': carton.item_ids,
            'log_ids': carton.log_ids,
            'created_at': carton.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()

        # Update only allowed fields
        if 'item_ids' in data:
            carton.item_ids = data['item_ids']
        if 'log_ids' in data:
            carton.log_ids = data['log_ids']

        try:
            db.session.commit()
            return jsonify({'message': 'Carton updated successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to update carton', 'details': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            db.session.delete(carton)
            db.session.commit()
            return jsonify({'message': 'Carton deleted successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to delete carton', 'details': str(e)}), 500

@carton_bp.route('/cartons/<string:carton_id>/items', methods=['GET'])
@jwt_required()
def carton_items(carton_id):
    """
    Get all items in a specific carton including their children recursively, and include factory lot number from the parent lot
    """
    from models import Item, Lot
    carton = Carton.query.get_or_404(carton_id)

    # Parse item IDs from JSON string
    try:
        item_ids = json.loads(carton.item_ids) if carton.item_ids else []
    except json.JSONDecodeError:
        item_ids = []

    # Get all items in this carton (including children) using recursive function
    all_items_with_children = []
    for item_id in item_ids:
        # Get the item and all its children recursively
        item_tree = get_item_with_children_recursive(item_id)
        all_items_with_children.extend(item_tree)

    # Calculate statistics
    total_items = len(all_items_with_children)
    available_items = len([item for item in all_items_with_children if item['status'] == 'available'])
    used_items = len([item for item in all_items_with_children if item['status'] == 'used'])
    assigned_items = len([item for item in all_items_with_children if item['status'] == 'assigned'])

    total_quantity = sum(item['quantity'] for item in all_items_with_children)
    available_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'available')
    used_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'used')
    assigned_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'assigned')

    # Get factory lot number from parent lot
    factory_lot_number = None
    if carton.parent_lot_id:
        lot = Lot.query.get(carton.parent_lot_id)
        if lot:
            factory_lot_number = lot.factory_lot_number

    return jsonify({
        'carton_id': carton_id,
        'factory_lot_number': factory_lot_number,
        'statistics': {
            'total_items': total_items,
            'available_items': available_items,
            'used_items': used_items,
            'assigned_items': assigned_items,
            'total_quantity': float(total_quantity),
            'available_quantity': float(available_quantity),
            'used_quantity': float(used_quantity),
            'assigned_quantity': float(assigned_quantity)
        },
        'items': all_items_with_children
    })

@carton_bp.route('/cartons/<string:carton_id>/logs', methods=['GET'])
@jwt_required()
def carton_logs(carton_id):
    """
    Get all logs for a specific carton
    """
    from models import StockLog
    carton = Carton.query.get_or_404(carton_id)

    # Parse log IDs from JSON string
    try:
        log_ids = json.loads(carton.log_ids) if carton.log_ids else []
    except json.JSONDecodeError:
        log_ids = []

    logs = StockLog.query.filter(StockLog.id.in_(log_ids)).all() if log_ids else []

    return jsonify([{
        'id': log.id,
        'date': log.date.isoformat(),
        'user_id': log.user_id,
        'description': log.description,
        'task_id': log.task_id,
        'item_id': log.item_id,
        'created_at': log.created_at.isoformat()
    } for log in logs])

@carton_bp.route('/cartons/lot/<string:lot_id>', methods=['GET'])
@jwt_required()
def cartons_by_lot(lot_id):
    """
    Get all cartons for a specific lot
    Includes detailed information about each carton including item counts and quantities
    Uses recursive item retrieval to include child items
    """
    try:
        from models import Lot

        # Verify lot exists
        lot = Lot.query.get(lot_id)
        if not lot:
            return jsonify({'error': 'Lot not found'}), 404

        # Get all cartons for this lot
        cartons = Carton.query.filter_by(parent_lot_id=lot_id).all()

        result = []
        for carton in cartons:
            # Parse item IDs from JSON string
            try:
                item_ids = json.loads(carton.item_ids) if carton.item_ids else []
            except json.JSONDecodeError:
                item_ids = []

            # Get all items in this carton (including children) using recursive function
            all_items_with_children = []
            for item_id in item_ids:
                # Get the item and all its children recursively
                item_tree = get_item_with_children_recursive(item_id)
                all_items_with_children.extend(item_tree)

            # Calculate item statistics including all child items
            total_items = len(all_items_with_children)
            available_items = len([item for item in all_items_with_children if item['status'] == 'available'])
            used_items = len([item for item in all_items_with_children if item['status'] == 'used'])
            assigned_items = len([item for item in all_items_with_children if item['status'] == 'assigned'])

            # Calculate quantity statistics including all child items
            total_quantity = sum(item['quantity'] for item in all_items_with_children)
            available_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'available')
            used_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'used')
            assigned_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'assigned')

            # Parse log IDs from JSON string
            try:
                log_ids = json.loads(carton.log_ids) if carton.log_ids else []
            except json.JSONDecodeError:
                log_ids = []

            result.append({
                'id': carton.id,
                'parent_lot_id': carton.parent_lot_id,
                'material_type_id': carton.material_type_id,
                'total_items': total_items,
                'available_items': available_items,
                'used_items': used_items,
                'assigned_items': assigned_items,
                'total_quantity': float(total_quantity),
                'available_quantity': float(available_quantity),
                'used_quantity': float(used_quantity),
                'assigned_quantity': float(assigned_quantity),
                'item_ids': item_ids,
                'all_items': all_items_with_children,  # Include all items with their children
                'log_ids': log_ids,
                'log_count': len(log_ids),
                'created_at': carton.created_at.isoformat()
            })

        return jsonify({
            'lot': {
                'id': lot.id,
                'material_type_id': lot.material_type_id,
                'factory_lot_number': lot.factory_lot_number
            },
            'cartons': result,
            'total_cartons': len(result)
        })

    except Exception as e:
        return jsonify({'error': f'Failed to get cartons for lot: {str(e)}'}), 500
