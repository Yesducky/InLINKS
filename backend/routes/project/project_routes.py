from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Project, WorkOrder, User
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db


project_bp = Blueprint('project', __name__)

@project_bp.route('/projects', methods=['GET', 'POST'])
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
            'due_date': p.due_date.isoformat() if p.due_date else None,
            'completed_at': p.completed_at.isoformat() if p.completed_at else None,
            'person_in_charge_name': p.person_in_charge.username if p.person_in_charge else None,
            'work_order_ids': p.work_order_ids,
            'process_log_ids': p.process_log_ids,
            'priority': p.priority,
            'status': p.status,
            'created_at': p.created_at.isoformat() if p.created_at else None
        } for p in projects])
    elif request.method == 'POST':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        project_id = generate_id('PRJ', Project)
        project = Project(
            id=project_id,
            project_name=data['project_name'],
            description=data.get('description'),
            state=data.get('state'),
            start_date=data.get('start_date'),
            due_date=data.get('due_date'),
            completed_at=data.get('completed_at'),
            person_in_charge_id=data['person_in_charge_id'],
            work_order_ids=data.get('work_order_ids', '[]'),
            process_log_ids='[]',
            priority=data.get('priority', 'medium'),
            status=data.get('status')
        )
        db.session.add(project)
        db.session.flush()  # Flush to get the project ID
        
        # Log the creation
        ProcessLogger.log_create(
            user_id=current_user_id,
            entity_type='project',
            entity_id=project_id,
            entity_name=data['project_name']
        )
        
        db.session.commit()
        return jsonify({'message': 'Project created', 'id': project_id}), 201
    return None


@project_bp.route('/projects/<string:project_id>', methods=['GET', 'PUT', 'DELETE'])
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
            'due_date': project.due_date.isoformat() if project.due_date else None,
            'completed_at': project.completed_at.isoformat() if project.completed_at else None,
            'person_in_charge_name': project.person_in_charge.username if project.person_in_charge else None,
            'work_order_ids': project.work_order_ids,
            'process_log_ids': project.process_log_ids,
            'priority': project.priority,
            'status': project.status,
            'created_at': project.created_at.isoformat() if project.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Track changes before updating
        changes = {}
        fields_to_check = ['project_name', 'description', 'state', 'start_date', 'due_date', 
                          'completed_at', 'person_in_charge_id', 'priority', 'status']
        
        for field in fields_to_check:
            if field in data:
                old_value = getattr(project, field)
                new_value = data[field]
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}
        
        # Update the project
        project.project_name = data.get('project_name', project.project_name)
        project.description = data.get('description', project.description)
        project.state = data.get('state', project.state)
        project.start_date = data.get('start_date', project.start_date)
        project.due_date = data.get('due_date', project.due_date)
        project.completed_at = data.get('completed_at', project.completed_at)
        project.person_in_charge_id = data.get('person_in_charge_id', project.person_in_charge_id)
        project.work_order_ids = data.get('work_order_ids', project.work_order_ids)
        project.priority = data.get('priority', project.priority)
        project.status = data.get('status', project.status)
        
        # Log the changes
        if changes:
            ProcessLogger.log_update(
                user_id=current_user_id,
                entity_type='project',
                entity_id=project_id,
                old_obj=project,
                new_data=data,
                entity_name=project.project_name
            )
        
        db.session.commit()
        return jsonify({'message': 'Project updated'})
    elif request.method == 'DELETE':
        current_user_id = get_jwt_identity()
        
        # Log the deletion
        ProcessLogger.log_delete(
            user_id=current_user_id,
            entity_type='project',
            entity_id=project_id,
            entity_name=project.project_name
        )
        
        db.session.delete(project)
        db.session.commit()
        return jsonify({'message': 'Project deleted'})
    return None


@project_bp.route('/projects/<string:project_id>/work_orders', methods=['GET'])
@jwt_required()
def get_project_work_orders(project_id):
    work_orders = WorkOrder.query.filter_by(parent_project_id=project_id).all()
    return jsonify([
        {
            'id': wo.id,
            'work_order_name': wo.work_order_name,
            'description': wo.description,
            'state': wo.state,
            'start_date': wo.start_date.isoformat() if wo.start_date else None,
            'due_date': wo.due_date.isoformat() if wo.due_date else None,
            'completed_at': wo.completed_at.isoformat() if wo.completed_at else None,
            'assignee_id': wo.assignee_id,
            'estimated_hour': wo.estimated_hour,
            'workflow_type': wo.workflow_type.name if wo.workflow_type else None,
            'parent_project_id': wo.parent_project_id,
            'lot_id': wo.lot_id,
            'task_ids': wo.task_ids,
            'process_log_ids': wo.process_log_ids,
            'created_at': wo.created_at.isoformat() if wo.created_at else None
        }
        for wo in work_orders
    ])