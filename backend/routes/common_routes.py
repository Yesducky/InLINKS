"""
Common collection routes - User Types, Users, Material Types, Workflow Types, Log Types
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import UserType, User, MaterialType, WorkflowType, LogType
from utils.db_utils import generate_id
from __init__ import db

common_bp = Blueprint('common', __name__)

# User Types endpoints
@common_bp.route('/user_types', methods=['GET', 'POST'])
@jwt_required()
def user_types():
    if request.method == 'GET':
        user_types = UserType.query.all()
        return jsonify([{
            'id': ut.id,
            'type': ut.type,
            'permission': ut.permission,
            'user_ids': ut.user_ids,
            'created_at': ut.created_at.isoformat()
        } for ut in user_types])

    elif request.method == 'POST':
        data = request.get_json()
        user_type_id = generate_id('UT', UserType)

        user_type = UserType(
            id=user_type_id,
            type=data['type'],
            permission=data['permission'],
            user_ids=data.get('user_ids', '[]')
        )

        db.session.add(user_type)
        db.session.commit()

        return jsonify({'message': 'User type created', 'id': user_type_id}), 201

@common_bp.route('/user_types/<string:user_type_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def user_type_detail(user_type_id):
    user_type = UserType.query.get_or_404(user_type_id)

    if request.method == 'GET':
        return jsonify({
            'id': user_type.id,
            'type': user_type.type,
            'permission': user_type.permission,
            'user_ids': user_type.user_ids,
            'created_at': user_type.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        user_type.type = data.get('type', user_type.type)
        user_type.permission = data.get('permission', user_type.permission)
        user_type.user_ids = data.get('user_ids', user_type.user_ids)

        db.session.commit()
        return jsonify({'message': 'User type updated'})

    elif request.method == 'DELETE':
        db.session.delete(user_type)
        db.session.commit()
        return jsonify({'message': 'User type deleted'})


# get user types by user type ID and only return type name
@common_bp.route('/user_types/bg_user_type_id/<string:user_type_id>', methods=['GET'])
@jwt_required()
def get_user_type_by_id(user_type_id):
    user_type = UserType.query.get_or_404(user_type_id)
    return jsonify({
        'id': user_type.id,
        'type': user_type.type
    })


# Users endpoints
@common_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'user_type_id': u.user_type_id,
        'project_ids': u.project_ids,
        'work_order_ids': u.work_order_ids,
        'task_ids': u.task_ids,
        'created_at': u.created_at.isoformat(),
        'is_active': u.is_active,
        'email': u.email,
        'last_login': u.last_login.isoformat() if u.last_login else None

    } for u in users])

@common_bp.route('/users/<string:user_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def user_detail(user_id):
    user = User.query.get_or_404(user_id)

    if request.method == 'GET':
        return jsonify({
            'id': user.id,
            'username': user.username,
            'user_type_id': user.user_type_id,
            'email': user.email,
            'is_active': user.is_active,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'project_ids': user.project_ids,
            'work_order_ids': user.work_order_ids,
            'task_ids': user.task_ids,
            'created_at': user.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        user.user_type_id = data.get('user_type_id', user.user_type_id)
        user.email = data.get('email', user.email)
        user.is_active = data.get('is_active', user.is_active)
        user.project_ids = data.get('project_ids', user.project_ids)
        user.work_order_ids = data.get('work_order_ids', user.work_order_ids)
        user.task_ids = data.get('task_ids', user.task_ids)

        db.session.commit()
        return jsonify({'message': 'User updated'})

    elif request.method == 'DELETE':
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted'})

# Material Types endpoints
@common_bp.route('/material_types', methods=['GET', 'POST'])
@jwt_required()
def material_types():
    if request.method == 'GET':
        materials = MaterialType.query.all()
        return jsonify([{
            'id': m.id,
            'material_name': m.material_name,
            'material_unit': m.material_unit,
            'created_at': m.created_at.isoformat()
        } for m in materials])

    elif request.method == 'POST':
        data = request.get_json()
        material_id = generate_id('MT', MaterialType)

        material = MaterialType(
            id=material_id,
            material_name=data['material_name'],
            material_unit=data['material_unit']
        )

        db.session.add(material)
        db.session.commit()

        return jsonify({'message': 'Material type created', 'id': material_id}), 201

@common_bp.route('/material_types/<string:material_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def material_type_detail(material_id):
    material = MaterialType.query.get_or_404(material_id)

    if request.method == 'GET':
        return jsonify({
            'id': material.id,
            'material_name': material.material_name,
            'material_unit': material.material_unit,
            'created_at': material.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        material.material_name = data.get('material_name', material.material_name)
        material.material_unit = data.get('material_unit', material.material_unit)

        db.session.commit()
        return jsonify({'message': 'Material type updated'})

    elif request.method == 'DELETE':
        db.session.delete(material)
        db.session.commit()
        return jsonify({'message': 'Material type deleted'})

# Workflow Types endpoints
@common_bp.route('/workflow_types', methods=['GET', 'POST'])
@jwt_required()
def workflow_types():
    if request.method == 'GET':
        workflow_types = WorkflowType.query.all()
        return jsonify([{
            'id': wt.id,
            'name': wt.name,
            'description': wt.description,
            'created_at': wt.created_at.isoformat()
        } for wt in workflow_types])

    elif request.method == 'POST':
        data = request.get_json()
        workflow_type_id = generate_id('WT', WorkflowType)

        workflow_type = WorkflowType(
            id=workflow_type_id,
            name=data['name'],
            description=data.get('description', '')
        )

        db.session.add(workflow_type)
        db.session.commit()

        return jsonify({'message': 'Workflow type created', 'id': workflow_type_id}), 201

@common_bp.route('/workflow_types/<string:workflow_type_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def workflow_type_detail(workflow_type_id):
    workflow_type = WorkflowType.query.get_or_404(workflow_type_id)

    if request.method == 'GET':
        return jsonify({
            'id': workflow_type.id,
            'name': workflow_type.name,
            'description': workflow_type.description,
            'created_at': workflow_type.created_at.isoformat()
        })

    elif request.method == 'PUT':
        data = request.get_json()
        workflow_type.name = data.get('name', workflow_type.name)
        workflow_type.description = data.get('description', workflow_type.description)

        db.session.commit()
        return jsonify({'message': 'Workflow type updated'})

    elif request.method == 'DELETE':
        db.session.delete(workflow_type)
        db.session.commit()
        return jsonify({'message': 'Workflow type deleted'})
