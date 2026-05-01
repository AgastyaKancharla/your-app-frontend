import { useSyncExternalStore } from "react";

import { roles, toggleRolePermission } from "../utils/permissionEngine";

const RBAC_STORAGE_KEY = "wevalue_rbac_role_permissions_v1";

const cloneDefaultRoles = () =>
  Object.fromEntries(Object.entries(roles).map(([role, permissions]) => [role, [...permissions]]));

const readRolePermissions = () => {
  if (typeof window === "undefined") {
    return cloneDefaultRoles();
  }

  try {
    const raw = window.localStorage.getItem(RBAC_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    const defaults = cloneDefaultRoles();
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }

    return Object.fromEntries(
      Object.entries(defaults).map(([role, permissions]) => [
        role,
        Array.isArray(parsed[role]) ? parsed[role] : permissions
      ])
    );
  } catch {
    return cloneDefaultRoles();
  }
};

const writeRolePermissions = (rolePermissions) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(rolePermissions));
};

const createStore = (initializer) => {
  let state;
  const listeners = new Set();

  const set = (updater) => {
    const partial = typeof updater === "function" ? updater(state) : updater;
    state = {
      ...state,
      ...(partial || {})
    };

    if (partial?.rolePermissions) {
      writeRolePermissions(state.rolePermissions);
    }

    listeners.forEach((listener) => listener());
  };

  const get = () => state;
  state = initializer(set, get);

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useStore = (selector = (nextState) => nextState) =>
    useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );

  useStore.getState = get;
  useStore.setState = set;

  return useStore;
};

export const useAuthStore = createStore((set) => ({
  user: null,
  rolePermissions: readRolePermissions(),

  setUser: (user) => set({ user }),

  setRolePermissions: (rolePermissions) => set({ rolePermissions }),

  updateRolePermission: (role, permission, enabled) =>
    set((state) => ({
      rolePermissions: toggleRolePermission(state.rolePermissions, role, permission, enabled)
    })),

  resetRolePermissions: () => set({ rolePermissions: cloneDefaultRoles() }),

  logout: () => set({ user: null })
}));
