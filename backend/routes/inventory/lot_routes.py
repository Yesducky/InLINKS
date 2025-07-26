"""
Lot management routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Lot, Item, MaterialType, Carton, StockLog
from utils.db_utils import generate_id
from utils.item_utils import get_item_with_children_recursive
from utils.stock_logger import StockLogger
from utils.process_logger import ProcessLogger
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
        user_id = get_jwt_identity()
        lot_id = generate_id('LOT', Lot)

        lot = Lot(
            id=lot_id,
            material_type_id=data['material_type_id'],
            factory_lot_number=data['factory_lot_number'],
            carton_ids=data.get('carton_ids', '[]'),
            log_ids=data.get('log_ids', '[]'),
            created_user_id=user_id
        )

        db.session.add(lot)
        db.session.flush()
        
        # Log lot creation
        StockLogger.log_create(user_id, 'lot', lot_id, lot.factory_lot_number)
        
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
        user_id = get_jwt_identity()
        
        # Get old values for logging
        old_data = {
            'factory_lot_number': lot.factory_lot_number,
            'carton_ids': lot.carton_ids
        }
        
        new_data = {
            'factory_lot_number': data.get('factory_lot_number', lot.factory_lot_number),
            'carton_ids': data.get('carton_ids', lot.carton_ids)
        }
        
        # Update the lot
        lot.factory_lot_number = new_data['factory_lot_number']
        lot.carton_ids = new_data['carton_ids']
        lot.log_ids = data.get('log_ids', lot.log_ids)

        # Log the update
        StockLogger.log_update(user_id, 'lot', lot_id, lot, new_data)
        
        db.session.commit()
        return jsonify({'message': 'Lot updated'})

    elif request.method == 'DELETE':
        user_id = get_jwt_identity()
        factory_lot_number = lot.factory_lot_number
        
        # Log deletion before removing
        StockLogger.log_delete(user_id, 'lot', lot_id, factory_lot_number)
        
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

@lot_bp.route('/add_lot', methods=['POST'])
@jwt_required()
def add_lot():
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

        # Generate items and cartons
        lot_id = generate_id('LOT', Lot)
        carton_ids = []
        all_item_ids = []
        for carton_idx in range(carton_count):
            carton_id = generate_id('CTN', Carton)
            item_ids = []
            for item_idx in range(items_per_carton):
                item_id = generate_id('ITM', Item)
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
                db.session.flush()
                # Log item creation
                StockLogger.log_create(current_user_id, 'item', item_id, f'Auto-created for lot {factory_lot_number}')
                item_ids.append(item_id)
                all_item_ids.append(item_id)
            carton = Carton(
                id=carton_id,
                parent_lot_id=lot_id,
                material_type_id=material_type_id,
                item_ids=json.dumps(item_ids),
                log_ids='[]'
            )
            db.session.add(carton)
            StockLogger.log_create(current_user_id, 'carton', carton_id, f'Auto-created for lot {factory_lot_number}')
            db.session.flush()
            carton_ids.append(carton_id)

        # Create the lot
        lot = Lot(
            id=lot_id,
            material_type_id=material_type_id,
            factory_lot_number=factory_lot_number,
            carton_ids=json.dumps(carton_ids),
            log_ids='[]',
            created_user_id=current_user_id
        )
        db.session.add(lot)
        db.session.flush()

        # Update cartons with parent_lot_id
        for carton_id in carton_ids:
            carton = Carton.query.get(carton_id)
            carton.parent_lot_id = lot_id

        # Log lot creation
        StockLogger.log_create(current_user_id, 'lot', lot_id, factory_lot_number)
        db.session.commit()
        return jsonify({'message': 'Lot, cartons, and items created', 'lot_id': lot_id, 'carton_ids': carton_ids, 'item_ids': all_item_ids}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating lot: {str(e)}")
        return jsonify({'error': f'Failed to add lot: {str(e)}'}), 500

# Project-lot management endpoints
@lot_bp.route('/lots/unassigned', methods=['GET'])
@jwt_required()
def get_unassigned_lots():
    """
    Get all lots that are not assigned to any project
    """
    try:
        lots = Lot.query.filter(Lot.project_id.is_(None)).all()
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
                'log_ids': l.log_ids,
                'created_at': l.created_at.isoformat(),
                'created_user_id': l.created_user_id,
                'material_type': {
                    'id': l.material_type.id,
                    'material_name': l.material_type.material_name,
                    'material_unit': l.material_type.material_unit
                }
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': f'Failed to get unassigned lots: {str(e)}'}), 500

@lot_bp.route('/lots/<string:lot_id>/assign-to-project', methods=['PUT'])
@jwt_required()
def assign_lot_to_project(lot_id):
    """
    Assign a lot to a project
    """
    try:
        lot = Lot.query.get_or_404(lot_id)
        data = request.get_json()
        project_id = data.get('project_id')
        
        if not project_id:
            return jsonify({'error': 'Project ID is required'}), 400

        # Verify project exists
        from models import Project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        user_id = get_jwt_identity()
        
        # Log the assignment
        old_project_id = lot.project_id
        lot.project_id = project_id
        
        StockLogger.log_update(user_id, 'lot', lot_id, lot, {
            'project_id': project_id,
            'old_project_id': old_project_id
        })
        
        # Log process assignment
        old_project_name = Project.query.get(old_project_id).project_name if old_project_id else 'Unassigned'
        new_project_name = project.project_name
        
        ProcessLogger.create_log(
            user_id=user_id,
            action_type='ASSIGNMENT',
            entity_type='project',
            entity_id=project_id,
            entity_name=new_project_name,
            details=f"Lot {lot.id} assigned from '{old_project_name}' to '{new_project_name}'"
        )

        db.session.commit()
        return jsonify({'message': 'Lot assigned to project successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to assign lot to project: {str(e)}'}), 500

@lot_bp.route('/lots/<string:lot_id>/remove-from-project', methods=['PUT'])
@jwt_required()
def remove_lot_from_project(lot_id):
    """
    Remove a lot from any project (set project_id to None)
    """
    try:
        lot = Lot.query.get_or_404(lot_id)
        user_id = get_jwt_identity()
        
        # Log the removal
        old_project_id = lot.project_id
        lot.project_id = None
        
        StockLogger.log_update(user_id, 'lot', lot_id, lot, {
            'project_id': None,
            'old_project_id': old_project_id
        })
        
        # Log process removal
        if old_project_id:
            from models import Project
            old_project = Project.query.get(old_project_id)
            old_project_name = old_project.project_name if old_project else 'Unknown'
            
            ProcessLogger.create_log(
                user_id=user_id,
                action_type='REMOVAL',
                entity_type='project',
                entity_id=old_project_id,
                entity_name=old_project_name,
                details=f"Lot {lot.id} removed from project '{old_project_id}'"
            )

        db.session.commit()
        return jsonify({'message': 'Lot removed from project successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to remove lot from project: {str(e)}'}), 500
