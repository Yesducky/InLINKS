"""
Lot management routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import Lot, Item, MaterialType
from utils.db_utils import generate_id
from utils.item_utils import get_item_with_children_recursive
from __init__ import db
import json

lot_bp = Blueprint('lot', __name__)

# Lots endpoints
@lot_bp.route('/lots', methods=['GET', 'POST'])
@jwt_required()
def lots():
    if request.method == 'GET':
        lots = Lot.query.join(MaterialType, Lot.material_type_id == MaterialType.id).all()
        result = []

        for l in lots:
            # Get carton count
            carton_ids = json.loads(l.carton_ids) if l.carton_ids else []
            carton_count = len(carton_ids)

            # Get all items in this lot (including children) using recursive function
            all_items_with_children = []
            for carton_id in carton_ids:
                # Get items directly in this carton
                carton_items = Item.query.filter_by(parent_id=carton_id).all()
                for item in carton_items:
                    # Get the item and all its children recursively
                    item_tree = get_item_with_children_recursive(item.id)
                    all_items_with_children.extend(item_tree)

            # Calculate totals including all child items
            total_items = len(all_items_with_children)
            available_items = len([item for item in all_items_with_children if item['status'] == 'available'])
            used_items = len([item for item in all_items_with_children if item['status'] == 'used'])
            assigned_items = len([item for item in all_items_with_children if item['status'] == 'assigned'])

            # Calculate quantities including all child items
            total_quantity = sum(item['quantity'] for item in all_items_with_children)
            available_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'available')
            used_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'used')
            assigned_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'assigned')

            result.append({
                'id': l.id,
                'material_type_id': l.material_type_id,
                'material_name': l.material_type.material_name,
                'material_unit': l.material_type.material_unit,
                'factory_lot_number': l.factory_lot_number,
                'carton_count': carton_count,
                'total_items': total_items,
                'available_items': available_items,
                'used_items': used_items,
                'assigned_items': assigned_items,
                'total_quantity': float(total_quantity),
                'available_quantity': float(available_quantity),
                'used_quantity': float(used_quantity),
                'assigned_quantity': float(assigned_quantity),
                'carton_ids': carton_ids,
                'all_items': all_items_with_children,  # Include all items with their children
                'log_ids': l.log_ids,
                'created_at': l.created_at.isoformat(),
                'created_user_id': l.created_user_id
            })

        return jsonify(result)

    elif request.method == 'POST':
        data = request.get_json()
        lot_id = generate_id('LOT', Lot)

        lot = Lot(
            id=lot_id,
            material_type_id=data['material_type_id'],
            factory_lot_number=data['factory_lot_number'],
            carton_ids=data.get('carton_ids', '[]'),
            log_ids=data.get('log_ids', '[]')
        )

        db.session.add(lot)
        db.session.commit()

        return jsonify({'message': 'Lot created', 'id': lot_id}), 201

@lot_bp.route('/lots/<string:lot_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def lot_detail(lot_id):
    lot = Lot.query.options(db.joinedload(Lot.material_type)).get_or_404(lot_id)

    if request.method == 'GET':
        # Get carton count
        carton_ids = json.loads(lot.carton_ids) if lot.carton_ids else []
        carton_count = len(carton_ids)

        # Get all items in this lot (including children) using recursive function
        all_items_with_children = []
        for carton_id in carton_ids:
            # Get items directly in this carton
            carton_items = Item.query.filter_by(parent_id=carton_id).all()
            for item in carton_items:
                # Get the item and all its children recursively
                item_tree = get_item_with_children_recursive(item.id)
                all_items_with_children.extend(item_tree)

        # Calculate totals including all child items
        total_items = len(all_items_with_children)
        available_items = len([item for item in all_items_with_children if item['status'] == 'available'])
        used_items = len([item for item in all_items_with_children if item['status'] == 'used'])
        assigned_items = len([item for item in all_items_with_children if item['status'] == 'assigned'])

        # Calculate quantities including all child items
        total_quantity = sum(item['quantity'] for item in all_items_with_children)
        available_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'available')
        used_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'used')
        assigned_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'assigned')

        return jsonify({
            'id': lot.id,
            'material_type_id': lot.material_type_id,
            'material_name': lot.material_type.material_name,
            'material_unit': lot.material_type.material_unit,
            'factory_lot_number': lot.factory_lot_number,
            'carton_count': carton_count,
            'total_items': total_items,
            'available_items': available_items,
            'used_items': used_items,
            'assigned_items': assigned_items,
            'total_quantity': float(total_quantity),
            'available_quantity': float(available_quantity),
            'used_quantity': float(used_quantity),
            'assigned_quantity': float(assigned_quantity),
            'carton_ids': carton_ids,
            'all_items': all_items_with_children,  # Include all items with their children
            'log_ids': lot.log_ids,
            'created_at': lot.created_at.isoformat(),
            'created_user_id': lot.created_user_id
        })

    elif request.method == 'PUT':
        data = request.get_json()
        lot.factory_lot_number = data.get('factory_lot_number', lot.factory_lot_number)
        lot.carton_ids = data.get('carton_ids', lot.carton_ids)
        lot.log_ids = data.get('log_ids', lot.log_ids)

        db.session.commit()
        return jsonify({'message': 'Lot updated'})

    elif request.method == 'DELETE':
        db.session.delete(lot)
        db.session.commit()
        return jsonify({'message': 'Lot deleted'})

# Lots by Material Type API - Get all lots for a specific material type
@lot_bp.route('/lots/material_type/<string:material_type_id>', methods=['GET'])
@jwt_required()
def lots_by_material_type(material_type_id):
    """
    Get all lots for a specific material type
    Includes detailed information about each lot including carton and item counts
    Uses recursive item retrieval to include child items
    """
    try:
        # Verify material type exists
        material_type = MaterialType.query.get(material_type_id)
        if not material_type:
            return jsonify({'error': 'Material type not found'}), 404

        # Get all lots for this material type
        lots = Lot.query.filter_by(material_type_id=material_type_id).all()

        result = []
        for lot in lots:
            # Get carton count
            carton_ids = json.loads(lot.carton_ids) if lot.carton_ids else []
            carton_count = len(carton_ids)

            # Get all items in this lot (including children) using recursive function
            all_items_with_children = []
            for carton_id in carton_ids:
                # Get items directly in this carton
                carton_items = Item.query.filter_by(parent_id=carton_id).all()
                for item in carton_items:
                    # Get the item and all its children recursively
                    item_tree = get_item_with_children_recursive(item.id)
                    all_items_with_children.extend(item_tree)

            # Calculate totals including all child items
            total_items = len(all_items_with_children)
            available_items = len([item for item in all_items_with_children if item['status'] == 'available'])
            used_items = len([item for item in all_items_with_children if item['status'] == 'used'])
            assigned_items = len([item for item in all_items_with_children if item['status'] == 'assigned'])

            # Calculate quantities including all child items
            total_quantity = sum(item['quantity'] for item in all_items_with_children)
            available_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'available')
            used_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'used')
            assigned_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'assigned')

            result.append({
                'id': lot.id,
                'material_type_id': lot.material_type_id,
                'factory_lot_number': lot.factory_lot_number,
                'carton_count': carton_count,
                'total_items': total_items,
                'available_items': available_items,
                'used_items': used_items,
                'assigned_items': assigned_items,
                'total_quantity': float(total_quantity),
                'available_quantity': float(available_quantity),
                'used_quantity': float(used_quantity),
                'assigned_quantity': float(assigned_quantity),
                'carton_ids': carton_ids,
                'all_items': all_items_with_children,  # Include all items with their children
                'log_ids': lot.log_ids,
                'created_at': lot.created_at.isoformat(),
                'created_user_id': lot.created_user_id
            })

        return jsonify({
            'material_type': {
                'id': material_type.id,
                'name': material_type.material_name,
                'unit': material_type.material_unit
            },
            'lots': result,
            'total_lots': len(result)
        })

    except Exception as e:
        return jsonify({'error': f'Failed to get lots for material type: {str(e)}'}), 500
