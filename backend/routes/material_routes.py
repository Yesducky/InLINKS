"""
Material management routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Lot, Carton, Item, StockLog, MaterialType
from utils.db_utils import generate_id
from __init__ import db
import json
from sqlalchemy import func

material_bp = Blueprint('material', __name__)

# Add Material endpoint - creates Lot, Cartons, and Items in one operation
@material_bp.route('/add_material', methods=['POST'])
@jwt_required()
def add_material():
    data = request.get_json()
    current_user_id = get_jwt_identity()

    # Extract required fields
    material_type_id = data.get('material_type_id')
    factory_lot_number = data.get('factory_lot_number')
    total_quantity = data.get('total_quantity')
    carton_count = data.get('carton_count')
    items_per_carton = data.get('items_per_carton')
    item_quantity = data.get('item_quantity')

    # Validate required fields
    if not all([material_type_id, factory_lot_number, total_quantity, carton_count, items_per_carton]):
        return jsonify({'error': 'All fields are required'}), 400

    try:
        # Convert to appropriate types
        total_quantity = float(total_quantity)
        carton_count = int(carton_count)
        items_per_carton = int(items_per_carton)
        item_quantity = float(item_quantity)

        # Validate the math
        if total_quantity != carton_count * items_per_carton * item_quantity:
            return jsonify({
                'error': f'Invalid quantities: total_quantity ({total_quantity}) must equal carton_count ({carton_count}) × items_per_carton ({items_per_carton}) × item_quantity ({item_quantity})'
            }), 400

        if carton_count <= 0 or items_per_carton <= 0 or total_quantity <= 0 or item_quantity <= 0:
            return jsonify({'error': 'All quantities must be positive numbers'}), 400

    except (ValueError, TypeError):
        return jsonify({'error': 'Quantities must be valid numbers'}), 400

    try:
        # Start transaction
        db.session.begin()

        # 1. Pre-generate all IDs to avoid conflicts
        lot_id = generate_id('LOT', Lot)

        # Get the latest carton ID and generate sequential IDs
        latest_carton = Carton.query.filter(Carton.id.like('CTN%')).order_by(Carton.id.desc()).first()
        carton_start_num = int(latest_carton.id[3:]) + 1 if latest_carton else 1

        # Get the latest item ID and generate sequential IDs
        latest_item = Item.query.filter(Item.id.like('ITM%')).order_by(Item.id.desc()).first()
        item_start_num = int(latest_item.id[3:]) + 1 if latest_item else 1

        # Generate all carton IDs sequentially
        carton_ids = []
        for i in range(carton_count):
            carton_id = f'CTN{carton_start_num + i:05d}'
            carton_ids.append(carton_id)

        # Generate all item IDs sequentially
        all_item_ids = []
        item_ids_per_carton = []
        item_counter = 0
        for i in range(carton_count):
            item_ids = []
            for j in range(items_per_carton):
                item_id = f'ITM{item_start_num + item_counter:06d}'
                item_ids.append(item_id)
                all_item_ids.append(item_id)
                item_counter += 1
            item_ids_per_carton.append(item_ids)

        # 2. Create Items
        for carton_idx, carton_id in enumerate(carton_ids):
            item_ids = item_ids_per_carton[carton_idx]
            for item_id in item_ids:
                # Create Item
                item = Item(
                    id=item_id,
                    material_type_id=material_type_id,
                    quantity=item_quantity,
                    status='available',
                    parent_id=carton_id,
                    child_item_ids='[]',
                    log_ids='[]',
                    task_ids='[]'
                )
                db.session.add(item)

        # 3. Create Cartons
        for carton_idx, carton_id in enumerate(carton_ids):
            item_ids = item_ids_per_carton[carton_idx]
            carton = Carton(
                id=carton_id,
                parent_lot_id=lot_id,
                material_type_id=material_type_id,
                item_ids=json.dumps(item_ids),
                log_ids='[]'
            )
            db.session.add(carton)

        # 4. Create Lot with carton IDs
        lot = Lot(
            id=lot_id,
            material_type_id=material_type_id,
            factory_lot_number=factory_lot_number,
            carton_ids=json.dumps(carton_ids),
            log_ids='[]',
            created_user_id=current_user_id
        )
        db.session.add(lot)

        # 5. Create Stock Log for the lot creation
        stock_log_id = generate_id('SL', StockLog)
        stock_log = StockLog(
            id=stock_log_id,
            user_id=current_user_id,
            description=f'Material added: Lot {lot_id} ({factory_lot_number}) - {total_quantity} items in {carton_count} cartons',
            task_id=None,
            item_id=all_item_ids[0] if all_item_ids else None  # Reference first item as representative
        )
        db.session.add(stock_log)

        # Update all items to include the stock log ID
        for item_id in all_item_ids:
            item = Item.query.get(item_id)
            if item:
                item.log_ids = json.dumps([stock_log_id])

        # Update all cartons to include the stock log ID
        for carton_id in carton_ids:
            carton = Carton.query.get(carton_id)
            if carton:
                carton.log_ids = json.dumps([stock_log_id])

        # Update lot to include the stock log ID
        lot.log_ids = json.dumps([stock_log_id])

        # Commit transaction
        db.session.commit()

        return jsonify({
            'message': 'Material added successfully',
            'lot_id': lot_id,
            'carton_count': carton_count,
            'total_items': total_quantity,
            'carton_ids': carton_ids,
            'stock_log_id': stock_log_id
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding material: {str(e)}")
        return jsonify({'error': f'Failed to add material: {str(e)}'}), 500

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
            Item.status,
            func.sum(Item.quantity).label('total_quantity'),
            func.count(Item.id).label('item_count')
        ).join(
            MaterialType, Item.material_type_id == MaterialType.id
        ).group_by(
            Item.material_type_id,
            MaterialType.material_name,
            MaterialType.material_unit,
            Item.status
        ).all()

        # Group results by material type
        material_types = {}
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

            if qty.status == 'available':
                material_types[material_id]['available_quantity'] = quantity
                material_types[material_id]['available_items'] = item_count
            elif qty.status == 'used':
                material_types[material_id]['used_quantity'] = quantity
                material_types[material_id]['used_items'] = item_count
            elif qty.status == 'assigned':
                material_types[material_id]['assigned_quantity'] = quantity
                material_types[material_id]['assigned_items'] = item_count

            # Add to totals
            material_types[material_id]['total_quantity'] += quantity
            material_types[material_id]['total_items'] += item_count

        result = list(material_types.values())

        return jsonify({
            'material_type_quantities': result,
            'total_material_types': len(result)
        })

    except Exception as e:
        return jsonify({'error': f'Failed to get material type quantities: {str(e)}'}), 500
