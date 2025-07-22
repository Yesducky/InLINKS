import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import WorkOrder, Task
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db

workorder_bp = Blueprint('workorder', __name__)


def parse_date(date_str):
    if not date_str:
        return None
    import datetime
    try:
        return datetime.datetime.fromisoformat(date_str)
    except Exception:
        return None


@workorder_bp.route('/work_orders', methods=['GET', 'POST'])
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
            start_date=parse_date(data.get('start_date')),
            due_date=parse_date(data.get('due_date')),
            completed_at=parse_date(data.get('completed_at')),
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
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='work_order',
            entity_id=work_order_id,
            entity_name=data['work_order_name']
        )
        db.session.commit()
        return jsonify({'message': 'Work order created', 'id': work_order_id}), 201

@workorder_bp.route('/work_orders/<string:work_order_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def work_order_detail(work_order_id):
    work_order = WorkOrder.query.get_or_404(work_order_id)
    if request.method == 'GET':
        assignee = work_order.assignee if hasattr(work_order, 'assignee') else None
        workflow_type = work_order.workflow_type if hasattr(work_order, 'workflow_type') else None
        parent_project = work_order.parent_project if hasattr(work_order, 'parent_project') else None
        return jsonify({
            'id': work_order.id,
            'work_order_name': work_order.work_order_name,
            'description': work_order.description,
            'state': work_order.state,
            'start_date': work_order.start_date.isoformat() if work_order.start_date else None,
            'due_date': work_order.due_date.isoformat() if work_order.due_date else None,
            'completed_at': work_order.completed_at.isoformat() if work_order.completed_at else None,
            'assignee': {'id': assignee.id, 'name': assignee.username} if assignee else None,
            'estimated_hour': work_order.estimated_hour,
            'workflow_type': {'id': workflow_type.id, 'name': workflow_type.name} if workflow_type else None,
            'parent_project': {'id': parent_project.id, 'name': parent_project.project_name} if parent_project else None,
            'lot_id': work_order.lot_id,
            'task_ids': work_order.task_ids,
            'process_log_ids': work_order.process_log_ids,
            'created_at': work_order.created_at.isoformat() if work_order.created_at else None

        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()

        # Prepare old and new data for logging
        old_data = {field: getattr(work_order, field) for field in ['work_order_name', 'description', 'state', 'start_date', 'due_date',
                          'completed_at', 'assignee_id', 'estimated_hour', 'workflow_type_id',
                          'parent_project_id', 'lot_id']}

        # Use data.get with fallback to old value, and parse dates only if present
        new_data = {}
        for field in old_data:
            if field in ['start_date', 'due_date']:
                val = data.get(field)
                new_data[field] = parse_date(val) if val is not None else old_data[field]
            elif field == 'completed_at':
                new_data[field] = datetime.datetime.now() if data.get('state', work_order.state) == 'completed' else old_data[field]
            else:
                new_data[field] = data.get(field, old_data[field])

        # Update the project attributes
        for field in new_data:
            setattr(work_order, field, new_data[field])

        ProcessLogger.log_update(
            user_id=current_user_id,
            entity_type='work_order',
            entity_id=work_order_id,
            old_obj=old_data,
            new_data=new_data,
            entity_name=work_order.work_order_name
        )

        db.session.commit()
        return jsonify({'message': 'Work order updated'})
    elif request.method == 'DELETE':
        current_user_id = get_jwt_identity()
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

@workorder_bp.route('/work_orders/<string:work_order_id>/tasks', methods=['GET'])
@jwt_required()
def get_work_order_tasks(work_order_id):
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
