"""
Process collection routes - Projects, Work Orders, Tasks, Sub Tasks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import Project, WorkOrder, Task, SubTask
from utils.db_utils import generate_id
from __init__ import db

process_bp = Blueprint('process', __name__)

# Projects endpoints
@process_bp.route('/projects', methods=['GET', 'POST'])
@jwt_required()
def projects():
    if request.method == 'GET':
        projects = Project.query.all()
        return jsonify([{
            'id': p.id,
            'project_name': p.project_name,
            'description': p.description,
            'state': p.state,
            'start_date': p.start_date.isoformat() if p.start_date else None,
            'end_date': p.end_date.isoformat() if p.end_date else None,
            'person_in_charge_id': p.person_in_charge_id,
            'work_order_ids': p.work_order_ids,
            'process_log_ids': p.process_log_ids,
            'priority': p.priority,
            'created_at': p.created_at.isoformat() if p.created_at else None
        } for p in projects])

    elif request.method == 'POST':
        data = request.get_json()
        project_id = generate_id('PRJ', Project)
        project = Project(
            id=project_id,
            project_name=data['project_name'],
            description=data.get('description'),
            state=data.get('state'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            person_in_charge_id=data['person_in_charge_id'],
            work_order_ids=data.get('work_order_ids', '[]'),
            process_log_ids=data.get('process_log_ids', '[]'),
            priority=data.get('priority', 'medium')
        )
        db.session.add(project)
        db.session.commit()
        return jsonify({'message': 'Project created', 'id': project_id}), 201

@process_bp.route('/projects/<string:project_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def project_detail(project_id):
    project = Project.query.get_or_404(project_id)
    if request.method == 'GET':
        return jsonify({
            'id': project.id,
            'project_name': project.project_name,
            'description': project.description,
            'state': project.state,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'end_date': project.end_date.isoformat() if project.end_date else None,
            'person_in_charge_id': project.person_in_charge_id,
            'work_order_ids': project.work_order_ids,
            'process_log_ids': project.process_log_ids,
            'priority': project.priority,
            'created_at': project.created_at.isoformat() if project.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        project.project_name = data.get('project_name', project.project_name)
        project.description = data.get('description', project.description)
        project.state = data.get('state', project.state)
        project.start_date = data.get('start_date', project.start_date)
        project.end_date = data.get('end_date', project.end_date)
        project.person_in_charge_id = data.get('person_in_charge_id', project.person_in_charge_id)
        project.work_order_ids = data.get('work_order_ids', project.work_order_ids)
        project.process_log_ids = data.get('process_log_ids', project.process_log_ids)
        project.priority = data.get('priority', project.priority)
        db.session.commit()
        return jsonify({'message': 'Project updated'})
    elif request.method == 'DELETE':
        db.session.delete(project)
        db.session.commit()
        return jsonify({'message': 'Project deleted'})

# Work Orders endpoints
@process_bp.route('/work_orders', methods=['GET', 'POST'])
@jwt_required()
def work_orders():
    if request.method == 'GET':
        work_orders = WorkOrder.query.all()
        return jsonify([{
            'id': wo.id,
            'work_order_name': wo.work_order_name,
            'workflow_type_id': wo.workflow_type_id,
            'parent_project_id': wo.parent_project_id,
            'lot_id': wo.lot_id,
            'task_ids': wo.task_ids,
            'process_log_ids': wo.process_log_ids,
            'created_at': wo.created_at.isoformat()
        } for wo in work_orders])

    elif request.method == 'POST':
        data = request.get_json()
        work_order_id = generate_id('WO', WorkOrder)

        work_order = WorkOrder(
            id=work_order_id,
            work_order_name=data['work_order_name'],
            workflow_type_id=data['workflow_type_id'],
            parent_project_id=data['parent_project_id'],
            lot_id=data.get('lot_id'),
            task_ids=data.get('task_ids', '[]'),
            process_log_ids=data.get('process_log_ids', '[]')
        )

        db.session.add(work_order)
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
            'workflow_type_id': work_order.workflow_type_id,
            'parent_project_id': work_order.parent_project_id,
            'lot_id': work_order.lot_id,
            'task_ids': work_order.task_ids,
            'process_log_ids': work_order.process_log_ids,
            'created_at': work_order.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        work_order.work_order_name = data.get('work_order_name', work_order.work_order_name)
        work_order.workflow_type_id = data.get('workflow_type_id', work_order.workflow_type_id)
        work_order.lot_id = data.get('lot_id', work_order.lot_id)
        work_order.task_ids = data.get('task_ids', work_order.task_ids)
        work_order.process_log_ids = data.get('process_log_ids', work_order.process_log_ids)

        db.session.commit()
        return jsonify({'message': 'Work order updated'})

    elif request.method == 'DELETE':
        db.session.delete(work_order)
        db.session.commit()
        return jsonify({'message': 'Work order deleted'})

# Tasks endpoints
@process_bp.route('/tasks', methods=['GET', 'POST'])
@jwt_required()
def tasks():
    if request.method == 'GET':
        tasks = Task.query.all()
        return jsonify([{
            'id': t.id,
            'task_type': t.task_type,
            'item_ids': t.item_ids,
            'status': t.status,
            'user_ids': t.user_ids,
            'subtask_ids': t.subtask_ids,
            'process_log_ids': t.process_log_ids,
            'parent_work_order_id': t.parent_work_order_id,
            'created_at': t.created_at.isoformat()
        } for t in tasks])

    elif request.method == 'POST':
        data = request.get_json()
        task_id = generate_id('TSK', Task)

        task = Task(
            id=task_id,
            task_type=data['task_type'],
            item_ids=data.get('item_ids', '[]'),
            status=data.get('status', 'pending'),
            user_ids=data.get('user_ids', '[]'),
            subtask_ids=data.get('subtask_ids', '[]'),
            process_log_ids=data.get('process_log_ids', '[]'),
            parent_work_order_id=data['parent_work_order_id']
        )

        db.session.add(task)
        db.session.commit()

        return jsonify({'message': 'Task created', 'id': task_id}), 201

@process_bp.route('/tasks/<string:task_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def task_detail(task_id):
    task = Task.query.get_or_404(task_id)

    if request.method == 'GET':
        return jsonify({
            'id': task.id,
            'task_type': task.task_type,
            'item_ids': task.item_ids,
            'status': task.status,
            'user_ids': task.user_ids,
            'subtask_ids': task.subtask_ids,
            'process_log_ids': task.process_log_ids,
            'parent_work_order_id': task.parent_work_order_id,
            'created_at': task.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        task.task_type = data.get('task_type', task.task_type)
        task.item_ids = data.get('item_ids', task.item_ids)
        task.status = data.get('status', task.status)
        task.user_ids = data.get('user_ids', task.user_ids)
        task.subtask_ids = data.get('subtask_ids', task.subtask_ids)
        task.process_log_ids = data.get('process_log_ids', task.process_log_ids)

        db.session.commit()
        return jsonify({'message': 'Task updated'})

    elif request.method == 'DELETE':
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted'})

# Sub Tasks endpoints
@process_bp.route('/subtasks', methods=['GET', 'POST'])
@jwt_required()
def subtasks():
    if request.method == 'GET':
        subtasks = SubTask.query.all()
        return jsonify([{
            'id': st.id,
            'status': st.status,
            'item_ids': st.item_ids,
            'user_ids': st.user_ids,
            'parent_task_id': st.parent_task_id,
            'process_log_ids': st.process_log_ids,
            'created_at': st.created_at.isoformat()
        } for st in subtasks])

    elif request.method == 'POST':
        data = request.get_json()
        subtask_id = generate_id('ST', SubTask)

        subtask = SubTask(
            id=subtask_id,
            status=data.get('status', 'design'),
            item_ids=data.get('item_ids', '[]'),
            user_ids=data.get('user_ids', '[]'),
            parent_task_id=data['parent_task_id'],
            process_log_ids=data.get('process_log_ids', '[]')
        )

        db.session.add(subtask)
        db.session.commit()

        return jsonify({'message': 'Subtask created', 'id': subtask_id}), 201

@process_bp.route('/subtasks/<string:subtask_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def subtask_detail(subtask_id):
    subtask = SubTask.query.get_or_404(subtask_id)

    if request.method == 'GET':
        return jsonify({
            'id': subtask.id,
            'status': subtask.status,
            'item_ids': subtask.item_ids,
            'user_ids': subtask.user_ids,
            'parent_task_id': subtask.parent_task_id,
            'process_log_ids': subtask.process_log_ids,
            'created_at': subtask.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        subtask.status = data.get('status', subtask.status)
        subtask.item_ids = data.get('item_ids', subtask.item_ids)
        subtask.user_ids = data.get('user_ids', subtask.user_ids)
        subtask.process_log_ids = data.get('process_log_ids', subtask.process_log_ids)

        db.session.commit()
        return jsonify({'message': 'Subtask updated'})

    elif request.method == 'DELETE':
        db.session.delete(subtask)
        db.session.commit()
        return jsonify({'message': 'Subtask deleted'})

@process_bp.route('/projects/<string:project_id>/work_orders', methods=['GET'])
@jwt_required()
def get_project_work_orders(project_id):
    work_orders = WorkOrder.query.filter_by(parent_project_id=project_id).all()
    return jsonify([
        {
            'id': wo.id,
            'work_order_name': wo.work_order_name,
            'workflow_type_id': wo.workflow_type_id,
            'parent_project_id': wo.parent_project_id,
            'lot_id': wo.lot_id,
            'task_ids': wo.task_ids,
            'process_log_ids': wo.process_log_ids,
            'created_at': wo.created_at.isoformat() if wo.created_at else None
        }
        for wo in work_orders
    ])
