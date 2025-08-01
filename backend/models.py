from datetime import datetime
import pytz
from __init__ import db

# Hong Kong timezone
HK_TZ = pytz.timezone('Asia/Hong_Kong')

def get_hk_time():
    """Get current time in Hong Kong timezone"""
    return datetime.now(HK_TZ)

# Database Models - Common Collection
class UserType(db.Model):
    __tablename__ = 'user_types'
    id = db.Column(db.String(20), primary_key=True)  # UT001, UT002, etc.
    type = db.Column(db.String(50), nullable=False)  # admin, worker, client, consultant, pm
    permission = db.Column(db.String(100), nullable=False)  # all, write, read_only
    user_ids = db.Column(db.Text)  # JSON string of user IDs
    created_at = db.Column(db.DateTime, default=get_hk_time)
    card_menus_id = db.Column(db.Text)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(20), primary_key=True)  # USR001, USR002, etc.
    user_type_id = db.Column(db.String(20), db.ForeignKey('user_types.id'), nullable=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=get_hk_time)

    user_type = db.relationship('UserType', backref='users')

class MaterialType(db.Model):
    __tablename__ = 'material_types'
    id = db.Column(db.String(20), primary_key=True)  # MT001, MT002, etc.
    material_name = db.Column(db.String(100), nullable=False)
    material_unit = db.Column(db.String(20), nullable=False)  # cm, meter, unit
    created_at = db.Column(db.DateTime, default=get_hk_time)

class WorkflowType(db.Model):
    __tablename__ = 'workflow_types'
    id = db.Column(db.String(20), primary_key=True)  # WT001, WT002, etc.
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_hk_time)

class LogType(db.Model):
    __tablename__ = 'log_types'
    id = db.Column(db.String(20), primary_key=True)  # LT001, LT002, etc.
    type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_hk_time)

class ProcessStateType(db.Model):
    __tablename__ = 'process_state_types'
    id = db.Column(db.String(20), primary_key=True)  # PST001, PST002, etc.
    state_name = db.Column(db.String(50), nullable=False)  # e.g., planning, active, completed
    state_type = db.Column(db.String(20), nullable=False)  # project, workorder, task, subtask
    description = db.Column(db.Text)
    bg_color = db.Column(db.String(20), nullable=True)
    text_color = db.Column(db.String(20), nullable=True)
    icon = db.Column(db.String(50), nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=get_hk_time)

    def to_dict(self):
        return {
            'id': self.id,
            'state_name': self.state_name,
            'state_type': self.state_type,
            'description': self.description,
            'bg_color': self.bg_color,
            'text_color': self.text_color,
            'icon': self.icon,
            'order_index': self.order_index,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

# Database Models - Stock Collection
class Lot(db.Model):
    __tablename__ = 'lots'
    id = db.Column(db.String(20), primary_key=True)  # LOT001, LOT002, etc.
    material_type_id = db.Column(db.String(20), db.ForeignKey('material_types.id'), nullable=False)
    factory_lot_number = db.Column(db.String(100), nullable=False)
    carton_ids = db.Column(db.Text)  # JSON string of carton IDs
    log_ids = db.Column(db.Text)  # JSON string of log IDs
    created_at = db.Column(db.DateTime, default=get_hk_time)
    created_user_id = db.Column(db.String(20), db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.String(20), db.ForeignKey('projects.id'), nullable=True)

    material_type = db.relationship('MaterialType', backref='lots')

class Carton(db.Model):
    __tablename__ = 'cartons'
    id = db.Column(db.String(20), primary_key=True)  # CTN001, CTN002, etc.
    parent_lot_id = db.Column(db.String(20), db.ForeignKey('lots.id'), nullable=False)
    material_type_id = db.Column(db.String(20), db.ForeignKey('material_types.id'), nullable=False)
    item_ids = db.Column(db.Text)  # JSON string of item IDs
    log_ids = db.Column(db.Text)  # JSON string of log IDs
    created_at = db.Column(db.DateTime, default=get_hk_time)

    parent_lot = db.relationship('Lot', backref='cartons')
    material_type = db.relationship('MaterialType', backref='cartons')

class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(db.String(20), primary_key=True)  # ITM001, ITM002, etc.
    material_type_id = db.Column(db.String(20), db.ForeignKey('material_types.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # available, assigned, used
    parent_id = db.Column(db.String(20))  # carton or item ID
    child_item_ids = db.Column(db.Text)  # JSON string of child item IDs
    log_ids = db.Column(db.Text)  # JSON string of stock log IDs
    task_ids = db.Column(db.Text)  # JSON string of task IDs
    label = db.Column(db.String(100), nullable=True)  # e.g. "ITM001-001"
    label_count = db.Column(db.Integer, nullable=True, default=0)  # Number of labels for this item
    created_at = db.Column(db.DateTime, default=get_hk_time)

    material_type = db.relationship('MaterialType', backref='items')

class StockLog(db.Model):
    __tablename__ = 'stock_logs'
    id = db.Column(db.String(20), primary_key=True)  # SL001, SL002, etc.
    date = db.Column(db.DateTime, default=get_hk_time)
    user_id = db.Column(db.String(20), db.ForeignKey('users.id'))
    description = db.Column(db.Text)
    task_id = db.Column(db.String(20))
    item_id = db.Column(db.String(20), db.ForeignKey('items.id'))
    lot_id = db.Column(db.String(20), db.ForeignKey('lots.id'))
    carton_id = db.Column(db.String(20), db.ForeignKey('cartons.id'))
    created_at = db.Column(db.DateTime, default=get_hk_time)

    user = db.relationship('User', backref='stock_logs')
    item = db.relationship('Item', backref='stock_logs')
    carton = db.relationship('Carton', backref='stock_logs')
    lot = db.relationship('Lot', backref='stock_logs')

# Database Models - Process Collection
class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.String(20), primary_key=True)  # PRJ001, PRJ002, etc.
    project_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    state_id = db.Column(db.String(20), db.ForeignKey('process_state_types.id'), nullable=True)
    start_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    priority = db.Column(db.String(20), nullable=True)  # e.g. low, medium, high, urgent
    person_in_charge_id = db.Column(db.String(20), db.ForeignKey('users.id'))
    work_order_ids = db.Column(db.Text)  # JSON string of work order IDs
    process_log_ids = db.Column(db.Text)  # JSON string of process log IDs
    created_at = db.Column(db.DateTime, default=get_hk_time)

    lots = db.relationship('Lot', backref='project')
    person_in_charge = db.relationship('User', backref='managed_projects')
    state = db.relationship('ProcessStateType', backref='projects')

class WorkOrder(db.Model):
    __tablename__ = 'work_orders'
    id = db.Column(db.String(20), primary_key=True)  # WO001, WO002, etc.
    work_order_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    state_id = db.Column(db.String(20), db.ForeignKey('process_state_types.id'), nullable=True)
    start_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    assignee_id = db.Column(db.String(20), db.ForeignKey('users.id'))
    estimated_hour = db.Column(db.Float, nullable=True)
    workflow_type_id = db.Column(db.String(20), db.ForeignKey('workflow_types.id'), nullable=False)
    parent_project_id = db.Column(db.String(20), db.ForeignKey('projects.id'), nullable=False)
    lot_id = db.Column(db.String(20), db.ForeignKey('lots.id'))
    task_ids = db.Column(db.Text)  # JSON string of task IDs
    process_log_ids = db.Column(db.Text)  # JSON string of process log IDs
    created_at = db.Column(db.DateTime, default=get_hk_time)

    workflow_type = db.relationship('WorkflowType', backref='work_orders')
    parent_project = db.relationship('Project', backref='work_orders')
    lot = db.relationship('Lot', backref='work_orders')
    assignee = db.relationship('User', backref='assigned_workorders')
    state = db.relationship('ProcessStateType', backref='work_orders')

class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.String(20), primary_key=True)  # TSK001, TSK002, etc.
    task_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    state_id = db.Column(db.String(20), db.ForeignKey('process_state_types.id'), nullable=True)
    start_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    assignee_id = db.Column(db.String(20), db.ForeignKey('users.id'))
    estimated_hour = db.Column(db.Float, nullable=True)
    work_order_id = db.Column(db.String(20), db.ForeignKey('work_orders.id'))
    subtask_ids = db.Column(db.Text)  # JSON string of subtask IDs
    created_at = db.Column(db.DateTime, default=get_hk_time)

    label_count = db.Column(db.Integer, nullable=True, default=0)

    work_order = db.relationship('WorkOrder', backref='tasks')
    assignee = db.relationship('User', backref='assigned_tasks')
    state = db.relationship('ProcessStateType', backref='tasks')

class SubTask(db.Model):
    __tablename__ = 'subtasks'
    id = db.Column(db.String(20), primary_key=True)  # SUB001, SUB002, etc.
    subtask_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    state_id = db.Column(db.String(20), db.ForeignKey('process_state_types.id'), nullable=True)
    start_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    assignee_id = db.Column(db.String(20), db.ForeignKey('users.id'))
    estimated_hour = db.Column(db.Float, nullable=True)
    task_id = db.Column(db.String(20), db.ForeignKey('tasks.id'))
    created_at = db.Column(db.DateTime, default=get_hk_time)

    task = db.relationship('Task', backref='subtasks')
    assignee = db.relationship('User', backref='assigned_subtasks')
    state = db.relationship('ProcessStateType', backref='subtasks')

class ProcessLog(db.Model):
    __tablename__ = 'process_logs'
    id = db.Column(db.String(20), primary_key=True)  # PL001, PL002, etc.
    date = db.Column(db.DateTime, default=get_hk_time)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_hk_time)


    log_type_id = db.Column(db.String(20), db.ForeignKey('log_types.id'), nullable=False)
    log_type = db.relationship('LogType', backref='process_logs')

    user_id = db.Column(db.String(20), db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref='process_logs')

    project_id = db.Column(db.String(20), db.ForeignKey('projects.id'))
    project = db.relationship('Project', backref='process_logs')

    work_order_id = db.Column(db.String(20), db.ForeignKey('work_orders.id'))
    work_order = db.relationship('WorkOrder', backref='process_logs')

    task_id = db.Column(db.String(20), db.ForeignKey('tasks.id'))
    task = db.relationship('Task', backref='process_logs')

    subtask_id = db.Column(db.String(20), db.ForeignKey('subtasks.id'))
    subtask = db.relationship('SubTask', backref='process_logs')


# Database Models - Menu Collection
class CardMenu(db.Model):
    __tablename__ = 'card_menus'
    id = db.Column(db.String(20), primary_key=True)  # CM001, CM002, etc.
    title = db.Column(db.String(100), nullable=False)  # Card title in Chinese
    icon_name = db.Column(db.String(50), nullable=False)  # Material-UI icon name
    icon_color = db.Column(db.String(50), nullable=False)  # Tailwind CSS color class
    route_path = db.Column(db.String(100))  # Frontend route path
    order_index = db.Column(db.Integer, nullable=False, default=0)  # Display order
    is_active = db.Column(db.Boolean, default=True)  # Whether card is active
    created_at = db.Column(db.DateTime, default=get_hk_time)
    updated_at = db.Column(db.DateTime, default=get_hk_time, onupdate=get_hk_time)

class Permission(db.Model):
    __tablename__ = 'permissions'
    id = db.Column(db.String(50), primary_key=True)
    resource = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_hk_time)

class UserTypePermission(db.Model):
    __tablename__ = 'user_type_permissions'
    user_type_id = db.Column(db.String(20), db.ForeignKey('user_types.id'), primary_key=True)
    permission_id = db.Column(db.String(50), db.ForeignKey('permissions.id'), primary_key=True)
    granted_at = db.Column(db.DateTime, default=get_hk_time)

class PermissionAudit(db.Model):
    __tablename__ = 'permission_audit'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(50), nullable=False)
    permission_id = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    resource_id = db.Column(db.String(50))
    status = db.Column(db.String(20), nullable=False)  # 'granted', 'denied'
    timestamp = db.Column(db.DateTime, default=get_hk_time)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)

