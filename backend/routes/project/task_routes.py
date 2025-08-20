import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Task, SubTask, ProcessStateType, Item, ItemStateType
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from services.blockchain_service import BlockchainService
from __init__ import db
import json

task_bp = Blueprint('task', __name__)

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.datetime.fromisoformat(date_str)
    except Exception:
        return None

@task_bp.route('/tasks', methods=['GET', 'POST'])
@jwt_required()
def tasks():
    if request.method == 'GET':
        tasks = Task.query.all()
        return jsonify([
            {
                'id': t.id,
                'task_name': t.task_name,
                'description': t.description,
                'state_id': t.state_id,
                'state': {
                    'id': t.state.id,
                    'state_name': t.state.state_name,
                    'bg_color': t.state.bg_color,
                    'text_color': t.state.text_color,
                    'icon': t.state.icon
                } if t.state else None,
                'start_date': t.start_date.isoformat() if t.start_date else None,
                'due_date': t.due_date.isoformat() if t.due_date else None,
                'completed_at': t.completed_at.isoformat() if t.completed_at else None,
                'assignee_id': t.assignee_id,
                'estimated_hour': t.estimated_hour,
                'work_order_id': t.work_order_id,
                'subtask_ids': t.subtask_ids,
                'created_at': t.created_at.isoformat() if t.created_at else None
            }
            for t in tasks
        ])
    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        task_id = generate_id('TSK', Task)
        task = Task(
            id=task_id,
            task_name=data['task_name'],
            description=data.get('description'),
            state_id=data.get('state_id'),
            start_date=parse_date(data.get('start_date')),
            due_date=parse_date(data.get('due_date')),
            completed_at=parse_date(data.get('completed_at')),
            assignee_id=data.get('assignee_id'),
            estimated_hour=float(data.get('estimated_hour')) if data.get('estimated_hour') not in (None, '') else None,
            work_order_id=data.get('work_order_id'),
            subtask_ids='[]'
        )
        db.session.add(task)
        db.session.flush()
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='task',
            entity_id=task_id,
            entity_name=data['task_name']
        )
        db.session.commit()
        return jsonify({'message': 'Task created', 'id': task_id}), 201

@task_bp.route('/tasks/<string:task_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def task_detail(task_id):
    task = Task.query.get_or_404(task_id)
    if request.method == 'GET':
        assignee = task.assignee if hasattr(task, 'assignee') else None
        work_order = task.work_order if hasattr(task, 'work_order') else None
        return jsonify({
            'id': task.id,
            'task_name': task.task_name,
            'description': task.description,
            'state_id': task.state_id,
            'state': {
                'id': task.state.id,
                'state_name': task.state.state_name,
                'bg_color': task.state.bg_color,
                'text_color': task.state.text_color,
                'icon': task.state.icon
            } if task.state else None,
            'start_date': task.start_date.isoformat() if task.start_date else None,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'assignee': {'id': assignee.id, 'name': assignee.username} if assignee else None,
            'estimated_hour': task.estimated_hour,
            'work_order': {'id': work_order.id, 'name': work_order.work_order_name} if work_order else None,
            'subtask_ids': task.subtask_ids,
            'created_at': task.created_at.isoformat() if task.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        old_data = {field: getattr(task, field) for field in ['task_name', 'description', 'state_id', 'start_date', 'due_date',
                          'completed_at', 'assignee_id', 'estimated_hour', 'work_order_id']}
        new_data = {}
        for field in old_data:
            if field in ['start_date', 'due_date']:
                val = data.get(field)
                new_data[field] = parse_date(val) if val is not None else old_data[field]
            elif field == 'completed_at':
                completed_state = ProcessStateType.query.filter_by(state_type='task', state_name='completed').first()
                new_data[field] = datetime.datetime.now() if completed_state and data.get('state_id') == completed_state.id else old_data[field]
            elif field == 'estimated_hour':
                est = data.get('estimated_hour', old_data['estimated_hour'])
                if est == '' or est is None:
                    new_data[field] = None
                else:
                    new_data[field] = float(est)
            else:
                new_data[field] = data.get(field, old_data[field])
        for field in new_data:
            setattr(task, field, new_data[field])
        ProcessLogger.log_update(
            user_id=current_user_id,
            entity_type='task',
            entity_id=task_id,
            old_obj=old_data,
            new_data=new_data,
            entity_name=task.task_name
        )
        db.session.commit()
        return jsonify({'message': 'Task updated'})
    elif request.method == 'DELETE':
        current_user_id = get_jwt_identity()
        ProcessLogger.log_delete(
            user_id=current_user_id,
            entity_type='task',
            entity_id=task_id,
            entity_name=task.task_name
        )
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted'})
    return None

@task_bp.route('/tasks/<string:task_id>/sub_tasks', methods=['GET'])
@jwt_required()
def get_task_subtasks(task_id):
    subtasks = SubTask.query.filter_by(task_id=task_id).all()
    result = [
        {
            'id': s.id,
            'subtask_name': s.subtask_name,
            'description': s.description,
            'start_date': s.start_date.isoformat() if s.start_date else None,
            'state': s.state.to_dict() if s.state else None,
            'due_date': s.due_date.isoformat() if s.due_date else None,
            'completed_at': s.completed_at.isoformat() if s.completed_at else None,
            'assignee_id': s.assignee_id,
            'estimated_hour': s.estimated_hour,
            'task_id': s.task_id,
            'created_at': s.created_at.isoformat() if s.created_at else None
        }
        for s in subtasks
    ]
    return jsonify(result), 200

@task_bp.route('/tasks/by_user/<user_id>', methods=['GET'])
@jwt_required()
def get_tasks_by_user(user_id):
    task = Task.query.filter_by(assignee_id=user_id).all()

    return jsonify([
        {
            'id': t.id,
            'task_name': t.task_name,
            'description': t.description,
            'state_id': t.state_id,
            'state': {
                'id': t.state.id,
                'state_name': t.state.state_name,
                'bg_color': t.state.bg_color,
                'text_color': t.state.text_color,
                'icon': t.state.icon
            } if t.state else None,
            'start_date': t.start_date.isoformat() if t.start_date else None,
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'completed_at': t.completed_at.isoformat() if t.completed_at else None,
            'assignee_id': t.assignee_id,
            'estimated_hour': t.estimated_hour,
            'work_order': {
                'id': t.work_order.id,
                'work_order_name': t.work_order.work_order_name
            } if t.work_order else None,
        }
        for t in task
    ])

@task_bp.route('/tasks/assign_items', methods=['POST'])
@jwt_required()
def assign_items_to_task():
    data = request.get_json()
    task_id = data.get('task_id')
    material_type_id = data.get('material_type_id')
    total_quantity = data.get('total_quantity')
    lot_id = data.get('lot_id')
    if not (task_id and material_type_id and total_quantity and lot_id):
        return jsonify({'error': 'Missing required fields'}), 400

    from models import Item
    available_items = Item.query.filter_by(material_type_id=material_type_id, lot_id=lot_id).filter(Item.available_quantity > 0).order_by(Item.id).all()
    assigned = []
    remaining = total_quantity
    for item in available_items:
        if remaining <= 0:
            break
        assign_qty = min(item.available_quantity, remaining)
        item.available_quantity -= assign_qty
        assigned.append({'item_id': item.id, 'assigned_quantity': assign_qty})
        remaining -= assign_qty
    if remaining > 0:
        return jsonify({'error': 'Not enough available items in the specified lot'}), 400
    db.session.commit()
    return jsonify({'task_id': task_id, 'assigned_items': assigned, 'lot_id': lot_id}), 200

@task_bp.route('/tasks/<string:task_id>/start', methods=['POST'])
@jwt_required()
def start_task(task_id):
    """
    POST: Start a task - set state to 'in_progress' and set start_date
    Updates all assigned items to 'In Progress' state (IST005) via blockchain
    Only allowed if current state is 'assigned_worker'
    """
    try:
        task = Task.query.get_or_404(task_id)
        current_user_id = get_jwt_identity()
        
        # Check if task is assigned to the current user
        if task.assignee_id != current_user_id:
            return jsonify({'error': 'You can only start tasks assigned to you'}), 403
        
        # Check current state
        if not task.state or task.state.state_name != 'assigned_worker':
            return jsonify({'error': 'Only tasks in assigned_worker state can be started'}), 400

        # Get the in_progress state for tasks
        in_progress_state = ProcessStateType.query.filter_by(
            state_type='task',
            state_name='in_progress'
        ).first()
        
        if not in_progress_state:
            return jsonify({'error': 'in_progress state not found'}), 500

        # Get the 'In Progress' state for items (IST005)
        item_in_progress_state = ItemStateType.query.filter_by(
            state_name='In Progress'
        ).first()

        if not item_in_progress_state:
            return jsonify({'error': 'Item In Progress state (IST005) not found'}), 500

        # Initialize blockchain service
        blockchain_service = BlockchainService()

        # Get all items assigned to this task
        task_items = Item.query.filter(
            Item.task_ids.contains(task_id)
        ).all()

        # Extract item IDs for blockchain processing
        item_ids = [item.id for item in task_items]

        # Update item states via blockchain service
        updated_items, blockchain_errors = blockchain_service.record_task_state_changes(
            task_id, item_ids, current_user_id, 'In Progress'
        )

        # Update task state and start_date
        old_state = task.state.state_name if task.state else None
        task.state_id = in_progress_state.id
        task.start_date = datetime.datetime.now()
        
        # Log the state change
        ProcessLogger.log_update(
            user_id=current_user_id,
            entity_type='task',
            entity_id=task_id,
            old_obj={'state_name': old_state, 'start_date': None},
            new_data={'state_name': 'in_progress', 'start_date': task.start_date.isoformat()},
            entity_name=task.task_name
        )
        
        # Log task start action
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='task_start',
            entity_id=task_id,
            entity_name=task.task_name,
        )
        
        db.session.commit()
        
        response = {
            'message': 'Task started successfully',
            'task_id': task_id,
            'new_state': 'in_progress',
            'start_date': task.start_date.isoformat(),
            'updated_items_count': len(updated_items),
            'updated_items': updated_items
        }

        if blockchain_errors:
            response['blockchain_errors'] = blockchain_errors
            response['warning'] = f'{len(blockchain_errors)} items had blockchain recording errors'

        return jsonify(response)

    except Exception as e:
        db.session.rollback()
        print(e)
        return jsonify({'error': 'Failed to start task', 'details': str(e)}), 500



@task_bp.route('/tasks/<string:task_id>/waiting-tc', methods=['POST'])
@jwt_required()
def set_task_waiting_tc(task_id):
    """
    POST: Set task to 'waiting T&C' state
    Updates all assigned items to 'Waiting T&C' state via blockchain
    Can be called from 'in_progress' or other valid states
    """
    try:
        task = Task.query.get_or_404(task_id)
        current_user_id = get_jwt_identity()

        # Check if task is assigned to the current user
        if task.assignee_id != current_user_id:
            return jsonify({'error': 'You can only modify tasks assigned to you'}), 403

        # Check current state - allow from in_progress or assigned_worker
        valid_states = ['in_progress', 'assigned_worker']
        if not task.state or task.state.state_name not in valid_states:
            return jsonify({'error': f'Tasks can only be set to waiting T&C from states: {", ".join(valid_states)}'}), 400

        # Get the waiting T&C state for tasks
        waiting_tc_state = ProcessStateType.query.filter_by(
            state_type='task',
            state_name='waiting T&C'
        ).first()

        if not waiting_tc_state:
            return jsonify({'error': 'waiting T&C state not found'}), 500

        # Get the 'Waiting T&C' state for items
        item_waiting_tc_state = ItemStateType.query.filter_by(
            state_name='Waiting T&C'
        ).first()

        if not item_waiting_tc_state:
            return jsonify({'error': 'Item Waiting T&C state not found'}), 500

        # Initialize blockchain service
        blockchain_service = BlockchainService()

        # Get all items assigned to this task
        task_items = Item.query.filter(
            Item.task_ids.contains(task_id)
        ).all()

        # Extract item IDs for blockchain processing
        item_ids = [item.id for item in task_items]

        # Update item states via blockchain service
        updated_items, blockchain_errors = blockchain_service.record_task_state_changes(
            task_id, item_ids, current_user_id, 'Waiting T&C'
        )

        # Update task state
        old_state = task.state.state_name if task.state else None
        task.state_id = waiting_tc_state.id

        # Log the state change
        ProcessLogger.log_update(
            user_id=current_user_id,
            entity_type='task',
            entity_id=task_id,
            old_obj={'state_name': old_state},
            new_data={'state_name': 'waiting T&C'},
            entity_name=task.task_name
        )

        # Log task state change action
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='task_waiting_tc',
            entity_id=task_id,
            entity_name=task.task_name,
        )

        db.session.commit()

        response = {
            'message': 'Task set to waiting T&C successfully',
            'task_id': task_id,
            'old_state': old_state,
            'new_state': 'waiting T&C',
            'updated_items_count': len(updated_items),
            'updated_items': updated_items
        }

        if blockchain_errors:
            response['blockchain_errors'] = blockchain_errors
            response['warning'] = f'{len(blockchain_errors)} items had blockchain recording errors'

        return jsonify(response)

    except Exception as e:
        db.session.rollback()
        print(e)
        return jsonify({'error': 'Failed to set task to waiting T&C', 'details': str(e)}), 500
