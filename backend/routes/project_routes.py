from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import Project
from utils.db_utils import generate_id
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
            process_log_ids=data.get('process_log_ids', '[]'),
            priority=data.get('priority', 'medium'),
            status=data.get('status')
        )
        db.session.add(project)
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
        project.project_name = data.get('project_name', project.project_name)
        project.description = data.get('description', project.description)
        project.state = data.get('state', project.state)
        project.start_date = data.get('start_date', project.start_date)
        project.due_date = data.get('due_date', project.due_date)
        project.completed_at = data.get('completed_at', project.completed_at)
        project.person_in_charge_id = data.get('person_in_charge_id', project.person_in_charge_id)
        project.work_order_ids = data.get('work_order_ids', project.work_order_ids)
        project.process_log_ids = data.get('process_log_ids', project.process_log_ids)
        project.priority = data.get('priority', project.priority)
        project.status = data.get('status', project.status)
        db.session.commit()
        return jsonify({'message': 'Project updated'})
    elif request.method == 'DELETE':
        db.session.delete(project)
        db.session.commit()
        return jsonify({'message': 'Project deleted'})

