import type { Permission, Product, CompletedOrder, AuditLog } from '../types';

const errorMessage = 'Gemini/Google AI is disabled in this deployment.';

export const getRolePermissionSuggestions = async (roleName: string): Promise<Permission[]> => {
  console.warn(errorMessage, `(Suggestion for role "${roleName}" was requested)`);
  // Return an empty array to prevent breaking any UI expecting an array.
  return Promise.resolve([]);
};

export const getBusinessAnalysis = async (products: Product[], completedOrders: CompletedOrder[], baseCurrencyCode: string): Promise<string> => {
  console.error(errorMessage);
  throw new Error(errorMessage);
};

export const analyzeUserActivity = async (userName: string, auditLogs: AuditLog[]): Promise<string> => {
    console.error(errorMessage);
    throw new Error(errorMessage);
};
