import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import SubTask
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db

subtask_bp = Blueprint('subtasks', __name__)

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.datetime.fromisoformat(date_str)
    except Exception:
        return None

@subtask_bp.route('/subtasks', methods=['GET', 'POST'])
@jwt_required()
def subtasks():
    if request.method == 'GET':
        subtasks = SubTask.query.all()
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
    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        subtask_id = generate_id('SUB', SubTask)
        subtask = SubTask(
            id=subtask_id,
            subtask_name=data['subtask_name'],
            description=data.get('description'),
            state=data.get('state'),
            start_date=parse_date(data.get('start_date')),
            due_date=parse_date(data.get('due_date')),
            completed_at=parse_date(data.get('completed_at')),
            assignee_id=data.get('assignee_id'),
            estimated_hour=float(data.get('estimated_hour')) if data.get('estimated_hour') not in (None, '') else None,
            task_id=data.get('task_id')
        )
        db.session.add(subtask)
        db.session.flush()
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='subtask',
            entity_id=subtask_id,
            entity_name=data['subtask_name']
        )
        db.session.commit()
        return jsonify({'message': 'SubTask created', 'id': subtask_id}), 201

@subtask_bp.route('/subtasks/<string:subtask_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def subtask_detail(subtask_id):
    subtask = SubTask.query.get_or_404(subtask_id)
    if request.method == 'GET':
        assignee = subtask.assignee if hasattr(subtask, 'assignee') else None
        task = subtask.task if hasattr(subtask, 'task') else None
        return jsonify({
            'id': subtask.id,
            'subtask_name': subtask.subtask_name,
            'description': subtask.description,
            'state': subtask.state,
            'start_date': subtask.start_date.isoformat() if subtask.start_date else None,
            'due_date': subtask.due_date.isoformat() if subtask.due_date else None,
            'completed_at': subtask.completed_at.isoformat() if subtask.completed_at else None,
            'assignee': {'id': assignee.id, 'name': assignee.username} if assignee else None,
            'estimated_hour': subtask.estimated_hour,
            'task': {'id': task.id, 'name': task.task_name} if task else None,
            'created_at': subtask.created_at.isoformat() if subtask.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        old_data = {field: getattr(subtask, field) for field in ['subtask_name', 'description', 'state', 'start_date', 'due_date',
                          'completed_at', 'assignee_id', 'estimated_hour', 'task_id']}
        new_data = {}
        for field in old_data:
            if field in ['start_date', 'due_date']:
                val = data.get(field)
                new_data[field] = parse_date(val) if val is not None else old_data[field]
            elif field == 'completed_at':
                new_data[field] = datetime.datetime.now() if data.get('state', subtask.state) == 'completed' else old_data[field]
            elif field == 'estimated_hour':
                est = data.get('estimated_hour', old_data['estimated_hour'])
                if est == '' or est is None:
                    new_data[field] = None
                else:
                    new_data[field] = float(est)
            else:
                new_data[field] = data.get(field, old_data[field])
        for field in new_data:
            setattr(subtask, field, new_data[field])
        ProcessLogger.log_update(
            user_id=current_user_id,
            entity_type='subtask',
            entity_id=subtask_id,
            old_obj=old_data,
            new_data=new_data,
            entity_name=subtask.subtask_name
        )
        db.session.commit()
        return jsonify({'message': 'SubTask updated'})
    elif request.method == 'DELETE':
        current_user_id = get_jwt_identity()
        ProcessLogger.log_delete(
            user_id=current_user_id,
            entity_type='subtask',
            entity_id=subtask_id,
            entity_name=subtask.subtask_name
        )
        db.session.delete(subtask)
        db.session.commit()
        return jsonify({'message': 'SubTask deleted'})
    return None

