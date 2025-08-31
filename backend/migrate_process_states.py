#!/usr/bin/env python3
"""
Migration script to add Chinese translations to existing ProcessStateType records
Run this script after adding the state_name_chinese field to the model
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from __init__ import db, create_app
from models import ProcessStateType

def migrate_process_state_chinese_names():
    """Add Chinese translations to existing ProcessStateType records"""
    print("Migrating existing ProcessStateType records to include Chinese names...")

    # Mapping of state names to Chinese translations
    chinese_translations = {
        'pending': '待處理',
        'active': '進行中',
        'completed': '已完成',
        'assigned_worker': '已分配工人',
        'in_progress': '進行中',
        'waiting T&C': '等待測試和調試'
    }

    try:
        # Get all existing process state types
        existing_states = ProcessStateType.query.all()
        updated_count = 0

        for state in existing_states:
            if not state.state_name_chinese:  # Only update if Chinese name is missing
                chinese_name = chinese_translations.get(state.state_name)
                if chinese_name:
                    state.state_name_chinese = chinese_name
                    updated_count += 1
                    print(f"Updated {state.state_name} ({state.state_type}) -> {chinese_name}")
                else:
                    # Default fallback for unknown states
                    state.state_name_chinese = state.state_name
                    updated_count += 1
                    print(f"Updated {state.state_name} ({state.state_type}) -> {state.state_name} (fallback)")

        if updated_count > 0:
            db.session.commit()
            print(f"✓ Successfully updated {updated_count} ProcessStateType records with Chinese names")
        else:
            print("✓ No ProcessStateType records needed updating")

    except Exception as e:
        db.session.rollback()
        print(f"✗ Error updating ProcessStateType records: {e}")
        return False

    return True

def verify_migration():
    """Verify that all ProcessStateType records have Chinese names"""
    print("\nVerifying migration...")

    states = ProcessStateType.query.all()
    missing_chinese = []

    for state in states:
        if not state.state_name_chinese:
            missing_chinese.append(f"{state.state_name} ({state.state_type})")

    if missing_chinese:
        print(f"✗ {len(missing_chinese)} records still missing Chinese names:")
        for item in missing_chinese:
            print(f"  - {item}")
        return False
    else:
        print(f"✓ All {len(states)} ProcessStateType records have Chinese names")

        # Show sample records
        print("\nSample records:")
        for state in states[:5]:
            print(f"  - {state.state_name} -> {state.state_name_chinese} ({state.state_type})")

        return True

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        print("Starting ProcessStateType Chinese name migration...\n")

        if migrate_process_state_chinese_names():
            verify_migration()
            print("\n✓ Migration completed successfully!")
        else:
            print("\n✗ Migration failed!")
            sys.exit(1)
