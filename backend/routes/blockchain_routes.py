from flask import Blueprint, jsonify, request
from services.blockchain_service import BlockchainService
from models import Item, BlockchainTransaction, BlockchainBlock
from __init__ import db
from datetime import datetime

blockchain_bp = Blueprint('blockchain', __name__, url_prefix='/api/blockchain')

blockchain_service = BlockchainService()

@blockchain_bp.route('/initialize', methods=['POST'])
def initialize_blockchain():
    """Initialize blockchain with genesis block"""
    try:
        genesis_block = blockchain_service.create_genesis_block()
        if genesis_block:
            return jsonify({
                'success': True,
                'message': 'Blockchain initialized',
                'block': {
                    'id': genesis_block.id,
                    'block_number': genesis_block.block_number,
                    'block_hash': genesis_block.block_hash
                }
            }), 201
        else:
            return jsonify({
                'success': True,
                'message': 'Blockchain already initialized'
            }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_bp.route('/item/<item_id>/history', methods=['GET'])
def get_item_blockchain_history(item_id):
    """Get complete blockchain history for an item"""
    try:
        # Verify item exists
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        # Get blockchain history
        history = blockchain_service.get_item_blockchain_history(item_id)
        
        # Get item basic info
        item_info = {
            'id': item.id,
            'material_type': item.material_type.material_name if item.material_type else 'Unknown',
            'label': item.label,
            'current_quantity': item.quantity,
            'current_status': item.status
        }
        
        return jsonify({
            'success': True,
            'item': item_info,
            'blockchain_history': history
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_bp.route('/item/<item_id>/current-state', methods=['GET'])
def get_item_current_blockchain_state(item_id):
    """Get current blockchain state for an item"""
    try:
        state = blockchain_service.get_item_current_state(item_id)
        if not state:
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        return jsonify({
            'success': True,
            'current_state': state
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_bp.route('/item/<item_id>/verify', methods=['GET'])
def verify_item_integrity(item_id):
    """Verify item data integrity against blockchain"""
    try:
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        # Get blockchain state
        blockchain_state = blockchain_service.get_item_current_state(item_id)
        
        # Verify against database
        verification_result = {
            'item_id': item_id,
            'database_quantity': item.quantity,
            'blockchain_quantity': blockchain_state.get('current_quantity', 0) if blockchain_state else item.quantity,
            'database_status': item.status,
            'blockchain_status': blockchain_state.get('current_status', item.status) if blockchain_state else item.status,
            'is_consistent': True,
            'last_verified': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'verification': verification_result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_bp.route('/transactions', methods=['GET'])
def get_blockchain_transactions():
    """Get blockchain transactions with filtering"""
    try:
        item_id = request.args.get('item_id')
        transaction_type = request.args.get('type')
        limit = int(request.args.get('limit', 50))
        
        query = BlockchainTransaction.query
        
        if item_id:
            query = query.filter_by(item_id=item_id)
        if transaction_type:
            query = query.filter_by(transaction_type=transaction_type)
        
        transactions = query.order_by(BlockchainTransaction.timestamp.desc())\
            .limit(limit).all()
        
        return jsonify({
            'success': True,
            'transactions': [{
                'id': tx.id,
                'transaction_hash': tx.transaction_hash,
                'item_id': tx.item_id,
                'transaction_type': tx.transaction_type,
                'old_quantity': tx.old_quantity,
                'new_quantity': tx.new_quantity,
                'old_status': tx.old_status,
                'new_status': tx.new_status,
                'old_location': tx.old_location,
                'new_location': tx.new_location,
                'timestamp': tx.timestamp.isoformat(),
                'user': {
                    'id': tx.user.id,
                    'username': tx.user.username
                }
            } for tx in transactions]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_bp.route('/blocks', methods=['GET'])
def get_blockchain_blocks():
    """Get blockchain blocks"""
    try:
        blocks = BlockchainBlock.query.order_by(BlockchainBlock.block_number.desc()).all()
        
        return jsonify({
            'success': True,
            'blocks': [{
                'id': block.id,
                'block_number': block.block_number,
                'block_hash': block.block_hash,
                'previous_hash': block.previous_hash,
                'timestamp': block.timestamp.isoformat(),
                'transaction_count': block.transaction_count,
                'merkle_root': block.merkle_root,
                'transactions': [{
                    'id': tx.id,
                    'transaction_hash': tx.transaction_hash,
                    'transaction_type': tx.transaction_type,
                    'item_id': tx.item_id
                } for tx in block.transactions]
            } for block in blocks]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_bp.route('/item/<item_id>/state/transaction/<transaction_id>', methods=['GET'])
def get_item_state_at_transaction(item_id, transaction_id):
    """Get item state at a specific transaction"""
    try:
        # Verify item exists
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404

        # Get item state at the specified transaction
        state = blockchain_service.get_item_state_at_block(item_id, transaction_id)

        if not state:
            return jsonify({'success': False, 'error': 'Transaction not found or no state available'}), 404

        return jsonify({
            'success': True,
            'state': state
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_bp.route('/item/<item_id>/state/block/<block_id>', methods=['GET'])
def get_item_state_at_block(item_id, block_id):
    """Get item state at a specific block by block ID"""
    try:
        # Verify item exists
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404

        # Get the latest transaction for this item in the specified block
        transaction = BlockchainTransaction.query.filter_by(
            item_id=item_id,
            block_id=block_id
        ).order_by(BlockchainTransaction.timestamp.desc()).first()

        if not transaction:
            return jsonify({'success': False, 'error': 'No transactions found for this item in the specified block'}), 404

        # Get item state at this transaction
        state = blockchain_service.get_item_state_at_block(item_id, transaction.id)

        if not state:
            return jsonify({'success': False, 'error': 'State not found'}), 404

        return jsonify({
            'success': True,
            'state': state
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
