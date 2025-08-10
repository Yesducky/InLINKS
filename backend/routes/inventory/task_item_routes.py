"""
Task Item routes - Handle item assignment to tasks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Item, Task, Lot, MaterialType, StockLog, Project, Carton
from utils.db_utils import generate_id
from utils.stock_logger import StockLogger
from utils.process_logger import ProcessLogger
from services.blockchain_service import BlockchainService
from __init__ import db
from utils.auth_middleware import require_permission
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
            
            result.append({
                'id': item.id,
                'material_type_id': item.material_type_id,
                'material_type_name': material_type.material_name if material_type else 'Unknown',
                'material_unit': material_type.material_unit if material_type else 'unit',
                'quantity': float(item.quantity),
                'status': item.status,
                'parent_id': item.parent_id,
                'lot_info': lot_info,
                'label_count': item.label_count,
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
                'available_items': [],
                'total_quantity': 0,
                'message': 'No lots assigned to this project'
            })
        
        # Build query for available items
        query = db.session.query(Item, Carton, Lot, MaterialType).join(
            Carton, Item.parent_id == Carton.id
        ).join(
            Lot, Carton.parent_lot_id == Lot.id
        ).join(
            MaterialType, Item.material_type_id == MaterialType.id
        ).filter(
            Lot.id.in_(project_lot_ids),
            Item.status == 'available'
        )
        
        # Filter by material type if specified
        if material_type_id:
            query = query.filter(Item.material_type_id == material_type_id)
        
        items = query.all()
        
        # Group by material type
        material_types = {}
        for item, carton, lot, material_type in items:
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
            
            item_data = {
                'id': item.id,
                'quantity': float(item.quantity),
                'status': item.status,
                'created_at': item.created_at.isoformat()
            }
            
            material_types[mt_id]['lots'][lot_id]['items'].append(item_data)
            material_types[mt_id]['lots'][lot_id]['total_quantity'] += float(item.quantity)
            material_types[mt_id]['lots'][lot_id]['item_count'] = len(material_types[mt_id]['lots'][lot_id]['items'])
            material_types[mt_id]['total_quantity'] += float(item.quantity)
        
        # Convert to list format
        result = []
        for mt_data in material_types.values():
            mt_data['lots'] = list(mt_data['lots'].values())
            result.append(mt_data)
        
        return jsonify({
            'task_id': task_id,
            'material_types': result,
            'project_id': project.id,
            'project_name': project.project_name
        })
        
    except Exception as e:
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
                
                # Get available items from this lot with the specified material type and quantity
                available_items = db.session.query(Item, Carton).join(
                    Carton, Item.parent_id == Carton.id
                ).filter(
                    Carton.parent_lot_id == lot_id,
                    Item.material_type_id == material_type_id,
                    Item.status == 'available',
                    Item.quantity == item_quantity
                ).order_by(Item.created_at.asc()).limit(count).all()
                
                if len(available_items) < count:
                    return jsonify({
                        'error': f'Not enough items available. Requested: {count}, Available: {len(available_items)}'
                    }), 400
                
                # Assign the requested items
                for item, carton in available_items:
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
                    
                    # Log the assignment
                    StockLogger.log_assign_item_to_task(user_id, item.id, task_id, float(item.quantity))
                    
                    # Log to process logs
                    material_type = MaterialType.query.get(item.material_type_id)
                    ProcessLogger.log_add_item_to_task(
                        user_id, task_id, item.id, float(item.quantity), 
                        material_type.material_name if material_type else ""
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
                
                # Get available items from this lot with the specified material type
                # Order by quantity ascending (shorter materials first)
                available_items = db.session.query(Item, Carton).join(
                    Carton, Item.parent_id == Carton.id
                ).filter(
                    Carton.parent_lot_id == lot_id,
                    Item.material_type_id == material_type_id,
                    Item.status == 'available'
                ).order_by(Item.quantity.asc(), Item.created_at.asc()).all()
                
                remaining_quantity = requested_quantity
                
                for item, carton in available_items:
                    if remaining_quantity <= 0:
                        break
                    
                    item_quantity = float(item.quantity)
                    
                    if item_quantity <= remaining_quantity:
                        # Use entire item
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
                        
                        # Log the assignment
                        StockLogger.log_assign_item_to_task(user_id, item.id, task_id, item_quantity)
                        
                        # Log to process logs
                        material_type = MaterialType.query.get(item.material_type_id)
                        ProcessLogger.log_add_item_to_task(
                            user_id, task_id, item.id, item_quantity, 
                            material_type.material_name if material_type else ""
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
                        child_item = Item(
                            id=child_item_id,
                            material_type_id=item.material_type_id,
                            quantity=child_quantity,
                            status='assigned',
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

                        # Log the creation and assignment
                        StockLogger.log_create(user_id, 'item', child_item_id)
                        StockLogger.log_assign_item_to_task(user_id, child_item_id, task_id, child_quantity)
                        
                        # Log to process logs
                        material_type = MaterialType.query.get(child_item.material_type_id)
                        ProcessLogger.log_add_item_to_task(
                            user_id, task_id, child_item_id, child_quantity, 
                            material_type.material_name if material_type else ""
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
    DELETE: Remove an item from a task
    """
    try:
        task = Task.query.get_or_404(task_id)
        item = Item.query.get_or_404(item_id)
        user_id = get_jwt_identity()
        
        # Check if item is assigned to this task
        try:
            task_ids = json.loads(item.task_ids) if item.task_ids else []
            if task_id not in task_ids:
                return jsonify({'error': 'Item is not assigned to this task'}), 400
            
            # Remove task ID from item's task_ids
            task_ids.remove(task_id)
            item.task_ids = json.dumps(task_ids)
            
            # If no more tasks assigned, mark as available
            if not task_ids:
                item.status = 'available'
            
            # Log the removal
            StockLogger.log_remove_item_from_task(user_id, item.id, task_id, item.quantity)
            
            # Log to process logs
            material_type = MaterialType.query.get(item.material_type_id)
            ProcessLogger.create_log(
                user_id=user_id,
                action_type='UPDATE',
                entity_type='task',
                entity_id=task_id,
                details=f"remove item #{item.id} ({item.quantity} {material_type.material_name if material_type else ''})"
            )
            
            db.session.commit()
            
            return jsonify({
                'message': 'Item removed from task successfully',
                'item_id': item_id,
                'task_id': task_id
            })
            
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid task_ids format'}), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to remove item from task', 'details': str(e)}), 500

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