import React from "react";
import { usePermissions } from "../hooks/usePermissions.js";
import LoadingSpinner from "./LoadingSpinner.jsx";
import Header from "./Header.jsx";

const PermissionGate = ({
  permission,
  resource,
  action,
  children,
  fallback = null,
  requireAll = false,
}) => {
  const { hasPermission, canRead, canWrite, canDelete, canCreate, loading } =
    usePermissions();

  if (loading) {
    return (
      <>
        <Header title={"身份驗證"} />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中" />
        </div>
      </>
    );
  }

  let hasAccess = false;

  if (permission) {
    // Direct permission check
    if (Array.isArray(permission)) {
      hasAccess = requireAll
        ? permission.every((p) => hasPermission(p))
        : permission.some((p) => hasPermission(p));
    } else {
      hasAccess = hasPermission(permission);
    }
  } else if (resource && action) {
    // Resource.action permission check
    switch (action) {
      case "read":
        hasAccess = canRead(resource);
        break;
      case "write":
        hasAccess = canWrite(resource);
        break;
      case "delete":
        hasAccess = canDelete(resource);
        break;
      case "create":
        hasAccess = canCreate(resource);
        break;
      default:
        hasAccess = hasPermission(`${resource}.${action}`);
    }
  }

  return hasAccess ? children : fallback;
};

export default PermissionGate;
