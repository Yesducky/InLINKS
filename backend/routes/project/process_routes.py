"""
Process collection routes - Work Orders, Tasks, Sub Tasks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import WorkOrder, Task, SubTask, ProcessLog, User
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db

process_bp = Blueprint('process', __name__)

# Work Orders endpoints
@process_bp.route('/work_orders', methods=['GET', 'POST'])
@jwt_required()
def work_orders():
    if request.method == 'GET':
        work_orders = WorkOrder.query.all()
        return jsonify([{
            'id': wo.id,
            'work_order_name': wo.work_order_name,
            'description': wo.description,
            'state': wo.state,
            'start_date': wo.start_date.isoformat() if wo.start_date else None,
            'due_date': wo.due_date.isoformat() if wo.due_date else None,
            'completed_at': wo.completed_at.isoformat() if wo.completed_at else None,
            'assignee_id': wo.assignee_id,
            'estimated_hour': wo.estimated_hour,
            'workflow_type_id': wo.workflow_type_id,
            'parent_project_id': wo.parent_project_id,
            'lot_id': wo.lot_id,
            'task_ids': wo.task_ids,
            'process_log_ids': wo.process_log_ids,
            'created_at': wo.created_at.isoformat() if wo.created_at else None
        } for wo in work_orders])

    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        work_order_id = generate_id('WO', WorkOrder)
        work_order = WorkOrder(
            id=work_order_id,
            work_order_name=data['work_order_name'],
            description=data.get('description'),
            state=data.get('state'),
            start_date=data.get('start_date'),
            due_date=data.get('due_date'),
            completed_at=data.get('completed_at'),
            assignee_id=data.get('assignee_id'),
            estimated_hour=data.get('estimated_hour'),
            workflow_type_id=data['workflow_type_id'],
            parent_project_id=data['parent_project_id'],
            lot_id=data.get('lot_id'),
            task_ids='[]',
            process_log_ids='[]'
        )
        db.session.add(work_order)
        db.session.flush()
        
        # Log the creation
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='work_order',
            entity_id=work_order_id,
            entity_name=data['work_order_name']
        )
        
        db.session.commit()
        return jsonify({'message': 'Work order created', 'id': work_order_id}), 201

@process_bp.route('/work_orders/<string:work_order_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def work_order_detail(work_order_id):
    work_order = WorkOrder.query.get_or_404(work_order_id)
    if request.method == 'GET':
        return jsonify({
            'id': work_order.id,
            'work_order_name': work_order.work_order_name,
            'description': work_order.description,
            'state': work_order.state,
            'start_date': work_order.start_date.isoformat() if work_order.start_date else None,
            'due_date': work_order.due_date.isoformat() if work_order.due_date else None,
            'completed_at': work_order.completed_at.isoformat() if work_order.completed_at else None,
            'assignee_id': work_order.assignee_id,
            'estimated_hour': work_order.estimated_hour,
            'workflow_type_id': work_order.workflow_type_id,
            'parent_project_id': work_order.parent_project_id,
            'lot_id': work_order.lot_id,
            'task_ids': work_order.task_ids,
            'process_log_ids': work_order.process_log_ids,
            'created_at': work_order.created_at.isoformat() if work_order.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Track changes before updating
        changes = {}
        fields_to_check = ['work_order_name', 'description', 'state', 'start_date', 'due_date', 
                          'completed_at', 'assignee_id', 'estimated_hour', 'workflow_type_id', 
                          'parent_project_id', 'lot_id']
        
        for field in fields_to_check:
            if field in data:
                old_value = getattr(work_order, field)
                new_value = data[field]
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}
        
        # Update the work order
        work_order.work_order_name = data.get('work_order_name', work_order.work_order_name)
        work_order.description = data.get('description', work_order.description)
        work_order.state = data.get('state', work_order.state)
        work_order.start_date = data.get('start_date', work_order.start_date)
        work_order.due_date = data.get('due_date', work_order.due_date)
        work_order.completed_at = data.get('completed_at', work_order.completed_at)
        work_order.assignee_id = data.get('assignee_id', work_order.assignee_id)
        work_order.estimated_hour = data.get('estimated_hour', work_order.estimated_hour)
        work_order.workflow_type_id = data.get('workflow_type_id', work_order.workflow_type_id)
        work_order.parent_project_id = data.get('parent_project_id', work_order.parent_project_id)
        work_order.lot_id = data.get('lot_id', work_order.lot_id)
        work_order.task_ids = data.get('task_ids', work_order.task_ids)
        
        # Log the changes
        if changes:
            ProcessLogger.log_update(
                user_id=current_user_id,
                entity_type='work_order',
                entity_id=work_order_id,
                old_obj=work_order,
                new_data=data,
                entity_name=work_order.work_order_name
            )
        
        db.session.commit()
        return jsonify({'message': 'Work order updated'})
    elif request.method == 'DELETE':
        current_user_id = get_jwt_identity()
        
        # Log the deletion
        ProcessLogger.log_delete(
            user_id=current_user_id,
            entity_type='work_order',
            entity_id=work_order_id,
            entity_name=work_order.work_order_name
        )
        
        db.session.delete(work_order)
        db.session.commit()
        return jsonify({'message': 'Work order deleted'})
    return None


# Tasks endpoints
@process_bp.route('/tasks', methods=['GET', 'POST'])
@jwt_required()
def tasks():
    if request.method == 'GET':
        tasks = Task.query.all()
        return jsonify([{
            'id': t.id,
            'task_name': t.task_name,
            'description': t.description,
            'state': t.state,
            'start_date': t.start_date.isoformat() if t.start_date else None,
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'completed_at': t.completed_at.isoformat() if t.completed_at else None,
            'assignee_id': t.assignee_id,
            'estimated_hour': t.estimated_hour,
            'work_order_id': t.work_order_id,
            'subtask_ids': t.subtask_ids,
            'created_at': t.created_at.isoformat() if t.created_at else None
        } for t in tasks])

    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        task_id = generate_id('TSK', Task)
        task = Task(
            id=task_id,
            task_name=data['task_name'],
            description=data.get('description'),
            state=data.get('state'),
            start_date=data.get('start_date'),
            due_date=data.get('due_date'),
            completed_at=data.get('completed_at'),
            assignee_id=data.get('assignee_id'),
            estimated_hour=data.get('estimated_hour'),
            work_order_id=data['work_order_id'],
            subtask_ids='[]'
        )
        db.session.add(task)
        db.session.flush()
        
        # Log the creation
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='task',
            entity_id=task_id,
            entity_name=data['task_name']
        )
        
        db.session.commit()
        return jsonify({'message': 'Task created', 'id': task_id}), 201

@process_bp.route('/tasks/<string:task_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def task_detail(task_id):
    task = Task.query.get_or_404(task_id)
    if request.method == 'GET':
        return jsonify({
            'id': task.id,
            'task_name': task.task_name,
            'description': task.description,
            'state': task.state,
            'start_date': task.start_date.isoformat() if task.start_date else None,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'assignee_id': task.assignee_id,
            'estimated_hour': task.estimated_hour,
            'work_order_id': task.work_order_id,
            'subtask_ids': task.subtask_ids,
            'created_at': task.created_at.isoformat() if task.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Track changes before updating
        changes = {}
        fields_to_check = ['task_name', 'description', 'state', 'start_date', 'due_date', 
                          'completed_at', 'assignee_id', 'estimated_hour', 'work_order_id']
        
        for field in fields_to_check:
            if field in data:
                old_value = getattr(task, field)
                new_value = data[field]
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}
        
        # Update the task
        task.task_name = data.get('task_name', task.task_name)
        task.description = data.get('description', task.description)
        task.state = data.get('state', task.state)
        task.start_date = data.get('start_date', task.start_date)
        task.due_date = data.get('due_date', task.due_date)
        task.completed_at = data.get('completed_at', task.completed_at)
        task.assignee_id = data.get('assignee_id', task.assignee_id)
        task.estimated_hour = data.get('estimated_hour', task.estimated_hour)
        task.work_order_id = data.get('work_order_id', task.work_order_id)
        task.subtask_ids = data.get('subtask_ids', task.subtask_ids)
        
        # Log the changes
        if changes:
            ProcessLogger.log_update(
                user_id=current_user_id,
                entity_type='task',
                entity_id=task_id,
                old_obj=task,
                new_data=data,
                entity_name=task.task_name
            )
        
        db.session.commit()
        return jsonify({'message': 'Task updated'})
    elif request.method == 'DELETE':
        current_user_id = get_jwt_identity()
        
        # Log the deletion
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


# Sub Tasks endpoints
@process_bp.route('/subtasks', methods=['GET', 'POST'])
@jwt_required()
def subtasks():
    if request.method == 'GET':
        subtasks = SubTask.query.all()
        return jsonify([{
            'id': st.id,
            'subtask_name': st.subtask_name,
            'description': st.description,
            'state': st.state,
            'start_date': st.start_date.isoformat() if st.start_date else None,
            'due_date': st.due_date.isoformat() if st.due_date else None,
            'completed_at': st.completed_at.isoformat() if st.completed_at else None,
            'assignee_id': st.assignee_id,
            'estimated_hour': st.estimated_hour,
            'task_id': st.task_id,
            'created_at': st.created_at.isoformat() if st.created_at else None
        } for st in subtasks])

    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        subtask_id = generate_id('SUB', SubTask)
        subtask = SubTask(
            id=subtask_id,
            subtask_name=data['subtask_name'],
            description=data.get('description'),
            state=data.get('state'),
            start_date=data.get('start_date'),
            due_date=data.get('due_date'),
            completed_at=data.get('completed_at'),
            assignee_id=data.get('assignee_id'),
            estimated_hour=data.get('estimated_hour'),
            task_id=data['task_id']
        )
        db.session.add(subtask)
        db.session.flush()
        
        # Log the creation
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='subtask',
            entity_id=subtask_id,
            entity_name=data['subtask_name']
        )
        
        db.session.commit()
        return jsonify({'message': 'Subtask created', 'id': subtask_id}), 201
    return None


@process_bp.route('/subtasks/<string:subtask_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def subtask_detail(subtask_id):
    subtask = SubTask.query.get_or_404(subtask_id)
    if request.method == 'GET':
        return jsonify({
            'id': subtask.id,
            'subtask_name': subtask.subtask_name,
            'description': subtask.description,
            'state': subtask.state,
            'start_date': subtask.start_date.isoformat() if subtask.start_date else None,
            'due_date': subtask.due_date.isoformat() if subtask.due_date else None,
            'completed_at': subtask.completed_at.isoformat() if subtask.completed_at else None,
            'assignee_id': subtask.assignee_id,
            'estimated_hour': subtask.estimated_hour,
            'task_id': subtask.task_id,
            'created_at': subtask.created_at.isoformat() if subtask.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Track changes before updating
        changes = {}
        fields_to_check = ['subtask_name', 'description', 'state', 'start_date', 'due_date', 
                          'completed_at', 'assignee_id', 'estimated_hour', 'task_id']
        
        for field in fields_to_check:
            if field in data:
                old_value = getattr(subtask, field)
                new_value = data[field]
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}
        
        # Update the subtask
        subtask.subtask_name = data.get('subtask_name', subtask.subtask_name)
        subtask.description = data.get('description', subtask.description)
        subtask.state = data.get('state', subtask.state)
        subtask.start_date = data.get('start_date', subtask.start_date)
        subtask.due_date = data.get('due_date', subtask.due_date)
        subtask.completed_at = data.get('completed_at', subtask.completed_at)
        subtask.assignee_id = data.get('assignee_id', subtask.assignee_id)
        subtask.estimated_hour = data.get('estimated_hour', subtask.estimated_hour)
        subtask.task_id = data.get('task_id', subtask.task_id)
        
        # Log the changes
        if changes:
            ProcessLogger.log_update(
                user_id=current_user_id,
                entity_type='subtask',
                entity_id=subtask_id,
                old_obj=subtask,
                new_data=data,
                entity_name=subtask.subtask_name
            )
        
        db.session.commit()
        return jsonify({'message': 'Subtask updated'})
    elif request.method == 'DELETE':
        current_user_id = get_jwt_identity()
        
        # Log the deletion
        ProcessLogger.log_delete(
            user_id=current_user_id,
            entity_type='subtask',
            entity_id=subtask_id,
            entity_name=subtask.subtask_name
        )
        
        db.session.delete(subtask)
        db.session.commit()
        return jsonify({'message': 'Subtask deleted'})
    return None


@process_bp.route('/get_process_logs', methods=['GET'])
@jwt_required()
def get_process_logs():
    project_id = request.args.get('project_id')
    work_order_id = request.args.get('work_order_id')
    task_id = request.args.get('task_id')
    subtask_id = request.args.get('subtask_id')

    query = ProcessLog.query
    if project_id:
        query = query.filter_by(project_id=project_id)
    if work_order_id:
        query = query.filter_by(work_order_id=work_order_id)
    if task_id:
        query = query.filter_by(task_id=task_id)
    if subtask_id:
        query = query.filter_by(subtask_id=subtask_id)

    logs = query.all()
    return jsonify([
        {
            'id': log.id,
            'log_type_id': log.log_type_id,
            'date': log.date.isoformat() if log.date else None,
            'user_id': log.user_id,
            'description': log.description,
            'project_id': getattr(log, 'project_id', None),
            'work_order_id': getattr(log, 'work_order_id', None),
            'task_id': getattr(log, 'task_id', None),
            'subtask_id': getattr(log, 'subtask_id', None),
            'created_at': log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ])

# Get all tasks by workorder id
@process_bp.route('/work_orders/<string:work_order_id>/tasks', methods=['GET'])
@jwt_required()
def get_tasks_by_workorder(work_order_id):
    tasks = Task.query.filter_by(work_order_id=work_order_id).all()
    return jsonify([
        {
            'id': t.id,
            'task_name': t.task_name,
            'description': t.description,
            'state': t.state,
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