"""
Material management routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Lot, Carton, Item, StockLog, MaterialType, ItemStateType
from utils.db_utils import generate_id
from __init__ import db
import json
from sqlalchemy import func

material_bp = Blueprint('material', __name__)

# Material Type Quantities API - Get total quantity for each material type
@material_bp.route('/material_type_quantities', methods=['GET'])
@jwt_required()
def material_type_quantities():
    """
    Get the total available, used, and assigned quantities for each material type
    Returns aggregated quantities grouped by material type and status
    """
    try:
        # Query to get quantities per material type and status
        quantities = db.session.query(
            Item.material_type_id,
            MaterialType.material_name,
            MaterialType.material_unit,
            ItemStateType.state_name,
            ItemStateType.id.label('state_id'),
            func.sum(Item.quantity).label('total_quantity'),
            func.count(Item.id).label('item_count')
        ).join(
            MaterialType, Item.material_type_id == MaterialType.id
        ).join(
            ItemStateType, Item.state_id == ItemStateType.id
        ).group_by(
            Item.material_type_id,
            MaterialType.material_name,
            MaterialType.material_unit,
            ItemStateType.state_name,
            ItemStateType.id
        ).all()

        # Group results by material type
        material_types = {}
        print('quantities', quantities)
        for qty in quantities:
            material_id = qty.material_type_id

            if material_id not in material_types:
                material_types[material_id] = {
                    'material_type_id': material_id,
                    'material_name': qty.material_name,
                    'material_unit': qty.material_unit,
                    'available_quantity': 0,
                    'used_quantity': 0,
                    'assigned_quantity': 0,
                    'available_items': 0,
                    'used_items': 0,
                    'assigned_items': 0,
                    'total_quantity': 0,
                    'total_items': 0
                }

            # Add quantities based on status
            quantity = float(qty.total_quantity) if qty.total_quantity else 0
            item_count = qty.item_count

            if qty.state_name == 'Available':
                material_types[material_id]['available_quantity'] = quantity
                material_types[material_id]['available_items'] = item_count
            elif qty.state_name in ['Assigned to Worker', 'Assigned to task', 'Reserved']:
                material_types[material_id]['assigned_quantity'] = quantity
                material_types[material_id]['assigned_items'] = item_count
            else:
                material_types[material_id]['used_quantity'] = quantity
                material_types[material_id]['used_items'] = item_count

            # Add to totals
            material_types[material_id]['total_quantity'] += quantity
            material_types[material_id]['total_items'] += item_count

        result = list(material_types.values())

        return jsonify({
            'material_type_quantities': result,
            'total_material_types': len(result)
        })

    except Exception as e:
        print(e)
        return jsonify({'error': f'Failed to get material type quantities: {str(e)}'}), 500
