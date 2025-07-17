#!/usr/bin/env python3
"""
Database migration script to set up the new RBAC system
Run this script to create the permission tables and set up default permissions
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from __init__ import db, create_app
from models import Permission, UserTypePermission, PermissionAudit, UserType
from utils.db_utils import init_default_data

def create_permission_tables():
    """Create the permission-related tables"""
    print("Creating permission tables...")
    
    # Create tables
    db.create_all()
    print("✓ Permission tables created successfully")

def setup_default_permissions():
    """Set up default permissions and assign them to admin"""
    print("Setting up default permissions...")
    
    # Initialize default data (this will create permissions and assign to admin)
    init_default_data()
    print("✓ Default permissions created and assigned to admin")

def verify_setup():
    """Verify the permission setup is working"""
    print("\nVerifying permission setup...")
    
    # Check permissions exist
    permissions = Permission.query.all()
    print(f"✓ {len(permissions)} permissions created")
    
    # Check admin has permissions
    admin_permissions = db.session.query(Permission).join(
        UserTypePermission,
        Permission.id == UserTypePermission.permission_id
    ).filter(UserTypePermission.user_type_id == 'UT001').all()
    
    print(f"✓ Admin user type has {len(admin_permissions)} permissions")
    
    # List some permissions
    print("\nSample permissions:")
    for perm in permissions[:5]:
        print(f"  - {perm.id}: {perm.description}")
    
    if len(permissions) > 5:
        print(f"  ... and {len(permissions) - 5} more")

def main():
    print("🚀 Setting up RBAC Permission System")
    print("=" * 40)
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        try:
            # Step 1: Create tables
            create_permission_tables()
            
            # Step 2: Set up default permissions
            setup_default_permissions()
            
            # Step 3: Verify setup
            verify_setup()
            
            print("\n✅ Permission system setup completed successfully!")
            print("\nNext steps:")
            print("1. Restart your Flask application")
            print("2. Test the /api/auth/permissions endpoint")
            print("3. Use PermissionGate components in your frontend")
            print("4. Create admin interface for managing permissions")
            
        except Exception as e:
            print(f"\n❌ Error during setup: {str(e)}")
            print("Please check the error and try again.")
            sys.exit(1)

if __name__ == "__main__":
    main()