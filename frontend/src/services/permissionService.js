class PermissionService {
  constructor() {
    this.permissions = new Set();
    this.userType = null;
    this.userInfo = null;
  }

  async initialize() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        this.clear();
        return false;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://103.30.41.250:5000'}/api/auth/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        this.permissions = new Set(data.permissions || []);
        this.userType = data.user_type;
        this.userInfo = {
          id: data.user_id,
          username: data.username,
          userType: data.user_type
        };
        return true;
      } else {
        this.clear();
        return false;
      }
    } catch (error) {
      console.error("Failed to initialize permissions:", error);
      this.clear();
      return false;
    }
  }

  hasPermission(permissionId) {
    return this.permissions.has(permissionId);
  }

  canRead(resource) {
    return this.hasPermission(`${resource}.read`);
  }

  canWrite(resource) {
    return this.hasPermission(`${resource}.write`);
  }

  canDelete(resource) {
    return this.hasPermission(`${resource}.delete`);
  }

  canCreate(resource) {
    return this.hasPermission(`${resource}.create`);
  }

  isAdmin() {
    return (
      this.hasPermission("admin.users") || this.hasPermission("admin.roles")
    );
  }

  getUserInfo() {
    return this.userInfo;
  }

  clear() {
    this.permissions.clear();
    this.userType = null;
    this.userInfo = null;
  }

  // Utility methods for common permission checks
  canManageUsers() {
    return this.hasPermission('admin.users');
  }

  canManageRoles() {
    return this.hasPermission('admin.roles');
  }

  canAccessDashboard() {
    return this.hasPermission('dashboard.view');
  }

  canManageInventory() {
    return this.hasPermission('inventory.write');
  }

  canViewInventory() {
    return this.hasPermission('inventory.read');
  }

  // Method to check multiple permissions
  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }
}

export default new PermissionService();
