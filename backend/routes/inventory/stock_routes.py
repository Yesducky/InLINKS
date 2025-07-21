"""
Stock collection routes - Items and Stock Logs
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Item, StockLog, Carton
from utils.db_utils import generate_id
from __init__ import db

stock_bp = Blueprint('stock', __name__)

# Stock Logs endpoints
@stock_bp.route('/stock_logs', methods=['GET', 'POST'])
@jwt_required()
def stock_logs():
    """
    GET: Retrieve all stock logs
    POST: Create a new stock log
    """
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

        # Validate required fields
        if not data.get('description'):
            return jsonify({'error': 'description is required'}), 400
        if not data.get('item_id'):
            return jsonify({'error': 'item_id is required'}), 400

        current_user_id = get_jwt_identity()
        stock_log_id = generate_id('SL', StockLog)

        stock_log = StockLog(
            id=stock_log_id,
            user_id=current_user_id,
            description=data['description'],
            task_id=data.get('task_id'),
            item_id=data['item_id']
        )

        try:
            db.session.add(stock_log)
            db.session.commit()
            return jsonify({'message': 'Stock log created successfully', 'id': stock_log_id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to create stock log', 'details': str(e)}), 500
    return None


@stock_bp.route('/stock_logs/<string:log_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def stock_log_detail(log_id):
    """
    GET: Retrieve a specific stock log
    PUT: Update a specific stock log
    DELETE: Delete a specific stock log
    """
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

        # Update fields if provided
        if 'description' in data:
            stock_log.description = data['description']
        if 'task_id' in data:
            stock_log.task_id = data['task_id']

        try:
            db.session.commit()
            return jsonify({'message': 'Stock log updated successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to update stock log', 'details': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            db.session.delete(stock_log)
            db.session.commit()
            return jsonify({'message': 'Stock log deleted successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to delete stock log', 'details': str(e)}), 500
    return None


@stock_bp.route('/get_stock_logs', methods=['GET'])
@jwt_required()
def get_stock_logs():
    item_id = request.args.get('item_id')
    lot_id = request.args.get('lot_id')
    carton_id = request.args.get('carton_id')

    query = StockLog.query
    if item_id:
        query = query.filter_by(item_id=item_id)
    if lot_id:
        query = query.filter_by(lot_id=lot_id)
    if carton_id:
        query = query.filter_by(carton_id=carton_id)

    logs = query.all()
    return jsonify([
        {
            'id': log.id,
            'date': log.date.isoformat() if log.date else None,
            'user_id': log.user_id,
            'description': log.description,
            'item_id': getattr(log, 'item_id', None),
            'lot_id': getattr(log, 'lot_id', None),
            'carton_id': getattr(log, 'carton_id', None),
            'task_id': getattr(log, 'task_id', None),
            'created_at': log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ])
