from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Project, WorkOrder, User, ProcessStateType, Lot
from utils.db_utils import generate_id
from utils.process_logger import ProcessLogger
from __init__ import db
import datetime


project_bp = Blueprint('project', __name__)

def parse_date(date_str):
    if date_str is None:
        return None
    try:
        return datetime.datetime.fromisoformat(date_str)
    except ValueError:
        return None


@project_bp.route('/projects', methods=['GET', 'POST'])
@jwt_required()
def projects():
    if request.method == 'GET':
        projects = Project.query.all()
        return jsonify([{
            'id': p.id,
            'project_name': p.project_name,
            'description': p.description,
            'state_id': p.state_id,
            'state': {
                'id': p.state.id,
                'state_name': p.state.state_name,
                'bg_color': p.state.bg_color,
                'text_color': p.state.text_color,
                'icon': p.state.icon
            } if p.state else None,
            'start_date': p.start_date.isoformat() if p.start_date else None,
            'due_date': p.due_date.isoformat() if p.due_date else None,
            'completed_at': p.completed_at.isoformat() if p.completed_at else None,
            'person_in_charge_name': p.person_in_charge.username if p.person_in_charge else None,
            'work_order_ids': p.work_order_ids,
            'process_log_ids': p.process_log_ids,
            'priority': p.priority,
            'lot': {
                'id': p.lots.id,
                'lot_name': p.lots.lot_name
            } if p.lots else None,
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
            state_id=data.get('state_id'),
            start_date= parse_date(data.get('start_date')),
            due_date= parse_date(data.get('due_date')),
            completed_at=data.get('completed_at'),
            person_in_charge_id=current_user_id,
            work_order_ids=data.get('work_order_ids', '[]'),
            process_log_ids='[]',
            priority=data.get('priority', 'medium'),
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
            'state_id': project.state_id,
            'state': {
                'id': project.state.id,
                'state_name': project.state.state_name,
                'bg_color': project.state.bg_color,
                'text_color': project.state.text_color,
                'icon': project.state.icon
            } if project.state else None,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'due_date': project.due_date.isoformat() if project.due_date else None,
            'completed_at': project.completed_at.isoformat() if project.completed_at else None,
            'person_in_charge_name': project.person_in_charge.username if project.person_in_charge else None,
            'work_order_ids': project.work_order_ids,
            'process_log_ids': project.process_log_ids,
            'priority': project.priority,
            'lots': [
                {
                    'id': lot.id,
                    'factory_lot_number': lot.factory_lot_number
                } for lot in project.lots
            ],
            'created_at': project.created_at.isoformat() if project.created_at else None
        })
    elif request.method == 'PUT':
        data = request.get_json()
        current_user_id = get_jwt_identity()

        # Prepare old and new data for logging
        old_data = {field: getattr(project, field) for field in [
            'project_name', 'description', 'state_id', 'start_date', 'due_date',
            'completed_at', 'person_in_charge_id', 'work_order_ids', 'priority']}

        # Use data.get with fallback to old value, and parse dates only if present
        new_data = {}
        for field in old_data:
            if field in ['start_date', 'due_date']:
                val = data.get(field)
                new_data[field] = parse_date(val) if val is not None else old_data[field]
            elif field == 'completed_at':
                completed_state = ProcessStateType.query.filter_by(state_type='project', state_name='completed').first()
                new_data[field] = datetime.datetime.now() if completed_state and data.get('state_id') == completed_state.id else old_data[field]
            else:
                new_data[field] = data.get(field, old_data[field])

        # Update the project attributes
        for field in new_data:
            setattr(project, field, new_data[field])

        ProcessLogger.log_update(
            user_id=current_user_id,
            entity_type='project',
            entity_id=project_id,
            old_obj=old_data,
            new_data=new_data,
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
            'state': {
                'id': wo.state.id,
                'state_name': wo.state.state_name,
                'bg_color': wo.state.bg_color,
                'text_color': wo.state.text_color,
                'icon': wo.state.icon
            } if wo.state else None,
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


@project_bp.route('/projects/<string:project_id>/assign_lots', methods=['POST'])
@jwt_required()
def assign_lots_to_project(project_id):
    data = request.get_json()
    lot_ids = data.get('lot_ids', [])
    if not isinstance(lot_ids, list):
        return jsonify({'error': 'lot_ids must be a list'}), 400
    updated = 0
    for lot_id in lot_ids:
        lot = Lot.query.get(lot_id)
        if lot:
            lot.project_id = project_id
            updated += 1
    db.session.commit()
    return jsonify({'message': f'{updated} lots assigned to project {project_id}.'})


@project_bp.route('/projects/<string:project_id>/lots', methods=['GET'])
@jwt_required()
def get_project_lots(project_id):
    """
    Get all lots assigned to a specific project with detailed information
    """
    try:
        # Verify project exists
        project = Project.query.get_or_404(project_id)
        
        # Get all lots for this project
        lots = Lot.query.filter_by(project_id=project_id).all()
        result = []

        import json
        from utils.item_utils import get_item_with_children_recursive
        from models import Item

        for l in lots:
            # Get carton count
            carton_ids = json.loads(l.carton_ids) if l.carton_ids else []
            carton_count = len(carton_ids)

            # Get all items in this lot (including children) using recursive function
            all_items_with_children = []
            for carton_id in carton_ids:
                # Get items directly in this carton
                carton_items = Item.query.filter_by(parent_id=carton_id).all()
                for item in carton_items:
                    # Get the item and all its children recursively
                    item_tree = get_item_with_children_recursive(item.id)
                    all_items_with_children.extend(item_tree)

            # Calculate totals including all child items
            total_items = len(all_items_with_children)
            available_items = len([item for item in all_items_with_children if item['status'] == 'available'])
            used_items = len([item for item in all_items_with_children if item['status'] == 'used'])
            assigned_items = len([item for item in all_items_with_children if item['status'] == 'assigned'])

            # Calculate quantities including all child items
            total_quantity = sum(item['quantity'] for item in all_items_with_children)
            available_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'available')
            used_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'used')
            assigned_quantity = sum(item['quantity'] for item in all_items_with_children if item['status'] == 'assigned')

            result.append({
                'id': l.id,
                'material_type_id': l.material_type_id,
                'material_name': l.material_type.material_name,
                'material_unit': l.material_type.material_unit,
                'factory_lot_number': l.factory_lot_number,
                'carton_count': carton_count,
                'total_items': total_items,
                'available_items': available_items,
                'used_items': used_items,
                'assigned_items': assigned_items,
                'total_quantity': float(total_quantity),
                'available_quantity': float(available_quantity),
                'used_quantity': float(used_quantity),
                'assigned_quantity': float(assigned_quantity),
                'carton_ids': carton_ids,
                'log_ids': l.log_ids,
                'created_at': l.created_at.isoformat(),
                'created_user_id': l.created_user_id,
                'material_type': {
                    'id': l.material_type.id,
                    'material_name': l.material_type.material_name,
                    'material_unit': l.material_type.material_unit
                }
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': f'Failed to get project lots: {str(e)}'}), 500
