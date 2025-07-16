import { useState, useEffect } from "react";
import permissionService from "../services/permissionService";

export const usePermissions = () => {
  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializePermissions = async () => {
      const success = await permissionService.initialize();
      if (success) {
        setPermissions(permissionService.permissions);
      }
      setLoading(false);
    };

    initializePermissions();
  }, []);

  return {
    permissions,
    loading,
    hasPermission: (permissionId) => permissions.has(permissionId),
    canRead: (resource) => permissions.has(`${resource}.read`),
    canWrite: (resource) => permissions.has(`${resource}.write`),
    canDelete: (resource) => permissions.has(`${resource}.delete`),
    canCreate: (resource) => permissions.has(`${resource}.create`),
    isAdmin: () =>
      permissions.has("admin.users") || permissions.has("admin.roles"),
  };
};
