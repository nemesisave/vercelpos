import { useMemo } from 'react';
import type { User, Permission, Role } from '../types';

// Flattened list of all permissions that could grant admin panel access
const ADMIN_PANEL_PERMISSIONS: Permission[] = [
    'CAN_VIEW_DASHBOARD_REPORTS',
    'CAN_VIEW_SALES_HISTORY',
    'CAN_VIEW_INVENTORY',
    'CAN_MANAGE_INVENTORY_STOCK_PRICES',
    'CAN_ADD_PRODUCTS',
    'CAN_EDIT_DELETE_PRODUCTS',
    'CAN_PERFORM_STOCK_COUNT',
    'CAN_MANAGE_SUPPLIERS_AND_POs',
    'CAN_MANAGE_USERS_AND_ROLES',
    'CAN_MANAGE_CUSTOMERS',
    'CAN_MANAGE_CASH_DRAWER',
    'CAN_MANAGE_BUSINESS_SETTINGS',
    // FIX: Add CAN_GENERATE_AI_ANALYSIS permission for AI features
    'CAN_GENERATE_AI_ANALYSIS',
];

export const usePermissions = (user: User | null, roles: Role[]) => {
  const permissions = useMemo(() => {
    // Start with all permissions set to false
    const userPermissions: { [key in Permission]: boolean } & { canAccessAdminPanel: boolean } = {
        CAN_PROCESS_PAYMENTS: false,
        CAN_VIEW_DASHBOARD_REPORTS: false,
        CAN_VIEW_SALES_HISTORY: false,
        CAN_VIEW_INVENTORY: false,
        CAN_MANAGE_INVENTORY_STOCK_PRICES: false,
        CAN_ADD_PRODUCTS: false,
        CAN_EDIT_DELETE_PRODUCTS: false,
        CAN_PERFORM_STOCK_COUNT: false,
        CAN_MANAGE_SUPPLIERS_AND_POs: false,
        CAN_MANAGE_USERS_AND_ROLES: false,
        CAN_MANAGE_CUSTOMERS: false,
        CAN_MANAGE_CASH_DRAWER: false,
        CAN_MANAGE_BUSINESS_SETTINGS: false,
        // FIX: Add CAN_GENERATE_AI_ANALYSIS permission for AI features
        CAN_GENERATE_AI_ANALYSIS: false,
        canAccessAdminPanel: false,
    };

    if (!user) {
      return userPermissions;
    }

    const role = roles.find(r => r.id === user.roleId);
    if (!role) {
      return userPermissions;
    }
    
    // Set user's permissions to true based on their role
    for (const p of role.permissions) {
        if (p in userPermissions) {
            userPermissions[p] = true;
        }
    }
    
    // Determine if user can access any part of the admin panel
    userPermissions.canAccessAdminPanel = ADMIN_PANEL_PERMISSIONS.some(p => userPermissions[p]);

    return userPermissions;
  }, [user, roles]);

  return permissions;
};