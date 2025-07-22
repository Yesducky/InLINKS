from datetime import datetime
import json
from __init__ import db
from models import ProcessLog, LogType, User, Project, WorkOrder, Task, SubTask
from utils.db_utils import generate_id

class ProcessLogger:
    """Enhanced process logger for tracking all changes in projects, work orders, tasks, and subtasks"""

    @staticmethod
    def get_log_types():
        """Retrieve log types from the database as a dict {type: id}"""
        log_types = LogType.query.all()
        return {lt.type: lt.id for lt in log_types}

    @property
    def LOG_TYPES(self):
        return self.get_log_types()

    @staticmethod
    def _get_field_changes(old_obj, new_data):
        """Compare old object (dict or model) with new data to identify changed fields"""
        changes = {}
        if not old_obj:
            return changes
        for field, new_value in new_data.items():
            # Support both dict and object for old_obj
            if isinstance(old_obj, dict):
                old_value = old_obj.get(field, None)
            else:
                old_value = getattr(old_obj, field, None)
            # Handle datetime objects
            if hasattr(old_value, 'isoformat'):
                old_value = old_value.isoformat() if old_value else None
            if hasattr(new_value, 'isoformat'):
                new_value = new_value.isoformat() if new_value else None
            # Handle JSON strings
            if isinstance(old_value, str) and (old_value.startswith('[') or old_value.startswith('{')):
                try:
                    old_value = json.loads(old_value)
                except:
                    pass
            if isinstance(new_value, str) and (new_value.startswith('[') or new_value.startswith('{')):
                try:
                    new_value = json.loads(new_value)
                except:
                    pass
            # print(field, new_value, old_value, new_value==old_value, )  # Debugging line
            if old_value != new_value:
                changes[field] = {
                    'old': old_value,
                    'new': new_value
                }
        return changes

    @staticmethod
    def _format_description(action_type, entity_type, entity_name, changes=None, details=None):
        """Format a human-readable description for the log entry"""
        base_desc = f"{action_type} {entity_type}: {entity_name}"
        
        if details:
            base_desc += f" - {details}"
        elif changes:
            change_summary = []
            for field, change in changes.items():
                if field == 'state':
                    change_summary.append(f"state changed from '{change['old']}' to '{change['new']}'")
                elif field == 'assignee_id':
                    # Get usernames for better readability
                    old_user = User.query.get(change['old']) if change['old'] else None
                    new_user = User.query.get(change['new']) if change['new'] else None
                    old_name = old_user.username if old_user else 'Unassigned'
                    new_name = new_user.username if new_user else 'Unassigned'
                    change_summary.append(f"assignee changed from '{old_name}' to '{new_name}'")
                elif field == 'priority':
                    change_summary.append(f"priority changed from '{change['old']}' to '{change['new']}'")
                elif field == 'due_date':
                    change_summary.append(f"due date changed from '{change['old']}' to '{change['new']}'")
                elif field == 'estimated_hour':
                    change_summary.append(f"estimated hours changed from {change['old']} to {change['new']}")
                else:
                    change_summary.append(f"{field} updated")
            
            if change_summary:
                base_desc += " - " + ", ".join(change_summary)
                
        return base_desc

    @staticmethod
    def _add_log_to_entity(entity, log_id):
        """Add log ID to the entity's process_log_ids array"""
        if hasattr(entity, 'process_log_ids'):
            try:
                current_logs = json.loads(entity.process_log_ids or '[]')
                current_logs.append(log_id)
                entity.process_log_ids = json.dumps(current_logs)
            except:
                entity.process_log_ids = json.dumps([log_id])

    @staticmethod
    def create_log(user_id, action_type, entity_type, entity_id, changes=None, details=None, entity_name=None):
        """Create a comprehensive process log entry"""
        
        # Get the entity based on type
        entity = None

        if entity_type == 'project':
            entity = Project.query.get(entity_id)
        elif entity_type == 'work_order':
            entity = WorkOrder.query.get(entity_id)
        elif entity_type == 'task':
            entity = Task.query.get(entity_id)
        elif entity_type == 'subtask':
            entity = SubTask.query.get(entity_id)

        entity_name = entity_name or (entity.task_name if hasattr(entity, 'task_name') else 
                                     entity.work_order_name if hasattr(entity, 'work_order_name') else 
                                     entity.subtask_name if hasattr(entity, 'subtask_name') else 
                                     entity.project_name if hasattr(entity, 'project_name') else entity_id)

        # Create log entry
        log_id = generate_id('PL', ProcessLog)
        description = ProcessLogger._format_description(action_type, entity_type, entity_name, changes, details)
        
        log_types = ProcessLogger.get_log_types()
        log_entry = ProcessLog(
            id=log_id,
            log_type_id=log_types.get(action_type.upper(), 'LT002'),  # Default to UPDATE
            user_id=user_id,
            description=description
        )
        
        # Set appropriate foreign keys
        if entity_type == 'project':
            log_entry.project_id = entity_id
        elif entity_type == 'work_order':
            log_entry.work_order_id = entity_id
            if entity:
                log_entry.project_id = entity.parent_project_id
        elif entity_type == 'task':
            log_entry.task_id = entity_id
            if entity:
                log_entry.work_order_id = entity.work_order_id
                if entity.work_order:
                    log_entry.project_id = entity.work_order.parent_project_id
        elif entity_type == 'subtask':
            log_entry.subtask_id = entity_id
            if entity:
                log_entry.task_id = entity.task_id
                if entity.task:
                    log_entry.work_order_id = entity.task.work_order_id
                    if entity.task.work_order:
                        log_entry.project_id = entity.task.work_order.parent_project_id
        
        db.session.add(log_entry)
        
        # Add log to entity's process_log_ids
        if entity:
            ProcessLogger._add_log_to_entity(entity, log_id)
            db.session.add(entity)
        
        return log_id

    @staticmethod
    def log_create(user_id, entity_type, entity_id, entity_name=None):
        """Log creation of a new entity"""
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='CREATE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"New {entity_type} created"
        )

    @staticmethod
    def log_update(user_id, entity_type, entity_id, old_obj, new_data, entity_name=None):
        """Log updates to an existing entity"""
        changes = ProcessLogger._get_field_changes(old_obj, new_data)
        print(f"Changes detected: {changes}")  # Debugging line
        if not changes:
            return None
            
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='UPDATE',
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes,
            entity_name=entity_name
        )

    @staticmethod
    def log_delete(user_id, entity_type, entity_id, entity_name=None):
        """Log deletion of an entity"""
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='DELETE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"{entity_type} deleted"
        )

    @staticmethod
    def log_state_change(user_id, entity_type, entity_id, old_state, new_state, entity_name=None):
        """Log state changes"""
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='STATE_CHANGE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"State changed from '{old_state}' to '{new_state}'"
        )

    @staticmethod
    def log_assignment(user_id, entity_type, entity_id, old_assignee_id, new_assignee_id, entity_name=None):
        """Log assignment changes"""
        old_user = User.query.get(old_assignee_id) if old_assignee_id else None
        new_user = User.query.get(new_assignee_id) if new_assignee_id else None
        old_name = old_user.username if old_user else 'Unassigned'
        new_name = new_user.username if new_user else 'Unassigned'
        
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='ASSIGNMENT',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Assignee changed from '{old_name}' to '{new_name}'"
        )

    @staticmethod
    def log_completion(user_id, entity_type, entity_id, completed_at, entity_name=None):
        """Log completion of an entity"""
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='COMPLETION',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Marked as completed at {completed_at}"
        )

    @staticmethod
    def log_priority_change(user_id, entity_type, entity_id, old_priority, new_priority, entity_name=None):
        """Log priority changes"""
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='PRIORITY_CHANGE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Priority changed from '{old_priority}' to '{new_priority}'"
        )

    @staticmethod
    def log_due_date_change(user_id, entity_type, entity_id, old_due_date, new_due_date, entity_name=None):
        """Log due date changes"""
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='DUE_DATE_CHANGE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Due date changed from '{old_due_date}' to '{new_due_date}'"
        )

    @staticmethod
    def log_estimation_change(user_id, entity_type, entity_id, old_hours, new_hours, entity_name=None):
        """Log estimated hour changes"""
        return ProcessLogger.create_log(
            user_id=user_id,
            action_type='ESTIMATION_CHANGE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Estimated hours changed from {old_hours} to {new_hours}"
        )