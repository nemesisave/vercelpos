import { Permission } from './types';

export const ALL_PERMISSIONS: Permission[] = [
    'CAN_PROCESS_PAYMENTS',
    'CAN_VIEW_DASHBOARD_REPORTS',
    'CAN_VIEW_SALES_HISTORY',
    'CAN_GENERATE_AI_ANALYSIS',
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
];

// Define permission groups for UI organization
export const PERMISSION_GROUPS: { [key: string]: { labelKey: string; permissions: Permission[] } } = {
    pos: {
        labelKey: 'permissions.permissionGroup_pos',
        permissions: ['CAN_PROCESS_PAYMENTS']
    },
    reports: {
        labelKey: 'permissions.permissionGroup_reports',
        permissions: ['CAN_VIEW_DASHBOARD_REPORTS', 'CAN_VIEW_SALES_HISTORY', 'CAN_GENERATE_AI_ANALYSIS']
    },
    inventory: {
        labelKey: 'permissions.permissionGroup_inventory',
        permissions: ['CAN_VIEW_INVENTORY', 'CAN_MANAGE_INVENTORY_STOCK_PRICES', 'CAN_ADD_PRODUCTS', 'CAN_EDIT_DELETE_PRODUCTS', 'CAN_PERFORM_STOCK_COUNT']
    },
    purchasing: {
        labelKey: 'permissions.permissionGroup_purchasing',
        permissions: ['CAN_MANAGE_SUPPLIERS_AND_POs']
    },
    admin: {
        labelKey: 'permissions.permissionGroup_admin',
        permissions: ['CAN_MANAGE_USERS_AND_ROLES', 'CAN_MANAGE_CUSTOMERS', 'CAN_MANAGE_CASH_DRAWER', 'CAN_MANAGE_BUSINESS_SETTINGS']
    }
};