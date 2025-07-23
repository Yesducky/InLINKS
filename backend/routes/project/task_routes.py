import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Task, SubTask
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db

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
    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        task_id = generate_id('TSK', Task)
        task = Task(
            id=task_id,
            task_name=data['task_name'],
            description=data.get('description'),
            state=data.get('state'),
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
            'state': task.state,
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
        old_data = {field: getattr(task, field) for field in ['task_name', 'description', 'state', 'start_date', 'due_date',
                          'completed_at', 'assignee_id', 'estimated_hour', 'work_order_id']}
        new_data = {}
        for field in old_data:
            if field in ['start_date', 'due_date']:
                val = data.get(field)
                new_data[field] = parse_date(val) if val is not None else old_data[field]
            elif field == 'completed_at':
                new_data[field] = datetime.datetime.now() if data.get('state', task.state) == 'completed' else old_data[field]
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
    return jsonify([
        {
            'id': s.id,
            'subtask_name': s.subtask_name,
            'description': s.description,
            'state': s.state,
            'start_date': s.start_date.isoformat() if s.start_date else None,
            'due_date': s.due_date.isoformat() if s.due_date else None,
            'completed_at': s.completed_at.isoformat() if s.completed_at else None,
            'assignee_id': s.assignee_id,
            'estimated_hour': s.estimated_hour,
            'task_id': s.task_id,
            'created_at': s.created_at.isoformat() if s.created_at else None
        }
        for s in subtasks
    ])

