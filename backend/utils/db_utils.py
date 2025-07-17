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
            user_ids='[]',
            card_menus_id='["CM001", "CM002", "CM003", "CM004", "CM005", "CM006"]'
        )
        db.session.add(default_user_type)

    # Create default user types if they don't exist
    if not UserType.query.filter_by(id='UT002').first():
        worker_user_type = UserType(
            id='UT002',
            type='worker',
            permission='write',
            user_ids='[]',
            card_menus_id='["CM004", "CM005", "CM006"]'
        )
        db.session.add(worker_user_type)

    if not UserType.query.filter_by(id='UT003').first():
        client_user_type = UserType(
            id='UT003',
            type='client',
            permission='read_only',
            user_ids='[]',
            card_menus_id='["CM001", "CM002", "CM003", "CM004", "CM005", "CM006"]'
        )
        db.session.add(client_user_type)

    if not UserType.query.filter_by(id='UT004').first():
        consultant_user_type = UserType(
            id='UT004',
            type='consultant',
            permission='write',
            user_ids='[]',
            card_menus_id='["CM001", "CM002", "CM003", "CM004", "CM005", "CM006"]'
        )
        db.session.add(consultant_user_type)
    if not UserType.query.filter_by(id='UT005').first():
        pm_user_type = UserType(
            id='UT005',
            type='pm',
            permission='all',
            user_ids='[]',
            card_menus_id='["CM001", "CM002", "CM003", "CM004", "CM005", "CM006"]'
        )
        db.session.add(pm_user_type)

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
        # Project permissions
        {'id': 'project.read', 'resource': 'project', 'action': 'read', 'description': 'View project details'},
        {'id': 'project.write', 'resource': 'project', 'action': 'write', 'description': 'Edit project details'},
        {'id': 'project.delete', 'resource': 'project', 'action': 'delete', 'description': 'Delete project'},
        {'id': 'project.create', 'resource': 'project', 'action': 'create', 'description': 'Create new project'},
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

    # Assign permissions to each user type
    user_type_permissions = {
        'UT001': [perm['id'] for perm in default_permissions],  # admin: all permissions
        'UT002': [  # worker
            'items.read', 'items.write',
            'lots.read', 'lots.write',
            'cartons.read', 'cartons.write',
            'inventory.read', 'inventory.write',
            'dashboard.view'
        ],
        'UT003': [  # client
            'items.read', 'lots.read', 'cartons.read', 'inventory.read', 'dashboard.view'
        ],
        'UT004': [  # consultant
            'items.read', 'lots.read', 'cartons.read', 'inventory.read', 'dashboard.view'
        ],
        'UT005': [  # pm
            'items.read', 'lots.read', 'cartons.read', 'inventory.read', 'dashboard.view',
            'items.write', 'lots.write', 'cartons.write', 'inventory.write'
        ]
    }
    for ut_id, perm_ids in user_type_permissions.items():
        UserTypePermission.query.filter_by(user_type_id=ut_id).delete()
        for perm_id in perm_ids:
            if Permission.query.filter_by(id=perm_id).first():
                db.session.add(UserTypePermission(user_type_id=ut_id, permission_id=perm_id))
    db.session.commit()

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

    # Create default projects as sample
    from models import Project, User
    from datetime import datetime, timedelta
    admin_user = User.query.filter_by(user_type_id='UT001').first()
    admin_id = admin_user.id if admin_user else 'USR001'  # fallback if no admin user exists
    now = datetime.now()
    default_projects = [
        {
            'id': 'PRJ001',
            'project_name': 'Office Network Upgrade',
            'description': 'Upgrade office network infrastructure',
            'state': 'active',
            'priority': 'high',
            'start_date': now - timedelta(days=30),
            'end_date': now + timedelta(days=60),
            'person_in_charge_id': admin_id,
            'work_order_ids': '[]',
            'process_log_ids': '[]',
            'created_at': now,
        },
        {
            'id': 'PRJ002',
            'project_name': 'Warehouse Cabling',
            'description': 'Install new cabling in warehouse',
            'state': 'pending',
            'priority': 'medium',
            'start_date': now + timedelta(days=10),
            'end_date': now + timedelta(days=90),
            'person_in_charge_id': admin_id,
            'work_order_ids': '[]',
            'process_log_ids': '[]',
            'created_at': now,
        },
        {
            'id': 'PRJ003',
            'project_name': 'Retail POS Setup',
            'description': 'Setup POS systems for retail locations',
            'state': 'completed',
            'priority': 'low',
            'start_date': now - timedelta(days=120),
            'end_date': now - timedelta(days=10),
            'person_in_charge_id': admin_id,
            'work_order_ids': '[]',
            'process_log_ids': '[]',
            'created_at': now,
        }
    ]
    for prj in default_projects:
        if not Project.query.filter_by(id=prj['id']).first():
            project = Project(
                id=prj['id'],
                project_name=prj['project_name'],
                description=prj['description'],
                state=prj['state'],
                priority=prj['priority'],
                start_date=prj['start_date'],
                end_date=prj['end_date'],
                person_in_charge_id=prj['person_in_charge_id'],
                work_order_ids=prj['work_order_ids'],
                process_log_ids=prj['process_log_ids'],
                created_at=prj['created_at'],
            )
            db.session.add(project)
    db.session.commit()
