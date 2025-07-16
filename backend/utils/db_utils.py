"""
Database utility functions for ID generation and data initialization
"""

from models import *

def generate_id(prefix, model_class):
    """Generate sequential IDs with prefix and appropriate digit formatting"""
    latest = model_class.query.filter(model_class.id.like(f'{prefix}%')).order_by(model_class.id.desc()).first()
    if latest:
        latest_num = int(latest.id[len(prefix):])
        new_num = latest_num + 1
    else:
        new_num = 1

    # Define minimum digits based on prefix
    if prefix == 'LOT':
        return f'{prefix}{new_num:04d}'  # 4 digits for lots
    elif prefix == 'CTN':
        return f'{prefix}{new_num:05d}'  # 5 digits for cartons
    elif prefix == 'ITM':
        return f'{prefix}{new_num:06d}'  # 6 digits for items
    else:
        return f'{prefix}{new_num:03d}'  # 3 digits for other types (default)

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

    # Insert default permissions if not exist
    from models import Permission
    default_permissions = [
        {'id': 'items.read', 'resource': 'items', 'action': 'read', 'description': 'View item details'},
        {'id': 'items.write', 'resource': 'items', 'action': 'write', 'description': 'Edit item details'},
        {'id': 'items.delete', 'resource': 'items', 'action': 'delete', 'description': 'Delete items'},
        {'id': 'items.create', 'resource': 'items', 'action': 'create', 'description': 'Create new items'},
        {'id': 'lots.read', 'resource': 'lots', 'action': 'read', 'description': 'View lot details'},
        {'id': 'lots.write', 'resource': 'lots', 'action': 'write', 'description': 'Edit lot details'},
        {'id': 'lots.delete', 'resource': 'lots', 'action': 'delete', 'description': 'Delete lots'},
        {'id': 'lots.create', 'resource': 'lots', 'action': 'create', 'description': 'Create new lots'},
        {'id': 'cartons.read', 'resource': 'cartons', 'action': 'read', 'description': 'View carton details'},
        {'id': 'cartons.write', 'resource': 'cartons', 'action': 'write', 'description': 'Edit carton details'},
        {'id': 'cartons.delete', 'resource': 'cartons', 'action': 'delete', 'description': 'Delete cartons'},
        {'id': 'cartons.create', 'resource': 'cartons', 'action': 'create', 'description': 'Create new cartons'},
        {'id': 'inventory.read', 'resource': 'inventory', 'action': 'read', 'description': 'View inventory'},
        {'id': 'inventory.write', 'resource': 'inventory', 'action': 'write', 'description': 'Manage inventory'},
        {'id': 'admin.users', 'resource': 'admin', 'action': 'users', 'description': 'Manage users'},
        {'id': 'admin.roles', 'resource': 'admin', 'action': 'roles', 'description': 'Manage roles'},
        {'id': 'dashboard.view', 'resource': 'dashboard', 'action': 'view', 'description': 'Access dashboard'},
    ]
    for perm in default_permissions:
        if not Permission.query.filter_by(id=perm['id']).first():
            db.session.add(Permission(**perm))
    db.session.commit()
    
    # Assign all permissions to admin user type (UT001)
    from models import UserTypePermission
    admin_user_type = UserType.query.filter_by(id='UT001').first()
    if admin_user_type:
        # Remove existing permissions for admin
        UserTypePermission.query.filter_by(user_type_id='UT001').delete()
        
        # Assign all permissions to admin
        all_permissions = Permission.query.all()
        for permission in all_permissions:
            utp = UserTypePermission(
                user_type_id='UT001',
                permission_id=permission.id
            )
            db.session.add(utp)
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
