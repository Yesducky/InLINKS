"""
Process collection routes - Work Orders, Tasks, Sub Tasks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import ProcessLog
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db

process_bp = Blueprint('process', __name__)

# Tasks endpoints

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


