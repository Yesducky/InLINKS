from datetime import datetime
import json
from __init__ import db
from models import StockLog, LogType, User, Lot, Carton, Item, MaterialType
from utils.db_utils import generate_id

class StockLogger:
    """Enhanced stock logger for tracking all changes in lots, cartons, and items"""

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
            if old_value != new_value:
                changes[field] = {
                    'old': old_value,
                    'new': new_value
                }
        return changes

    @staticmethod
    def _format_description(action_type, entity_type, entity_name, changes=None, details=None):
        """Format a human-readable description for the log entry"""
        base_desc = f"{action_type} {entity_name}"
        
        if details:
            base_desc += f" - {details}"
        elif changes:
            change_summary = []
            for field, change in changes.items():
                if field == 'status':
                    change_summary.append(f"status changed from '{change['old']}' to '{change['new']}'")
                elif field == 'quantity':
                    change_summary.append(f"quantity changed from {change['old']} to {change['new']}")
                elif field == 'parent_id':
                    change_summary.append(f"parent changed from '{change['old']}' to '{change['new']}'")
                elif field == 'child_item_ids':
                    old_count = len(change['old']) if isinstance(change['old'], list) else 0
                    new_count = len(change['new']) if isinstance(change['new'], list) else 0
                    change_summary.append(f"child items changed from {old_count} to {new_count}")
                elif field == 'material_type_id':
                    # Get material type names for better readability
                    old_material = MaterialType.query.get(change['old']) if change['old'] else None
                    new_material = MaterialType.query.get(change['new']) if change['new'] else None
                    old_name = old_material.material_name if old_material else 'Unknown'
                    new_name = new_material.material_name if new_material else 'Unknown'
                    change_summary.append(f"material type changed from '{old_name}' to '{new_name}'")
                elif field == 'factory_lot_number':
                    change_summary.append(f"factory lot number changed from '{change['old']}' to '{change['new']}'")
                elif field == 'carton_ids':
                    old_count = len(change['old']) if isinstance(change['old'], list) else 0
                    new_count = len(change['new']) if isinstance(change['new'], list) else 0
                    change_summary.append(f"cartons changed from {old_count} to {new_count}")
                elif field == 'item_ids':
                    old_count = len(change['old']) if isinstance(change['old'], list) else 0
                    new_count = len(change['new']) if isinstance(change['new'], list) else 0
                    change_summary.append(f"items changed from {old_count} to {new_count}")
                else:
                    change_summary.append(f"{field} updated")
            
            if change_summary:
                base_desc += " - " + ", ".join(change_summary)
                
        return base_desc

    @staticmethod
    def _add_log_to_entity(entity, log_id):
        """Add log ID to the entity's log_ids array"""
        if hasattr(entity, 'log_ids'):
            try:
                current_logs = json.loads(entity.log_ids or '[]')
                current_logs.append(log_id)
                entity.log_ids = json.dumps(current_logs)
            except:
                entity.log_ids = json.dumps([log_id])

    @staticmethod
    def _get_entity_name(entity, entity_type):
        """Get a meaningful name for the entity"""
        if entity_type == 'lot':
            name = entity.factory_lot_number if hasattr(entity, 'factory_lot_number') else entity.id
            return f"Lot {name}"
        elif entity_type == 'carton':
            return f"Carton {entity.id}"
        elif entity_type == 'item':
            material = MaterialType.query.get(entity.material_type_id) if hasattr(entity, 'material_type_id') else None
            material_name = material.material_name if material else 'Unknown'
            return f"Item {entity.id} ({material_name}, {entity.quantity} units)"
        return f"{entity_type.title()} {entity.id}"

    @staticmethod
    def create_log(user_id, action_type, entity_type, entity_id, changes=None, details=None, entity_name=None):
        """Create a comprehensive stock log entry"""
        
        # Get the entity based on type
        entity = None
        entity_class = None
        
        if entity_type == 'lot':
            entity = Lot.query.get(entity_id)
            entity_class = Lot
        elif entity_type == 'carton':
            entity = Carton.query.get(entity_id)
            entity_class = Carton
        elif entity_type == 'item':
            entity = Item.query.get(entity_id)
            entity_class = Item
            
        entity_name = entity_name or StockLogger._get_entity_name(entity, entity_type)

        # Create log entry
        log_id = generate_id('SL', StockLog)
        description = StockLogger._format_description(action_type, entity_type, entity_name, changes, details)
        
        log_entry = StockLog(
            id=log_id,
            user_id=user_id,
            description=description,
            item_id=None,
            carton_id=None,
            lot_id=None
        )
        # Set appropriate foreign keys
        if entity_type == 'item':
            log_entry.item_id = entity_id
        elif entity_type == 'carton':
            log_entry.carton_id = entity_id
        elif entity_type == 'lot':
            log_entry.lot_id = entity_id
        db.session.add(log_entry)
        
        # Add log to entity's log_ids
        if entity:
            StockLogger._add_log_to_entity(entity, log_id)
            db.session.add(entity)
        
        return log_id

    @staticmethod
    def log_create(user_id, entity_type, entity_id, entity_name=None):
        """Log creation of a new entity"""
        return StockLogger.create_log(
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
        changes = StockLogger._get_field_changes(old_obj, new_data)
        print(f"Detected changes: {changes}")
        if not changes:
            return None
            
        return StockLogger.create_log(
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
        return StockLogger.create_log(
            user_id=user_id,
            action_type='DELETE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"{entity_type} deleted"
        )

    @staticmethod
    def log_status_change(user_id, entity_type, entity_id, old_status, new_status, entity_name=None):
        """Log status changes"""
        return StockLogger.create_log(
            user_id=user_id,
            action_type='STATUS_CHANGE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Status changed from '{old_status}' to '{new_status}'"
        )

    @staticmethod
    def log_quantity_change(user_id, entity_type, entity_id, old_quantity, new_quantity, entity_name=None):
        """Log quantity changes"""
        return StockLogger.create_log(
            user_id=user_id,
            action_type='QUANTITY_CHANGE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Quantity changed from {old_quantity} to {new_quantity}"
        )

    @staticmethod
    def log_movement(user_id, entity_type, entity_id, old_parent_id, new_parent_id, entity_name=None):
        """Log movement between parents (carton to carton, item to item, etc.)"""
        return StockLogger.create_log(
            user_id=user_id,
            action_type='MOVEMENT',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Moved from parent '{old_parent_id}' to '{new_parent_id}'"
        )

    @staticmethod
    def log_assignment(user_id, entity_type, entity_id, task_id, entity_name=None):
        """Log assignment to a task"""
        return StockLogger.create_log(
            user_id=user_id,
            action_type='ASSIGNMENT',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Assigned to task {task_id}"
        )

    @staticmethod
    def log_assign_item_to_task(user_id, item_id, task_id, quantity):
        """Log assignment of an item to a specific task"""
        from models import Item, Task
        item = Item.query.get(item_id)
        task = Task.query.get(task_id)
        
        item_name = f"Item {item_id}" if not item else StockLogger._get_entity_name(item, 'item')
        task_name = f"Task {task_id}" if not task else f"Task {task.task_name} ({task_id})"
        
        return StockLogger.create_log(
            user_id=user_id,
            action_type='ASSIGNMENT',
            entity_type='item',
            entity_id=item_id,
            entity_name=item_name,
            details=f"Assigned {quantity} units to {task_name}"
        )

    @staticmethod
    def log_remove_item_from_task(user_id, item_id, task_id, quantity):
        """Log removal of an item from a task"""
        from models import Item, Task
        item = Item.query.get(item_id)
        task = Task.query.get(task_id)
        
        item_name = f"Item {item_id}" if not item else StockLogger._get_entity_name(item, 'item')
        task_name = f"Task {task_id}" if not task else f"Task {task.task_name} ({task_id})"
        
        return StockLogger.create_log(
            user_id=user_id,
            action_type='REMOVAL',
            entity_type='item',
            entity_id=item_id,
            entity_name=item_name,
            details=f"Removed {quantity} units from {task_name}"
        )

    @staticmethod
    def log_usage(user_id, entity_type, entity_id, quantity_used, remaining_quantity, entity_name=None):
        """Log usage of inventory items"""
        return StockLogger.create_log(
            user_id=user_id,
            action_type='USAGE',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Used {quantity_used} units, {remaining_quantity} remaining"
        )

    @staticmethod
    def log_split(user_id, entity_type, entity_id, new_item_id, split_quantity, original_quantity, entity_name=None):
        """Log splitting of items"""
        return StockLogger.create_log(
            user_id=user_id,
            action_type='SPLIT',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=f"Split {split_quantity} units into new item {new_item_id}, {original_quantity - split_quantity} units remaining"
        )