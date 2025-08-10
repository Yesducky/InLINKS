"""
Database utility functions for ID generation and data initialization
"""

from models import db, User, UserType, Permission, UserTypePermission, MaterialType, WorkflowType, ProcessStateType

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
    elif prefix == 'PRJ':
        return f'{prefix}{new_num:03d}'  # 3 digits for projects
    elif prefix == 'WO':
        return f'{prefix}{new_num:04d}'  # 4 digits for work orders
    elif prefix == 'TSK':
        return f'{prefix}{new_num:05d}'  # 5 digits for tasks
    elif prefix == 'SUB':
        return f'{prefix}{new_num:06d}'  # 6 digits for subtasks
    elif prefix == 'PL':
        return f'{prefix}{new_num:08d}'  # 8 digits for process logs
    elif prefix == 'SL':
        return f'{prefix}{new_num:08d}'  # 8 digits for stock logs
    elif prefix == 'BC':
        return f'{prefix}{new_num:06d}'
    elif prefix == 'BIS':
        return f'{prefix}{new_num:08d}'
    elif prefix == 'BCT':
        return f'{prefix}{new_num:08d}'
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




    # Insert default permissions if not exist
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
        # Workorder permissions
        {'id': 'work_order.read', 'resource': 'work_order', 'action': 'read', 'description': 'View work order details'},
        {'id': 'work_order.write', 'resource': 'work_order', 'action': 'write', 'description': 'Edit work order details'},
        {'id': 'work_order.delete', 'resource': 'work_order', 'action': 'delete', 'description': 'Delete work order'},
        {'id': 'work_order.create', 'resource': 'work_order', 'action': 'create', 'description': 'Create new work order'},
        # Task permissions
        {'id': 'task.read', 'resource': 'task', 'action': 'read', 'description': 'View task details'},
        {'id': 'task.write', 'resource': 'task', 'action': 'write', 'description': 'Edit task details'},
        {'id': 'task.delete', 'resource': 'task', 'action': 'delete', 'description': 'Delete task'},
        {'id': 'task.create', 'resource': 'task', 'action': 'create', 'description': 'Create new task'},
        # SubTask permissions
        {'id': 'subtask.read', 'resource': 'subtask', 'action': 'read', 'description': 'View subtask details'},
        {'id': 'subtask.write', 'resource': 'subtask', 'action': 'write', 'description': 'Edit subtask details'},
        {'id': 'subtask.delete', 'resource': 'subtask', 'action': 'delete', 'description': 'Delete subtask'},
        {'id': 'subtask.create', 'resource': 'subtask', 'action': 'create', 'description': 'Create new subtask'},

    ]
    for perm in default_permissions:
        if not Permission.query.filter_by(id=perm['id']).first():
            db.session.add(Permission(**perm))
    db.session.commit()
    
    # Assign all permissions to admin user type (UT001)
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

    # Create process state types
    process_state_types_data = [
        # Project states
        {'state_name': 'pending', 'state_type': 'project', 'description': 'Project is in pending phase', 'bg_color': '#FFF3E0', 'text_color': '#FFA500', 'icon': 'PendingIcon', 'order_index': 1},
        {'state_name': 'active', 'state_type': 'project', 'description': 'Project is actively being worked on', 'bg_color': '#E0F7FA', 'text_color': '#008000', 'icon': 'ActiveIcon', 'order_index': 2},
        {'state_name': 'completed', 'state_type': 'project', 'description': 'Project has been completed', 'bg_color': '#E3F2FD', 'text_color': '#0000FF', 'icon': 'CompletedIcon', 'order_index': 4},

        # Work Order states
        {'state_name': 'pending', 'state_type': 'work_order', 'description': 'Work order is pending assignment', 'bg_color': '#FFF3E0', 'text_color': '#FFA500', 'icon': 'PendingIcon', 'order_index': 1},
        {'state_name': 'active', 'state_type': 'work_order', 'description': 'Work order is under review', 'bg_color': '#FFFFF0', 'text_color': '#FFFF00', 'icon': 'ActiveIcon', 'order_index': 3},
        {'state_name': 'completed', 'state_type': 'work_order', 'description': 'Work order has been completed', 'bg_color': '#E3F2FD', 'text_color': '#0000FF', 'icon': 'CompletedIcon', 'order_index': 4},

        # Task states
        {'state_name': 'pending', 'state_type': 'task', 'description': 'Task is pending assignment', 'bg_color': '#FFF3E0', 'text_color': '#FFA500', 'icon': 'PendingIcon', 'order_index': 1},
        {'state_name': 'assigned_worker', 'state_type': 'task', 'description': 'Task has been assigned to a worker', 'bg_color': '#FFFFF0', 'text_color': '#FFFF00', 'icon': 'AssignedWorkerIcon', 'order_index': 2},
        {'state_name': 'in_progress', 'state_type': 'task', 'description': 'Task is currently being worked on', 'bg_color': '#E0F7FA', 'text_color': '#008000', 'icon': 'ActiveIcon', 'order_index': 3},
        {'state_name': 'waiting T&C', 'state_type': 'task', 'description': 'Task is waiting for testing and commissioning', 'bg_color': '#FFFDE7', 'text_color': '#FF9800', 'icon': 'WaitingIcon', 'order_index': 4},
        {'state_name': 'completed', 'state_type': 'task', 'description': 'Task has been completed', 'bg_color': '#E3F2FD', 'text_color': '#0000FF', 'icon': 'CompletedIcon', 'order_index': 5},

        # SubTask states
        {'state_name': 'pending', 'state_type': 'subtask', 'description': 'Subtask is pending assignment', 'bg_color': '#FFF3E0', 'text_color': '#FFA500', 'icon': 'PendingIcon', 'order_index': 1},
        {'state_name': 'assigned_worker', 'state_type': 'subtask', 'description': 'Subtask has been assigned to a worker', 'bg_color': '#FFFFF0', 'text_color': '#FFFF00', 'icon': 'AssignedWorkerIcon', 'order_index': 2},
        {'state_name': 'in_progress', 'state_type': 'subtask', 'description': 'Subtask is currently being worked on', 'bg_color': '#E0F7FA', 'text_color': '#008000', 'icon': 'ActiveIcon', 'order_index': 3},
        {'state_name': 'completed', 'state_type': 'subtask', 'description': 'Subtask has been completed', 'bg_color': '#E3F2FD', 'text_color': '#0000FF', 'icon': 'CompletedIcon', 'order_index': 4}
    ]
    
    for i, pst_data in enumerate(process_state_types_data, 1):
        if not ProcessStateType.query.filter_by(
            state_name=pst_data['state_name'], 
            state_type=pst_data['state_type']
        ).first():
            process_state_type = ProcessStateType(
                id=f'PST{i:03d}',
                state_name=pst_data['state_name'],
                state_type=pst_data['state_type'],
                description=pst_data['description'],
                bg_color=pst_data['bg_color'],
                text_color=pst_data['text_color'],
                icon=pst_data['icon'],
                order_index=pst_data['order_index']
            )
            db.session.add(process_state_type)

    # Create default projects as sample
    # from datetime import datetime, timedelta
    # admin_user = User.query.filter_by(user_type_id='UT001').first()
    # admin_id = admin_user.id if admin_user else 'USR001'  # fallback if no admin user exists
    # now = datetime.now()
    # default_projects = [
    #     {
    #         'id': 'PRJ001',
    #         'project_name': 'Office Network Upgrade',
    #         'description': 'Upgrade office network infrastructure',
    #         'state': 'active',
    #         'priority': 'high',
    #         'start_date': now - timedelta(days=30),
    #         'due_date': now + timedelta(days=60),
    #         'completed_at': None,
    #         'status': 'in_progress',
    #         'person_in_charge_id': admin_id,
    #         'work_order_ids': '[]',
    #         'process_log_ids': '[]',
    #         'created_at': now,
    #     },
    #     {
    #         'id': 'PRJ002',
    #         'project_name': 'Warehouse Cabling',
    #         'description': 'Install new cabling in warehouse',
    #         'state': 'pending',
    #         'priority': 'medium',
    #         'start_date': now + timedelta(days=10),
    #         'due_date': now + timedelta(days=90),
    #         'completed_at': None,
    #         'status': 'not_started',
    #         'person_in_charge_id': admin_id,
    #         'work_order_ids': '[]',
    #         'process_log_ids': '[]',
    #         'created_at': now,
    #     },
    #     {
    #         'id': 'PRJ003',
    #         'project_name': 'Retail POS Setup',
    #         'description': 'Setup POS systems for retail locations',
    #         'state': 'completed',
    #         'priority': 'low',
    #         'start_date': now - timedelta(days=120),
    #         'due_date': now - timedelta(days=10),
    #         'completed_at': now - timedelta(days=5),
    #         'status': 'completed',
    #         'person_in_charge_id': admin_id,
    #         'work_order_ids': '[]',
    #         'process_log_ids': '[]',
    #         'created_at': now,
    #     }
    # ]
    # for prj in default_projects:
    #     if not Project.query.filter_by(id=prj['id']).first():
    #         # Create sample work orders for each project
    #         sample_work_orders = []
    #         for i in range(1, 3):
    #             wo_id = f"WO{prj['id'][-3:]}{i:02d}"
    #             work_order = WorkOrder(
    #                 id=wo_id,
    #                 work_order_name=f"Work Order {i} for {prj['project_name']}",
    #                 description=f"Sample work order {i} for project {prj['project_name']}",
    #                 state='pending',
    #                 start_date=prj['start_date'],
    #                 due_date=prj['due_date'],
    #                 completed_at=None,
    #                 assignee_id=None,
    #                 estimated_hour=40.0 + i * 10,
    #                 workflow_type_id='WT001',
    #                 parent_project_id=prj['id'],
    #                 lot_id=None,
    #                 task_ids='[]',
    #                 process_log_ids='[]',
    #                 created_at=prj['created_at']
    #             )
    #             db.session.add(work_order)
    #             sample_work_orders.append(wo_id)
    #             # Add process log for work order creation
    #             from utils.process_logger import ProcessLogger
    #             ProcessLogger.log_create(admin_id, 'work_order', wo_id, work_order.work_order_name)
    #         project = Project(
    #             id=prj['id'],
    #             project_name=prj['project_name'],
    #             description=prj['description'],
    #             state=prj['state'],
    #             priority=prj['priority'],
    #             start_date=prj['start_date'],
    #             due_date=prj.get('due_date'),
    #             completed_at=prj.get('completed_at'),
    #             status=prj.get('status'),
    #             person_in_charge_id=prj['person_in_charge_id'],
    #             work_order_ids=str(sample_work_orders),
    #             process_log_ids=prj['process_log_ids'],
    #             created_at=prj['created_at'],
    #         )
    #         db.session.add(project)
    #         # Add process log for project creation
    #         from utils.process_logger import ProcessLogger
    #         ProcessLogger.log_create(admin_id, 'project', prj['id'], prj['project_name'])
    # db.session.commit()

    # Create default stock logs for sample items, lots, and cartons
    # from utils.stock_logger import StockLogger
    # for i in range(1, 3):
    #     item_id = f"ITM00100{i}"
    #     lot_id = f"LOT00100{i}"
    #     carton_id = f"CTN00100{i}"
    #
    #     # Create stock log for item
    #     item = Item.query.get(item_id)
    #     if item:
    #         StockLogger.log_create(admin_id, 'item', item.id, getattr(item, 'id', item.id))
    #
    #     # Create stock log for lot
    #     lot = Lot.query.get(lot_id)
    #     if lot:
    #         StockLogger.log_create(admin_id, 'lot', lot.id, getattr(lot, 'factory_lot_number', lot.id))
    #
    #     # Create stock log for carton
    #     carton = Carton.query.get(carton_id)
    #     if carton:
    #         StockLogger.log_create(admin_id, 'carton', carton.id, getattr(carton, 'id', carton.id))
    db.session.commit()

    if not User.query.filter_by(username='admin').first():
        from werkzeug.security import generate_password_hash
        admin_user = User(
            id='USR001',
            user_type_id='UT001',
            username='admin',
            password_hash=generate_password_hash('admin'),
            email='admin@example.com',
            is_active=True
        )
        db.session.add(admin_user)
        db.session.commit()
