import { useAuthStore } from "../store/authStore";
import { hasPermission } from "../utils/permissionEngine";

export default function PermissionGuard({ permission, children, fallback = null }) {
  const user = useAuthStore((state) => state.user);
  const rolePermissions = useAuthStore((state) => state.rolePermissions);

  if (!hasPermission(user, permission, rolePermissions)) {
    return fallback;
  }

  return children;
}
