"""
Stock collection routes - Lots, Cartons, Items, Stock Logs
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Lot, Carton, Item, StockLog
from utils.db_utils import generate_id
from __init__ import db

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
            'stock_log_ids': i.stock_log_ids,
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
            stock_log_ids=data.get('stock_log_ids', '[]'),
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
            'stock_log_ids': item.stock_log_ids,
            'task_ids': item.task_ids,
            'created_at': item.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        item.quantity = data.get('quantity', item.quantity)
        item.status = data.get('status', item.status)
        item.parent_id = data.get('parent_id', item.parent_id)
        item.child_item_ids = data.get('child_item_ids', item.child_item_ids)
        item.stock_log_ids = data.get('stock_log_ids', item.stock_log_ids)
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
