"""
Item routes - Handle all item-related operations
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import Item, Carton
from utils.db_utils import generate_id
from utils.item_utils import get_item_with_children_recursive
from __init__ import db
from utils.auth_middleware import require_permission

item_bp = Blueprint('item', __name__)

# Items endpoints
@item_bp.route('/items', methods=['GET', 'POST'])
@jwt_required()
@require_permission('items.read')
def items():
    """
    GET: Retrieve all items with parent type and lot information
    POST: Create a new item
    """
    if request.method == 'GET':
        items = Item.query.all()
        result = []

        for i in items:
            item_data = {
                'id': i.id,
                'material_type_id': i.material_type_id,
                'quantity': i.quantity,
                'status': i.status,
                'parent_id': i.parent_id,
                'parent_type': None,
                'lot_id': None,
                'child_item_ids': i.child_item_ids,
                'log_ids': i.log_ids,
                'task_ids': i.task_ids,
                'created_at': i.created_at.isoformat()
            }

            # Determine parent type and find lot_id if parent_id exists
            if i.parent_id:
                # Check if parent_id is a carton
                carton = Carton.query.get(i.parent_id)
                if carton:
                    item_data['parent_type'] = 'carton'
                    item_data['lot_id'] = carton.parent_lot_id
                else:
                    # Check if parent_id is an item
                    parent_item = Item.query.get(i.parent_id)
                    if parent_item:
                        item_data['parent_type'] = 'item'
                        # Recursively find the lot_id by tracing up the parent chain
                        current_parent_id = parent_item.parent_id
                        while current_parent_id:
                            # Check if current parent is a carton
                            parent_carton = Carton.query.get(current_parent_id)
                            if parent_carton:
                                item_data['lot_id'] = parent_carton.parent_lot_id
                                break
                            # Otherwise check if it's another item
                            parent_item = Item.query.get(current_parent_id)
                            if parent_item:
                                current_parent_id = parent_item.parent_id
                            else:
                                break

            result.append(item_data)

        return jsonify(result)

    elif request.method == 'POST':
        data = request.get_json()

        # Validate required fields
        if not data.get('material_type_id'):
            return jsonify({'error': 'material_type_id is required'}), 400
        if not data.get('quantity'):
            return jsonify({'error': 'quantity is required'}), 400

        item_id = generate_id('ITM', Item)

        item = Item(
            id=item_id,
            material_type_id=data['material_type_id'],
            quantity=data['quantity'],
            status=data.get('status', 'available'),
            parent_id=data.get('parent_id'),
            child_item_ids=data.get('child_item_ids', '[]'),
            log_ids=data.get('log_ids', '[]'),
            task_ids=data.get('task_ids', '[]')
        )

        try:
            db.session.add(item)
            db.session.commit()
            return jsonify({'message': 'Item created successfully', 'id': item_id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to create item', 'details': str(e)}), 500

@item_bp.route('/items/<string:item_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
@require_permission('items.read')
def item_detail(item_id):
    """
    GET: Retrieve a specific item
    PUT: Update a specific item
    DELETE: Delete a specific item
    """
    item = Item.query.get_or_404(item_id)

    if request.method == 'GET':
        # Get the item and all its children recursively
        item_tree = get_item_with_children_recursive(item_id)

        if not item_tree:
            return jsonify({'error': 'Item not found'}), 404

        # The first item in the tree is the main item
        main_item = item_tree[0]

        # Try to get factory lot number by tracing up the parent chain
        factory_lot_number = None
        parent_id = main_item.get('parent_id')
        from models import Carton, Lot
        while parent_id:
            carton = Carton.query.get(parent_id)
            if carton:
                lot = Lot.query.get(carton.parent_lot_id)
                if lot:
                    factory_lot_number = lot.factory_lot_number
                break
            parent_item = Item.query.get(parent_id)
            if parent_item:
                parent_id = parent_item.parent_id
            else:
                break

        response = dict(main_item)
        response['factory_lot_number'] = factory_lot_number
        return jsonify(response)

    elif request.method == 'PUT':
        data = request.get_json()

        # Update fields if provided
        if 'quantity' in data:
            item.quantity = data['quantity']
        if 'status' in data:
            item.status = data['status']
        if 'parent_id' in data:
            item.parent_id = data['parent_id']
        if 'child_item_ids' in data:
            item.child_item_ids = data['child_item_ids']
        if 'log_ids' in data:
            item.log_ids = data['log_ids']
        if 'task_ids' in data:
            item.task_ids = data['task_ids']

        try:
            db.session.commit()
            return jsonify({'message': 'Item updated successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to update item', 'details': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            db.session.delete(item)
            db.session.commit()
            return jsonify({'message': 'Item deleted successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to delete item', 'details': str(e)}), 500

@item_bp.route('/cartons/<string:carton_id>/items', methods=['GET'])
@jwt_required()
@require_permission('items.read')
def get_items_under_carton(carton_id):
    """
    GET: Retrieve all items under a specific carton, including nested child items
    Uses recursive item retrieval to include child items
    """
    try:
        # First, get all direct items under the carton
        direct_items = Item.query.filter_by(parent_id=carton_id).all()

        if not direct_items:
            return jsonify({
                'carton_id': carton_id,
                'statistics': {
                    'total_items': 0,
                    'available_items': 0,
                    'used_items': 0,
                    'assigned_items': 0,
                    'total_quantity': 0.0,
                    'available_quantity': 0.0,
                    'used_quantity': 0.0,
                    'assigned_quantity': 0.0
                },
                'items': []
            })

        # Get all items in this carton (including children) using recursive function
        all_items_with_children = []
        for item in direct_items:
            # Get the item and all its children recursively
            item_tree = get_item_with_children_recursive(item.id)
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

        return jsonify({
            'carton_id': carton_id,
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

    except Exception as e:
        return jsonify({'error': 'Failed to retrieve items under carton', 'details': str(e)}), 500

@item_bp.route('/lots/<string:lot_id>/items', methods=['GET'])
@jwt_required()
@require_permission('items.read')
def get_items_under_lot(lot_id):
    """
    GET: Retrieve all items under a specific lot, including nested child items
    This finds all cartons under the lot first, then gets all items under those cartons
    """
    try:
        # First, get all cartons under the lot
        cartons = Carton.query.filter_by(parent_lot_id=lot_id).all()

        if not cartons:
            return jsonify([])

        # Function to recursively get all child items
        def get_all_child_items(item, level=0):
            result = [{
                'id': item.id,
                'material_type_id': item.material_type_id,
                'quantity': item.quantity,
                'status': item.status,
                'parent_id': item.parent_id,
                'child_item_ids': item.child_item_ids,
                'log_ids': item.log_ids,
                'task_ids': item.task_ids,
                'created_at': item.created_at.isoformat(),
                'level': level
            }]

            # Parse child_item_ids and get child items recursively
            if item.child_item_ids and item.child_item_ids != '[]':
                try:
                    import json
                    child_ids = json.loads(item.child_item_ids)
                    for child_id in child_ids:
                        child_item = Item.query.get(child_id)
                        if child_item:
                            # Get child items recursively with incremented level
                            child_results = get_all_child_items(child_item, level + 1)
                            result.extend(child_results)
                except (json.JSONDecodeError, TypeError):
                    # If child_item_ids is not valid JSON, skip it
                    pass

            return result

        # Collect all items from all cartons under the lot
        all_items = []
        for carton in cartons:
            # Get all direct items under each carton
            direct_items = Item.query.filter_by(parent_id=carton.id).all()

            # For each direct item, get it and all its nested children
            for item in direct_items:
                all_items.extend(get_all_child_items(item))

        # Add carton information to each item for better context
        for item_data in all_items:
            # Find which carton this item belongs to (directly or through parent chain)
            current_parent_id = item_data['parent_id']
            carton_id = None

            # Trace up the parent chain to find the carton
            while current_parent_id:
                # Check if current parent is a carton
                carton = next((c for c in cartons if c.id == current_parent_id), None)
                if carton:
                    carton_id = carton.id
                    break
                # Otherwise check if it's an item and continue up the chain
                parent_item = Item.query.get(current_parent_id)
                if parent_item:
                    current_parent_id = parent_item.parent_id
                else:
                    break

            item_data['carton_id'] = carton_id
            item_data['lot_id'] = lot_id

        # Sort by carton, then by level, then by ID for clear hierarchy
        all_items.sort(key=lambda x: (x.get('carton_id', ''), x['level'], x['id']))

        return jsonify(all_items)

    except Exception as e:
        return jsonify({'error': 'Failed to retrieve items under lot', 'details': str(e)}), 500
