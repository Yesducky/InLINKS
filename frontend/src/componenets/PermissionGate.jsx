import React from "react";
const skipPermissionCheck = import.meta.env.VITE_SKIP_PERMISSION_CHECK;
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
  header = "身份驗證",
  show = true,
  style = null,
}) => {
  // short-circuit override: when set to 'true', always render children
  if (skipPermissionCheck && show) {
    return <>{children}</>;
  }

  const { hasPermission, canRead, canWrite, canDelete, canCreate, loading } =
    usePermissions();

  if (loading && show) {
    return (
      <>
        <div className={`h-full w-full`} style={style}>
          <Header title={header} />
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner
              variant="circular"
              size={30}
              message="Permission Check"
            />
          </div>
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
