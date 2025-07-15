"""
Item utility functions for recursive operations
"""

import json
from models import Item


def get_item_with_children_recursive(item_id):
    """
    Get an item by its ID and all its child items recursively.

    Args:
        item_id (str): The ID of the item to retrieve

    Returns:
        list: A list containing the item and all its children recursively.
              Returns empty list if item not found.
              Each item in the list is a dictionary with item details.
    """
    def get_item_details(item):
        """Convert Item model to dictionary"""
        return {
            'id': item.id,
            'material_type_id': item.material_type_id,
            'quantity': float(item.quantity),
            'status': item.status,
            'parent_id': item.parent_id,
            'child_item_ids': item.child_item_ids,
            'log_ids': item.log_ids,
            'task_ids': item.task_ids,
            'created_at': item.created_at.isoformat()
        }

    def get_children_recursive(item, visited_ids=None):
        """
        Recursively get all children of an item.

        Args:
            item: The Item model instance
            visited_ids: Set to track visited item IDs to prevent infinite loops

        Returns:
            list: List of all child items (and their children) as dictionaries
        """
        if visited_ids is None:
            visited_ids = set()

        # Prevent infinite loops by tracking visited items
        if item.id in visited_ids:
            return []

        visited_ids.add(item.id)
        children = []

        # Parse child item IDs from JSON string
        try:
            child_ids = json.loads(item.child_item_ids) if item.child_item_ids else []
        except (json.JSONDecodeError, TypeError):
            child_ids = []

        # Get each child item and recursively get their children
        for child_id in child_ids:
            child_item = Item.query.get(child_id)
            if child_item:
                # Add the child item itself
                children.append(get_item_details(child_item))

                # Recursively get the child's children
                grandchildren = get_children_recursive(child_item, visited_ids.copy())
                children.extend(grandchildren)

        return children

    # Get the main item
    main_item = Item.query.get(item_id)
    if not main_item:
        return []

    # Start with the main item
    result = [get_item_details(main_item)]

    # Get all children recursively
    children = get_children_recursive(main_item)
    result.extend(children)

    return result


def get_item_hierarchy_tree(item_id):
    """
    Get an item and its children in a tree structure (nested format).

    Args:
        item_id (str): The ID of the item to retrieve

    Returns:
        dict or None: A dictionary representing the item with nested children.
                     Returns None if item not found.
    """
    def build_tree(item, visited_ids=None):
        """
        Build a tree structure for an item and its children.

        Args:
            item: The Item model instance
            visited_ids: Set to track visited item IDs to prevent infinite loops

        Returns:
            dict: Dictionary with item details and nested children
        """
        if visited_ids is None:
            visited_ids = set()

        # Prevent infinite loops
        if item.id in visited_ids:
            return {
                'id': item.id,
                'error': 'Circular reference detected',
                'children': []
            }

        visited_ids.add(item.id)

        item_dict = {
            'id': item.id,
            'material_type_id': item.material_type_id,
            'quantity': float(item.quantity),
            'status': item.status,
            'parent_id': item.parent_id,
            'log_ids': item.log_ids,
            'task_ids': item.task_ids,
            'created_at': item.created_at.isoformat(),
            'children': []
        }

        # Parse child item IDs from JSON string
        try:
            child_ids = json.loads(item.child_item_ids) if item.child_item_ids else []
        except (json.JSONDecodeError, TypeError):
            child_ids = []

        # Build tree for each child
        for child_id in child_ids:
            child_item = Item.query.get(child_id)
            if child_item:
                child_tree = build_tree(child_item, visited_ids.copy())
                item_dict['children'].append(child_tree)

        return item_dict

    # Get the main item
    main_item = Item.query.get(item_id)
    if not main_item:
        return None

    return build_tree(main_item)


def count_total_children(item_id):
    """
    Count the total number of child items recursively.

    Args:
        item_id (str): The ID of the item

    Returns:
        int: Total count of child items (not including the item itself)
    """
    items_list = get_item_with_children_recursive(item_id)
    # Subtract 1 to exclude the main item itself
    return len(items_list) - 1 if items_list else 0


def get_item_descendants_by_status(item_id, status=None):
    """
    Get all descendant items filtered by status.

    Args:
        item_id (str): The ID of the item
        status (str, optional): Filter by status ('available', 'used', 'assigned')

    Returns:
        list: List of descendant items with the specified status
    """
    all_items = get_item_with_children_recursive(item_id)

    if not all_items:
        return []

    # Remove the main item (first item) and filter by status
    descendants = all_items[1:]  # Skip the first item (the main item)

    if status:
        descendants = [item for item in descendants if item['status'] == status]

    return descendants
