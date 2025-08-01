"""
Process collection routes - Work Orders, Tasks, Sub Tasks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import ProcessLog, ProcessStateType
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db

process_bp = Blueprint('process', __name__)

# Tasks endpoints

@process_bp.route('/get_process_logs/<string:type>/<string:id>', methods=['GET'])
@jwt_required()
def get_process_logs(type, id):

    query = ProcessLog.query
    print(type, id)

    if type == 'project':
        query = query.filter_by(project_id=id)
    elif type == 'work_order':
        query = query.filter_by(work_order_id=id)
    elif type == 'task':
        query = query.filter_by(task_id=id)
    elif type == 'subtask':
        query = query.filter_by(subtask_id=id)
    else:
        return jsonify({'error': 'Invalid type'}), 400

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

@process_bp.route('/process_state_types/by_type/<state_type>', methods=['GET'])
@jwt_required()
def get_process_state_types_by_type(state_type):
    states = ProcessStateType.query.filter_by(state_type=state_type).all()
    return jsonify([
        {
            'id': s.id,
            'state_name': s.state_name,
            'state_type': s.state_type,
            'description': s.description,
            'bg_color': s.bg_color,
            'text_color': s.text_color,
            'icon': s.icon,
            'order_index': s.order_index,
            'is_active': s.is_active,
            'created_at': s.created_at.isoformat() if s.created_at else None
        }
        for s in states
    ])
