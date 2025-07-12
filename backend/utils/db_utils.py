"""
Database utility functions for ID generation and data initialization
"""

from models import *

def generate_id(prefix, model_class):
    """Generate sequential IDs with prefix"""
    latest = model_class.query.filter(model_class.id.like(f'{prefix}%')).order_by(model_class.id.desc()).first()
    if latest:
        latest_num = int(latest.id[len(prefix):])
        new_num = latest_num + 1
    else:
        new_num = 1
    return f'{prefix}{new_num:03d}'

def init_default_data():
    """Initialize database with default data"""
    # Create default user type if it doesn't exist
    if not UserType.query.filter_by(id='UT001').first():
        default_user_type = UserType(
            id='UT001',
            type='admin',
            permission='all',
            user_ids='[]'
        )
        db.session.add(default_user_type)
        db.session.commit()

def init_sample_data():
    """Initialize database with sample data for testing"""

    # Create user types
    user_types_data = [
        {'type': 'admin', 'permission': 'all'},
        {'type': 'worker', 'permission': 'write'},
        {'type': 'client', 'permission': 'read_only'},
        {'type': 'consultant', 'permission': 'write'},
        {'type': 'pm', 'permission': 'all'}
    ]

    for i, ut_data in enumerate(user_types_data, 1):
        if not UserType.query.filter_by(id=f'UT{i:03d}').first():
            user_type = UserType(
                id=f'UT{i:03d}',
                type=ut_data['type'],
                permission=ut_data['permission'],
                user_ids='[]'
            )
            db.session.add(user_type)

    # Create material types
    material_types_data = [
        {'material_name': 'Cable Cat6', 'material_unit': 'meter'},
        {'material_name': 'RJ45 Connector', 'material_unit': 'unit'},
        {'material_name': 'Cable Tray', 'material_unit': 'meter'},
        {'material_name': 'Junction Box', 'material_unit': 'unit'}
    ]

    for i, mt_data in enumerate(material_types_data, 1):
        if not MaterialType.query.filter_by(id=f'MT{i:03d}').first():
            material_type = MaterialType(
                id=f'MT{i:03d}',
                material_name=mt_data['material_name'],
                material_unit=mt_data['material_unit']
            )
            db.session.add(material_type)

    # Create workflow types
    workflow_types_data = [
        {'name': 'Network Installation', 'description': 'Standard network cable installation workflow'},
        {'name': 'Maintenance', 'description': 'Regular maintenance and inspection workflow'},
        {'name': 'Repair', 'description': 'Emergency repair workflow'}
    ]

    for i, wt_data in enumerate(workflow_types_data, 1):
        if not WorkflowType.query.filter_by(id=f'WT{i:03d}').first():
            workflow_type = WorkflowType(
                id=f'WT{i:03d}',
                name=wt_data['name'],
                description=wt_data['description']
            )
            db.session.add(workflow_type)

    db.session.commit()
