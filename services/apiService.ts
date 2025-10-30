import type {
  InitialData,
  NewProductPayload,
  ProductUpdatePayload,
  Product,
  NewUserPayload,
  UserUpdatePayload,
  User,
  BusinessSettings,
  AuditLog,
  OrderItem,
  CompletedOrder,
  Role,
  Permission,
  NewSupplierPayload,
  Supplier,
  SupplierUpdatePayload,
  PurchaseOrder,
  PurchaseOrderItem,
  RefundTransaction,
  PaymentMethod,
  Customer,
  NewCustomerPayload,
  CustomerUpdatePayload,
  AppSettings,
  ThemeName,
  CashDrawerSession,
  CashDrawerActivity,
  ParkedOrder,
} from '../types';
import type { Currency } from '../currencies';

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    const errorMessage = errorBody.error || response.statusText;
    console.error('API Error:', errorMessage, errorBody);
    throw new Error(`API request failed: ${errorMessage}`);
  }
  return response.json() as Promise<T>;
}

// --- HEALTH & SETUP ---
export const getInitialData = async (): Promise<InitialData> => {
  const response = await fetch('/api/data');
  return handleResponse<InitialData>(response);
};

// --- PRODUCTS ---
export const addProduct = async (productData: NewProductPayload): Promise<Product> => {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  return handleResponse<Product>(response);
};

export const updateProduct = async (productId: number, updates: ProductUpdatePayload): Promise<Product> => {
  const response = await fetch(`/api/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<Product>(response);
};

export const deleteProduct = async (productId: number): Promise<{ success: boolean }> => {
  const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(response);
};


// --- USERS ---
export const addUser = async (userData: NewUserPayload): Promise<User> => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse<User>(response);
};

export const updateUser = async (userId: number, updates: UserUpdatePayload): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<User>(response);
};

export const deleteUser = async (userId: number, adminInfo: { adminUserId: number, adminUserName: string }): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/users/${userId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminInfo)
    });
    return handleResponse<{ success: boolean }>(response);
};


// --- CUSTOMERS ---
export const addCustomer = async (customerData: NewCustomerPayload): Promise<Customer> => {
  const response = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData),
  });
  return handleResponse<Customer>(response);
};

export const updateCustomer = async (customerId: number, updates: CustomerUpdatePayload): Promise<Customer> => {
  const response = await fetch(`/api/customers/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<Customer>(response);
};

export const deleteCustomer = async (customerId: number): Promise<{ success: boolean }> => {
   const response = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(response);
};


// --- ROLES ---
export const addRole = async (newRoleData: Omit<Role, 'descriptionKey'>): Promise<Role> => {
  const response = await fetch('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRoleData),
  });
  return handleResponse<Role>(response);
}

export const updateRolePermissions = async (roleId: string, permissions: Permission[]): Promise<Role> => {
  const response = await fetch(`/api/roles/${roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
  return handleResponse<Role>(response);
}

// --- SETTINGS ---
export const updateBusinessSettings = async (settings: BusinessSettings): Promise<BusinessSettings> => {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse<BusinessSettings>(response);
};

export const updateAppSettings = async (settings: { theme?: ThemeName; language?: 'en' | 'es' }): Promise<AppSettings> => {
    const response = await fetch('/api/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
    return handleResponse<AppSettings>(response);
};


export const updateCurrencies = async (currencies: Currency[]): Promise<Currency[]> => {
  const response = await fetch('/api/currencies', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currencies),
  });
  return handleResponse<Currency[]>(response);
};


// --- AUDIT LOG ---
export const addAuditLog = async (userId: number, userName: string, action: string, details: string): Promise<AuditLog> => {
   const response = await fetch('/api/audit-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName, action, details }),
  });
  return handleResponse<AuditLog>(response);
};


// --- ORDERS ---
export const processPayment = async (
    orderItems: OrderItem[],
    businessSettings: BusinessSettings,
    cashierName: string,
    paymentMethod: PaymentMethod,
    tip: number,
    discount: number,
    customerId: number | null | undefined,
    customerName: string | undefined,
    userId: number,
): Promise<{ updatedProducts: {id: number, stock: number}[], newOrder: CompletedOrder }> => {
    const response = await fetch('/api/orders/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            orderItems, 
            businessSettings, 
            cashierName, 
            paymentMethod,
            tip,
            discount,
            customerId,
            customerName,
            userId,
        }),
    });
    return handleResponse<{ updatedProducts: {id: number, stock: number}[], newOrder: CompletedOrder }>(response);
};


export const processRefund = async (originalInvoiceId: string, itemsToRefund: { id: number; quantity: number }[], restock: boolean, userId: number): Promise<{ updatedOrder: CompletedOrder, newRefund: RefundTransaction, updatedProducts?: {id: number, stock: number}[] }> => {
  const response = await fetch(`/api/orders/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalInvoiceId, itemsToRefund, restock, userId }),
  });
  return handleResponse<{ updatedOrder: CompletedOrder, newRefund: RefundTransaction, updatedProducts?: {id: number, stock: number}[] }>(response);
};

// --- PARKED ORDERS ---
export const parkSale = async (orderData: { name: string; items: OrderItem[] }): Promise<ParkedOrder> => {
    const response = await fetch('/api/parked-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
    });
    return handleResponse<ParkedOrder>(response);
};

export const unparkSale = async (parkedOrderId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/parked-orders/${parkedOrderId}`, { method: 'DELETE' });
    return handleResponse<{ success: boolean }>(response);
};

// --- SUPPLIERS ---
export const addSupplier = async (supplierData: NewSupplierPayload): Promise<Supplier> => {
  const response = await fetch('/api/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplierData),
  });
  return handleResponse<Supplier>(response);
};

export const updateSupplier = async (supplierId: number, updates: SupplierUpdatePayload): Promise<Supplier> => {
  const response = await fetch(`/api/suppliers/${supplierId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<Supplier>(response);
};

export const deleteSupplier = async (supplierId: number): Promise<{ success: boolean }> => {
  const response = await fetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(response);
};


// --- PURCHASE ORDERS ---
export const createPurchaseOrder = async (orderData: { supplierId: number; supplierName: string; items: Omit<PurchaseOrderItem, 'quantityReceived'>[]; totalCost: number; }): Promise<PurchaseOrder> => {
  const response = await fetch('/api/purchase-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return handleResponse<PurchaseOrder>(response);
};

export const receiveStock = async (purchaseOrderId: string, receivedQuantities: Record<number, number>): Promise<{ updatedPO: PurchaseOrder, updatedProducts: {id: number, stock: number}[] }> => {
  const response = await fetch(`/api/purchase-orders/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchaseOrderId, receivedQuantities }),
  });
  return handleResponse<{ updatedPO: PurchaseOrder, updatedProducts: {id: number, stock: number}[] }>(response);
};

// --- CURRENCY ---
export const fetchLatestCurrencyRates = async (): Promise<{ currencies: Currency[], businessSettings: BusinessSettings }> => {
  const response = await fetch('/api/currencies/fetch-rates', { method: 'POST' });
  return handleResponse<{ currencies: Currency[], businessSettings: BusinessSettings }>(response);
};

// --- CASH DRAWER SESSIONS ---
export const openSession = async (sessionData: { startingCash: number; openedBy: string; openedAt: string; userId: number; }): Promise<CashDrawerSession> => {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
  return handleResponse<CashDrawerSession>(response);
};

export const addSessionActivity = async (sessionId: number, activity: CashDrawerActivity, userId: number, userName: string): Promise<CashDrawerSession> => {
    const response = await fetch(`/api/sessions/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, activity, userId, userName }),
    });
    return handleResponse<CashDrawerSession>(response);
};

export const closeSession = async (sessionId: number, closingData: { countedCash: number; closedBy: string; closedAt: string; userId: number; }): Promise<CashDrawerSession> => {
    const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closingData),
    });
    return handleResponse<CashDrawerSession>(response);
};

// --- INVENTORY COUNT ---
export const saveInventoryCount = async (countData: {
    userId: number;
    userName: string;
    counts: { productId: number; counted: number }[];
}): Promise<{ updatedProducts: Product[] }> => {
    const response = await fetch('/api/inventory/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(countData),
    });
    return handleResponse<{ updatedProducts: Product[] }>(response);
};
