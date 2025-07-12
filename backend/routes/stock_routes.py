"""
Stock collection routes - Lots, Cartons, Items, Stock Logs
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Lot, Carton, Item, StockLog
from utils.db_utils import generate_id
from __init__ import db
import json

stock_bp = Blueprint('stock', __name__)

# Lots endpoints
@stock_bp.route('/lots', methods=['GET', 'POST'])
@jwt_required()
def lots():
    if request.method == 'GET':
        lots = Lot.query.all()
        return jsonify([{
            'id': l.id,
            'material_type_id': l.material_type_id,
            'factory_lot_number': l.factory_lot_number,
            'carton_ids': l.carton_ids,
            'log_ids': l.log_ids,
            'created_at': l.created_at.isoformat()
        } for l in lots])

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

@stock_bp.route('/lots/<string:lot_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def lot_detail(lot_id):
    lot = Lot.query.get_or_404(lot_id)

    if request.method == 'GET':
        return jsonify({
            'id': lot.id,
            'material_type_id': lot.material_type_id,
            'factory_lot_number': lot.factory_lot_number,
            'carton_ids': lot.carton_ids,
            'log_ids': lot.log_ids,
            'created_at': lot.created_at.isoformat()
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

# Cartons endpoints
@stock_bp.route('/cartons', methods=['GET', 'POST'])
@jwt_required()
def cartons():
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
        carton_id = generate_id('CTN', Carton)

        carton = Carton(
            id=carton_id,
            parent_lot_id=data['parent_lot_id'],
            material_type_id=data['material_type_id'],
            item_ids=data.get('item_ids', '[]'),
            log_ids=data.get('log_ids', '[]')
        )

        db.session.add(carton)
        db.session.commit()

        return jsonify({'message': 'Carton created', 'id': carton_id}), 201

@stock_bp.route('/cartons/<string:carton_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def carton_detail(carton_id):
    carton = Carton.query.get_or_404(carton_id)

    if request.method == 'GET':
        return jsonify({
            'id': carton.id,
            'parent_lot_id': carton.parent_lot_id,
            'material_type_id': carton.material_type_id,
            'item_ids': carton.item_ids,
            'log_ids': carton.log_ids,
            'created_at': carton.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        carton.item_ids = data.get('item_ids', carton.item_ids)
        carton.log_ids = data.get('log_ids', carton.log_ids)

        db.session.commit()
        return jsonify({'message': 'Carton updated'})

    elif request.method == 'DELETE':
        db.session.delete(carton)
        db.session.commit()
        return jsonify({'message': 'Carton deleted'})

# Items endpoints
@stock_bp.route('/items', methods=['GET', 'POST'])
@jwt_required()
def items():
    if request.method == 'GET':
        items = Item.query.all()
        return jsonify([{
            'id': i.id,
            'material_type_id': i.material_type_id,
            'quantity': i.quantity,
            'status': i.status,
            'parent_id': i.parent_id,
            'child_item_ids': i.child_item_ids,
            'log_ids': i.log_ids,
            'task_ids': i.task_ids,
            'created_at': i.created_at.isoformat()
        } for i in items])

    elif request.method == 'POST':
        data = request.get_json()
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

        db.session.add(item)
        db.session.commit()

        return jsonify({'message': 'Item created', 'id': item_id}), 201

@stock_bp.route('/items/<string:item_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def item_detail(item_id):
    item = Item.query.get_or_404(item_id)

    if request.method == 'GET':
        return jsonify({
            'id': item.id,
            'material_type_id': item.material_type_id,
            'quantity': item.quantity,
            'status': item.status,
            'parent_id': item.parent_id,
            'child_item_ids': item.child_item_ids,
            'log_ids': item.log_ids,
            'task_ids': item.task_ids,
            'created_at': item.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        item.quantity = data.get('quantity', item.quantity)
        item.status = data.get('status', item.status)
        item.parent_id = data.get('parent_id', item.parent_id)
        item.child_item_ids = data.get('child_item_ids', item.child_item_ids)
        item.log_ids = data.get('log_ids', item.log_ids)
        item.task_ids = data.get('task_ids', item.task_ids)

        db.session.commit()
        return jsonify({'message': 'Item updated'})

    elif request.method == 'DELETE':
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Item deleted'})

# Stock Logs endpoints
@stock_bp.route('/stock_logs', methods=['GET', 'POST'])
@jwt_required()
def stock_logs():
    if request.method == 'GET':
        stock_logs = StockLog.query.all()
        return jsonify([{
            'id': sl.id,
            'date': sl.date.isoformat(),
            'user_id': sl.user_id,
            'description': sl.description,
            'task_id': sl.task_id,
            'item_id': sl.item_id,
            'created_at': sl.created_at.isoformat()
        } for sl in stock_logs])

    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        stock_log_id = generate_id('SL', StockLog)

        stock_log = StockLog(
            id=stock_log_id,
            user_id=current_user_id,
            description=data['description'],
            task_id=data.get('task_id'),
            item_id=data['item_id']
        )

        db.session.add(stock_log)
        db.session.commit()

        return jsonify({'message': 'Stock log created', 'id': stock_log_id}), 201

@stock_bp.route('/stock_logs/<string:log_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def stock_log_detail(log_id):
    stock_log = StockLog.query.get_or_404(log_id)

    if request.method == 'GET':
        return jsonify({
            'id': stock_log.id,
            'date': stock_log.date.isoformat(),
            'user_id': stock_log.user_id,
            'description': stock_log.description,
            'task_id': stock_log.task_id,
            'item_id': stock_log.item_id,
            'created_at': stock_log.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        stock_log.description = data.get('description', stock_log.description)
        stock_log.task_id = data.get('task_id', stock_log.task_id)

        db.session.commit()
        return jsonify({'message': 'Stock log updated'})

    elif request.method == 'DELETE':
        db.session.delete(stock_log)
        db.session.commit()
        return jsonify({'message': 'Stock log deleted'})

# Add Material endpoint - creates Lot, Cartons, and Items in one operation
@stock_bp.route('/add_material', methods=['POST'])
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

    # Validate required fields
    if not all([material_type_id, factory_lot_number, total_quantity, carton_count, items_per_carton]):
        return jsonify({'error': 'All fields are required'}), 400

    try:
        # Convert to appropriate types
        total_quantity = int(total_quantity)
        carton_count = int(carton_count)
        items_per_carton = int(items_per_carton)

        # Validate the math
        if total_quantity != carton_count * items_per_carton:
            return jsonify({
                'error': f'Invalid quantities: total_quantity ({total_quantity}) must equal carton_count ({carton_count}) × items_per_carton ({items_per_carton})'
            }), 400

        if carton_count <= 0 or items_per_carton <= 0 or total_quantity <= 0:
            return jsonify({'error': 'All quantities must be positive numbers'}), 400

    except (ValueError, TypeError):
        return jsonify({'error': 'Quantities must be valid numbers'}), 400

    try:
        # Start transaction
        db.session.begin()

        # 1. Create the Lot
        lot_id = generate_id('LOT', Lot)
        carton_ids = []
        all_item_ids = []

        # 2. Create Cartons
        for i in range(carton_count):
            carton_id = generate_id('CTN', Carton)
            carton_ids.append(carton_id)

            # Create Items for this carton
            item_ids = []
            for j in range(items_per_carton):
                item_id = generate_id('ITM', Item)
                item_ids.append(item_id)
                all_item_ids.append(item_id)

                # Create Item
                item = Item(
                    id=item_id,
                    material_type_id=material_type_id,
                    quantity=1.0,  # Each item has quantity 1
                    status='available',
                    parent_id=carton_id,
                    child_item_ids='[]',
                    log_ids='[]',
                    task_ids='[]'
                )
                db.session.add(item)

            # Create Carton with item IDs
            carton = Carton(
                id=carton_id,
                parent_lot_id=lot_id,
                material_type_id=material_type_id,
                item_ids=json.dumps(item_ids),
                log_ids='[]'
            )
            db.session.add(carton)

        # Create Lot with carton IDs
        lot = Lot(
            id=lot_id,
            material_type_id=material_type_id,
            factory_lot_number=factory_lot_number,
            carton_ids=json.dumps(carton_ids),
            log_ids='[]',
            created_user_id=current_user_id
        )
        db.session.add(lot)

        # Create Stock Log for the lot creation
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
        print(e)
        return jsonify({'error': f'Failed to add material: {str(e)}'}), 500
