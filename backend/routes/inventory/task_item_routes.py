"""
Task Item routes - Handle item assignment to tasks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Item, Task, Lot, MaterialType, StockLog, Project, Carton, ItemStateType, get_hk_time
from utils.db_utils import generate_id
from utils.stock_logger import StockLogger
from utils.process_logger import ProcessLogger
from services.blockchain_service import BlockchainService
from __init__ import db
from utils.auth_middleware import require_permission
from utils.item_utils import get_item_with_children_recursive, get_item_descendants_by_status
import json

task_item_bp = Blueprint('task_item', __name__)

@task_item_bp.route('/tasks/<string:task_id>/items', methods=['GET'])
@jwt_required()
@require_permission('items.read')
def get_task_items(task_id):
    """
    GET: Retrieve all items assigned to a specific task
    """
    try:
        task = Task.query.get_or_404(task_id)
        
        # Get all items assigned to this task
        items = Item.query.filter(
            Item.task_ids.contains(task_id)
        ).all()
        
        result = []
        for item in items:
            # Get material type info
            material_type = MaterialType.query.get(item.material_type_id)
            
            # Get lot info by tracing up parent chain
            lot_info = None
            parent_id = item.parent_id
            while parent_id:
                carton = Carton.query.get(parent_id)
                if carton:
                    lot = Lot.query.get(carton.parent_lot_id)
                    if lot:
                        lot_info = {
                            'id': lot.id,
                            'factory_lot_number': lot.factory_lot_number
                        }
                    break
                parent_item = Item.query.get(parent_id)
                if parent_item:
                    parent_id = parent_item.parent_id
                else:
                    break
            
            state_data = None
            if item.state:
                state_data = item.state.to_dict()
            
            result.append({
                'id': item.id,
                'material_type_id': item.material_type_id,
                'material_type_name': material_type.material_name if material_type else 'Unknown',
                'material_unit': material_type.material_unit if material_type else 'unit',
                'quantity': float(item.quantity),
                'status': item.status,
                'state_id': item.state_id,
                'state': state_data,
                'parent_id': item.parent_id,
                'lot_info': lot_info,
                'label_count': item.label_count,
                'scan': item.scan,
                'location': item.location,
                'created_at': item.created_at.isoformat()
            })
        
        return jsonify({
            'task_id': task_id,
            'task_name': task.task_name,
            'items': result,
            'total_items': len(result),
            'total_quantity': sum(item['quantity'] for item in result)
        })
    except Exception as e:
        return jsonify({'error': 'Failed to get task items', 'details': str(e)}), 500

@task_item_bp.route('/tasks/<string:task_id>/items/available', methods=['GET'])
@jwt_required()
@require_permission('items.read')
def get_available_items_for_task(task_id):
    """
    GET: Get available items for a task based on project lots and material types
    Includes child items created through splitting operations
    """
    try:
        task = Task.query.get_or_404(task_id)
        work_order = task.work_order
        project = work_order.parent_project
        
        # Query parameters
        material_type_id = request.args.get('material_type_id')
        print(f"Fetching available items for task {task_id} in project {project.id} with material type {material_type_id}")
        
        # Get all lots assigned to the project
        project_lots = Lot.query.filter_by(project_id=project.id).all()
        project_lot_ids = [lot.id for lot in project_lots]
        
        if not project_lot_ids:
            return jsonify({
                'task_id': task_id,
                'material_types': [],
                'total_quantity': 0,
                'message': 'No lots assigned to this project'
            })
        
        # First, get all root items (items directly under cartons) from project lots
        root_items_query = db.session.query(Item, Carton, Lot, MaterialType).join(
            Carton, Item.parent_id == Carton.id
        ).join(
            Lot, Carton.parent_lot_id == Lot.id
        ).join(
            MaterialType, Item.material_type_id == MaterialType.id
        ).filter(
            Lot.id.in_(project_lot_ids)
        )
        
        # Filter by material type if specified
        if material_type_id:
            root_items_query = root_items_query.filter(Item.material_type_id == material_type_id)

        root_items = root_items_query.all()

        # Collect all available items including child items
        all_available_items = []
        processed_items = set()  # Track processed items to avoid duplicates

        for root_item, carton, lot, material_type in root_items:
            # Get all items (root + children) recursively
            item_hierarchy = get_item_with_children_recursive(root_item.id)

            for item_data in item_hierarchy:
                # Skip if already processed or not available
                if item_data['id'] in processed_items or item_data['status'] != 'available':
                    continue

                # Skip if material type filter doesn't match
                if material_type_id and item_data['material_type_id'] != material_type_id:
                    continue

                # Get material type for this item
                item_material_type = MaterialType.query.get(item_data['material_type_id'])
                if not item_material_type:
                    continue

                # Add to available items with lot context
                all_available_items.append({
                    'item': item_data,
                    'lot': lot,
                    'material_type': item_material_type
                })
                processed_items.add(item_data['id'])

        # Group by material type and lot
        material_types = {}
        for item_info in all_available_items:
            item_data = item_info['item']
            lot = item_info['lot']
            material_type = item_info['material_type']

            mt_id = material_type.id
            if mt_id not in material_types:
                material_types[mt_id] = {
                    'material_type_id': mt_id,
                    'material_name': material_type.material_name,
                    'material_unit': material_type.material_unit,
                    'lots': {},
                    'total_quantity': 0
                }
            
            lot_id = lot.id
            if lot_id not in material_types[mt_id]['lots']:
                material_types[mt_id]['lots'][lot_id] = {
                    'lot_id': lot_id,
                    'factory_lot_number': lot.factory_lot_number,
                    'items': [],
                    'total_quantity': 0
                }
            
            state_data = None
            item_obj = Item.query.get(item_data['id'])
            if item_obj and item_obj.state:
                state_data = item_obj.state.to_dict()
            
            item_summary = {
                'id': item_data['id'],
                'quantity': float(item_data['quantity']),
                'status': item_data['status'],
                'state_id': item_data.get('state_id'),
                'state': state_data,
                'created_at': item_data['created_at'],
                'parent_id': item_data['parent_id']  # Include parent_id to identify child items
            }
            
            material_types[mt_id]['lots'][lot_id]['items'].append(item_summary)
            material_types[mt_id]['lots'][lot_id]['total_quantity'] += float(item_data['quantity'])
            material_types[mt_id]['lots'][lot_id]['item_count'] = len(material_types[mt_id]['lots'][lot_id]['items'])
            material_types[mt_id]['total_quantity'] += float(item_data['quantity'])

        # Convert to list format and sort items within each lot
        result = []
        for mt_data in material_types.values():
            for lot_data in mt_data['lots'].values():
                # Sort items by creation date (older first) and quantity (smaller first)
                lot_data['items'].sort(key=lambda x: (x['created_at'], x['quantity']))

            mt_data['lots'] = list(mt_data['lots'].values())
            result.append(mt_data)
        
        # Sort material types by name
        result.sort(key=lambda x: x['material_name'])

        return jsonify({
            'task_id': task_id,
            'material_types': result,
            'project_id': project.id,
            'project_name': project.project_name,
            'total_items': sum(
                sum(lot['item_count'] for lot in mt['lots'])
                for mt in result
            ),
            'total_quantity': sum(mt['total_quantity'] for mt in result)
        })
        
    except Exception as e:
        print(f"Error in get_available_items_for_task: {e}")
        return jsonify({'error': 'Failed to get available items', 'details': str(e)}), 500

@task_item_bp.route('/tasks/<string:task_id>/items/assign', methods=['POST'])
@jwt_required()
@require_permission('items.write')
def assign_items_to_task(task_id):
    """
    POST: Assign items to a task with quantity management
    Supports both total quantity mode and items count mode
    """
    try:
        task = Task.query.get_or_404(task_id)
        data = request.get_json()
        
        if not data or 'assignments' not in data:
            print("Invalid request data:", data)
            return jsonify({'error': 'assignments data is required'}), 400
        
        assignments = data['assignments']
        user_id = get_jwt_identity()
        assigned_items = []
        blockchain_service = BlockchainService()
        
        # Check if we're using items mode vs total mode
        # In items mode, we get count and quantity per lot
        is_items_mode = any('count' in assignment for assignment in assignments)
        
        for assignment in assignments:
            lot_id = assignment.get('lot_id')
            material_type_id = assignment.get('material_type_id')
            
            if not lot_id or not material_type_id:
                continue
            
            if is_items_mode:
                # Items mode: assign specific number of items with specific quantity
                count = int(assignment.get('count', 0))
                item_quantity = float(assignment.get('quantity', 0))
                
                if count <= 0 or item_quantity <= 0:
                    continue
                
                # Get available items using helper function that includes child items
                available_items = _get_available_items_for_assignment(lot_id, material_type_id, item_quantity)

                if len(available_items) < count:
                    return jsonify({
                        'error': f'Not enough items available. Requested: {count}, Available: {len(available_items)}'
                    }), 400
                
                # Assign the requested items
                for i in range(count):
                    item = available_items[i]
                    
                    # Get Reserved state
                    reserved_state = ItemStateType.query.filter_by(state_name='Reserved').first()
                    if reserved_state:
                        item.state_id = reserved_state.id

                    # status
                    item.status = 'assigned'
                    
                    # Add task ID to item's task_ids
                    try:
                        task_ids = json.loads(item.task_ids) if item.task_ids else []
                        if task_id not in task_ids:
                            task_ids.append(task_id)
                        item.task_ids = json.dumps(task_ids)
                    except:
                        item.task_ids = json.dumps([task_id])
                    
                    # Record blockchain transaction for assignment
                    blockchain_service.record_item_assignment(item.id, task_id, user_id)
                    
                    # Log the assignment with state information
                    state_name = reserved_state.state_name if reserved_state else 'Reserved'
                    StockLogger.log_assign_item_to_task(user_id, item.id, task_id, float(item.quantity))
                    
                    # Log to process logs
                    material_type = MaterialType.query.get(item.material_type_id)
                    ProcessLogger.log_add_item_to_task(
                        user_id, task_id, item.id, float(item.quantity), 
                        f"{material_type.material_name if material_type else ''} (State: {state_name})"
                    )
                    
                    assigned_items.append({
                        'item_id': item.id,
                        'quantity': float(item.quantity),
                        'lot_id': lot_id,
                        'material_type_id': material_type_id
                    })
            
            else:
                # Total quantity mode: assign requested total quantity
                # Prioritize shorter materials (items with smaller quantities)
                requested_quantity = float(assignment.get('quantity', 0))
                
                if requested_quantity <= 0:
                    continue
                
                # Get available items using helper function that includes child items
                available_items = _get_available_items_for_assignment(lot_id, material_type_id)

                remaining_quantity = requested_quantity
                
                for item in available_items:
                    if remaining_quantity <= 0:
                        break
                    
                    item_quantity = float(item.quantity)
                    
                    if item_quantity <= remaining_quantity:
                        # Use entire item
                        reserved_state = ItemStateType.query.filter_by(state_name='Reserved').first()
                        if reserved_state:
                            item.state_id = reserved_state.id
                        
                        # Add task ID to item's task_ids
                        try:
                            task_ids = json.loads(item.task_ids) if item.task_ids else []
                            if task_id not in task_ids:
                                task_ids.append(task_id)
                            item.task_ids = json.dumps(task_ids)
                        except:
                            item.task_ids = json.dumps([task_id])
                        
                        # Record blockchain transaction for assignment
                        blockchain_service.record_item_assignment(item.id, task_id, user_id)
                        
                        # Log the assignment with state information
                        state_name = reserved_state.state_name if reserved_state else 'Reserved'
                        StockLogger.log_assign_item_to_task(user_id, item.id, task_id, item_quantity)
                        
                        # Log to process logs
                        material_type = MaterialType.query.get(item.material_type_id)
                        ProcessLogger.log_add_item_to_task(
                            user_id, task_id, item.id, item_quantity, 
                            f"{material_type.material_name if material_type else ''} (State: {state_name})"
                        )
                        
                        assigned_items.append({
                            'item_id': item.id,
                            'quantity': item_quantity,
                            'lot_id': lot_id,
                            'material_type_id': material_type_id
                        })
                        
                        remaining_quantity -= item_quantity
                    else:
                        # Split item - create child item for partial assignment
                        child_item_id = generate_id('ITM', Item)
                        child_quantity = remaining_quantity
                        parent_quantity = item_quantity - remaining_quantity
                        
                        # Update parent item
                        item.quantity = parent_quantity
                        item.status = 'available'  # Keep parent available
                        
                        # Create child item
                        reserved_state = ItemStateType.query.filter_by(state_name='Reserved').first()
                        child_item = Item(
                            id=child_item_id,
                            material_type_id=item.material_type_id,
                            quantity=child_quantity,
                            status='assigned',
                            state_id=reserved_state.id if reserved_state else None,
                            parent_id=item.id,
                            task_ids=json.dumps([task_id])
                        )
                        
                        # Update parent's child_item_ids
                        try:
                            child_item_ids = json.loads(item.child_item_ids) if item.child_item_ids else []
                            child_item_ids.append(child_item_id)
                            item.child_item_ids = json.dumps(child_item_ids)
                        except:
                            item.child_item_ids = json.dumps([child_item_id])
                        
                        db.session.add(child_item)
                        
                        # Record blockchain transaction for item split
                        blockchain_service.record_item_split(
                            parent_item_id=item.id,
                            child_item_id=child_item_id,
                            split_quantity=child_quantity,
                            remaining_quantity=parent_quantity,
                            user_id=user_id
                        )

                        # Record blockchain transaction for child item assignment
                        blockchain_service.record_item_assignment(child_item_id, task_id, user_id)

                        # Log the creation and assignment with state information
                        state_name = reserved_state.state_name if reserved_state else 'Reserved'
                        StockLogger.log_create(user_id, 'item', child_item_id)
                        StockLogger.log_assign_item_to_task(user_id, child_item_id, task_id, child_quantity)
                        
                        # Log to process logs
                        material_type = MaterialType.query.get(child_item.material_type_id)
                        ProcessLogger.log_add_item_to_task(
                            user_id, task_id, child_item_id, child_quantity, 
                            f"{material_type.material_name if material_type else ''} (State: {state_name})"
                        )
                        
                        assigned_items.append({
                            'item_id': child_item_id,
                            'quantity': child_quantity,
                            'lot_id': lot_id,
                            'material_type_id': material_type_id
                        })
                        
                        remaining_quantity = 0
        
        db.session.commit()
        
        return jsonify({
            'message': 'Items assigned successfully',
            'assigned_items': assigned_items,
            'task_id': task_id
        })
        
    except Exception as e:
        db.session.rollback()
        print(e)
        return jsonify({'error': 'Failed to assign items', 'details': str(e)}), 500

@task_item_bp.route('/tasks/<string:task_id>/items/<string:item_id>/remove', methods=['DELETE'])
@jwt_required()
@require_permission('items.write')
def remove_item_from_task(task_id, item_id):
    """
    DELETE: Remove an item from a task with blockchain integration
    """
    try:
        # Validate task and item existence
        task = Task.query.get_or_404(task_id)
        item = Item.query.get_or_404(item_id)
        user_id = get_jwt_identity()
        
        # Initialize blockchain service
        blockchain_service = BlockchainService()

        # Check if item is assigned to this task
        try:
            task_ids = json.loads(item.task_ids) if item.task_ids else []
        except (json.JSONDecodeError, TypeError):
            task_ids = []

        if task_id not in task_ids:
            return jsonify({
                'error': 'Item is not assigned to this task',
                'item_id': item_id,
                'task_id': task_id,
                'current_task_assignments': task_ids
            }), 400

        # Store original values for blockchain tracking
        original_status = item.status
        print(original_status)
        original_task_ids = task_ids.copy()
        original_state_id = item.state_id

        # Remove task ID from item's task_ids
        task_ids.remove(task_id)
        item.task_ids = json.dumps(task_ids)

        # Determine new state based on remaining task assignments
        if not task_ids:
            # No more tasks assigned, set to Available state
            available_state = ItemStateType.query.filter_by(state_name='Available').first()
            if available_state:
                item.state_id = available_state.id
            new_location = None  # Reset location when no tasks assigned
        else:
            # Still assigned to other tasks, keep Reserved state
            reserved_state = ItemStateType.query.filter_by(state_name='Reserved').first()
            if reserved_state:
                item.state_id = reserved_state.id
            new_location = f"Tasks: {', '.join(task_ids)}"

        # Record blockchain transaction for task removal
        try:
            blockchain_service.record_item_task_removal(
                item_id=item.id,
                task_id=task_id,
                old_task_ids=original_task_ids,
                new_task_ids=task_ids,
                user_id=user_id,
                old_state_id=original_state_id,
                new_state_id=item.state_id
            )
        except Exception as blockchain_error:
            print(f"Blockchain recording failed: {blockchain_error}")
            # Continue with database operation even if blockchain fails

        # Log the removal in stock logs
        try:
            StockLogger.log_remove_item_from_task(user_id, item.id, task_id, float(item.quantity))
        except Exception as log_error:
            print(f"Stock logging failed: {log_error}")

        # Log to process logs
        try:
            material_type = MaterialType.query.get(item.material_type_id)
            state_info = None
            if item.state_id:
                state = ItemStateType.query.get(item.state_id)
                state_info = state.state_name if state else 'Unknown'
            
            ProcessLogger.create_log(
                user_id=user_id,
                action_type='UPDATE',
                entity_type='task',
                entity_id=task_id,
                details=f"remove item #{item.id} ({item.quantity} {material_type.material_name if material_type else 'units'}) - State: {state_info or 'Available'}"
            )
        except Exception as process_log_error:
            print(f"Process logging failed: {process_log_error}")

        # Commit database changes
        db.session.commit()

        # Get updated item info for response
        material_type = MaterialType.query.get(item.material_type_id)
        state_data = None
        if item.state:
            state_data = item.state.to_dict()

        return jsonify({
            'success': True,
            'message': 'Item removed from task successfully',
            'item_id': item_id,
            'task_id': task_id,
            'item_details': {
                'id': item.id,
                'material_type': material_type.material_name if material_type else 'Unknown',
                'quantity': float(item.quantity),
                'new_status': item.status,
                'state_id': item.state_id,
                'state': state_data,
                'remaining_task_assignments': task_ids,
                'total_remaining_assignments': len(task_ids)
            },
            'task_details': {
                'id': task.id,
                'name': task.task_name
            }
        }), 200

    except json.JSONDecodeError:
        db.session.rollback()
        return jsonify({
            'error': 'Invalid task_ids format in item data',
            'item_id': item_id,
            'details': 'Item data corruption detected'
        }), 500

    except Exception as e:
        db.session.rollback()
        print(f"Error removing item from task: {e}")
        return jsonify({
            'error': 'Failed to remove item from task',
            'details': str(e),
            'item_id': item_id,
            'task_id': task_id
        }), 500

@task_item_bp.route('/tasks/<string:task_id>/items/summary', methods=['GET'])
@jwt_required()
@require_permission('items.read')
def get_task_items_summary(task_id):
    """
    GET: Retrieve aggregated task items summary
    Returns: [{"number_of_item": int, "item_quantity": float, "item_material_type": str, "item_material_unit": str}, ...]
    """
    try:
        task = Task.query.get_or_404(task_id)
        
        # Get all items assigned to this task
        items = Item.query.filter(
            Item.task_ids.contains(task_id)
        ).all()
        
        # Group items by material type first, then by quantity
        grouped_by_type = {}
        
        for item in items:
            material_type = MaterialType.query.get(item.material_type_id)
            if not material_type:
                continue
                
            material_name = material_type.material_name
            material_unit = material_type.material_unit
            item_qty = float(item.quantity)
            
            if material_name not in grouped_by_type:
                grouped_by_type[material_name] = {
                    'material_name': material_name,
                    'material_unit': material_unit,
                    'quantities': {}
                }
            
            if item_qty not in grouped_by_type[material_name]['quantities']:
                grouped_by_type[material_name]['quantities'][item_qty] = {
                    'number_of_item': 0,
                    'item_quantity': item_qty,
                    'item_material_type': material_name,
                    'item_material_unit': material_unit
                }
            
            grouped_by_type[material_name]['quantities'][item_qty]['number_of_item'] += 1
        
        # Flatten the grouped data and sort by material type name and quantity
        result = []
        for material_name, material_data in sorted(grouped_by_type.items()):
            # Sort quantities within each material type
            sorted_quantities = sorted(
                material_data['quantities'].values(),
                key=lambda x: x['item_quantity']
            )
            result.extend(sorted_quantities)
        
        return jsonify({
            'task_id': task_id,
            'task_name': task.task_name,
            'items': result,
            'total_material_types': len(result),
            'total_items': sum(item['number_of_item'] for item in result),
            'total_quantity': sum(item['item_quantity'] * item['number_of_item'] for item in result)
        })
    except Exception as e:
        return jsonify({'error': 'Failed to get task items summary', 'details': str(e)}), 500

@task_item_bp.route('/tasks/<string:task_id>/scan_verify/items/<string:item_id>', methods=['GET'])
@jwt_required()
@require_permission('items.read')
def scan_verify_item_by_task(task_id, item_id):
    """
    GET: Verify scanned item by task ID and item ID
    This endpoint verifies that an item is assigned to a specific task and returns item details
    """
    try:
        # Validate task existence
        task = Task.query.get_or_404(task_id)
        print(item_id)

        # Validate item existence
        item = Item.query.get_or_404(item_id)
        print(item_id)

        # Check if item is assigned to this task
        try:
            task_ids = json.loads(item.task_ids) if item.task_ids else []
        except (json.JSONDecodeError, TypeError):
            task_ids = []

        if task_id not in task_ids:
            return jsonify({
                'error': 'Item is not assigned to this task',
                'item_id': item_id,
                'task_id': task_id,
                'is_verified': False,
                'assigned_tasks': task_ids
            }), 200

        #check if the item is printed
        if item.label_count <= 0:
            return jsonify({
                'error': 'Item has not been printed yet',
                'item_id': item_id,
                'task_id': task_id,
                'is_verified': False
            }), 200

        # Record scan event on blockchain
        user_id = get_jwt_identity()
        blockchain_service = BlockchainService()
        try:
            blockchain_service.record_item_scan_verify(item_id, user_id, item.scan + 1)
        except Exception as blockchain_error:
            print(f"Blockchain scan recording failed: {blockchain_error}")

        # Increment scan count
        item.scan += 1
        db.session.commit()

        # Get material type information
        material_type = MaterialType.query.get(item.material_type_id)

        # Get state information
        state_data = None
        if item.state:
            state_data = item.state.to_dict()

        # Build comprehensive response
        response = {
            'is_verified': True,
            'message': 'Item successfully verified for task',
            'task_details': {
                'id': task.id,
                'name': task.task_name,
                'description': task.description,
                'state_id': task.state_id,
                'assignee_id': task.assignee_id
            },
            'item_details': {
                'id': item.id,
                'label_count': item.label_count,
                'material_type_name': material_type.material_name if material_type else None,
                'material_type_unit': material_type.material_unit if material_type else None,
                'scan_count': item.scan,
                'location': item.location,
                'status': item.status,
                'state_id': item.state_id,
                'state': state_data,
                'assigned_tasks': task_ids,
            },
            'verification_timestamp': get_hk_time().isoformat()
        }

        return jsonify(response), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in scan_verify_item_by_task: {e}")


        return jsonify({
            'error': 'Failed to verify scanned item',
            'details': str(e),
            'item_id': item_id,
            'task_id': task_id,
            'is_verified': False
        }), 200

@task_item_bp.route('/tasks/<string:task_id>/items/scanned-status', methods=['GET'])
@jwt_required()
@require_permission('items.read')
def check_task_items_scanned(task_id):
    """
    GET: Check if all items assigned to the task have been scanned at least once (item.scan > 0)
    Returns summary counts and lists of scanned/not scanned items.
    """
    try:
        task = Task.query.get_or_404(task_id)

        # Get all items assigned to this task
        items = Item.query.filter(
            Item.task_ids.contains(task_id)
        ).all()

        total_items = len(items)
        scanned_items = []
        not_scanned_items = []

        for it in items:
            entry = {
                'id': it.id,
                'quantity': float(it.quantity),
                'scan': int(it.scan),
                'status': it.status,
                'state_id': it.state_id,
                'label_count': it.label_count,
                'location': it.location,
            }
            if (it.scan or 0) > 0:
                scanned_items.append(entry)
            else:
                not_scanned_items.append(entry)

        result = {
            'task_id': task_id,
            'task_name': task.task_name,
            'total_assigned_items': total_items,
            'scanned_items': len(scanned_items),
            'not_scanned_items': len(not_scanned_items),
            'all_scanned': total_items > 0 and len(not_scanned_items) == 0,
            'items_not_scanned': not_scanned_items,
            'items_scanned': scanned_items,
        }

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': 'Failed to check scanned status', 'details': str(e)}), 500

def _get_available_items_for_assignment(lot_id, material_type_id, item_quantity=None):
        """
        Helper function to get all available items (including children) for assignment
        """
        # Get all root items from this lot with the specified material type
        root_items_query = db.session.query(Item, Carton, Lot).join(
            Carton, Item.parent_id == Carton.id
        ).join(
            Lot, Carton.parent_lot_id == Lot.id
        ).filter(
            Lot.id == lot_id,
            Item.material_type_id == material_type_id
        )

        root_items = root_items_query.all()

        # Collect all available items including child items
        all_available_items = []
        processed_items = set()

        for root_item, carton, lot in root_items:
            # Get all items (root + children) recursively
            item_hierarchy = get_item_with_children_recursive(root_item.id)

            for item_data in item_hierarchy:
                # Skip if already processed or not available
                if item_data['id'] in processed_items or item_data['status'] != 'available':
                    continue

                # Skip if material type doesn't match
                if item_data['material_type_id'] != material_type_id:
                    continue

                # Skip if specific quantity requested and doesn't match
                if item_quantity is not None and float(item_data['quantity']) != item_quantity:
                    continue

                # Get the actual Item object
                item_obj = Item.query.get(item_data['id'])
                if item_obj:
                    all_available_items.append(item_obj)
                    processed_items.add(item_data['id'])

        # Sort by creation date (older first) and quantity (smaller first)
        all_available_items.sort(key=lambda x: (x.created_at, x.quantity))

        return all_available_items
