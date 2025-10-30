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
} from '../types';
import type { Currency } from '../currencies';

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(`API request failed: ${response.statusText}`);
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
// This is now handled by the backend automatically. We can keep this if we need manual logs.
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
    customerId?: number | null,
    customerName?: string,
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
            customerName
        }),
    });
    return handleResponse<{ updatedProducts: {id: number, stock: number}[], newOrder: CompletedOrder }>(response);
};


export const processRefund = async (originalInvoiceId: string, itemsToRefund: { id: number; quantity: number }[], restock: boolean): Promise<{ updatedOrder: CompletedOrder, newRefund: RefundTransaction, updatedProducts?: {id: number, stock: number}[] }> => {
  const response = await fetch(`/api/orders/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalInvoiceId, itemsToRefund, restock }),
  });
  return handleResponse<{ updatedOrder: CompletedOrder, newRefund: RefundTransaction, updatedProducts?: {id: number, stock: number}[] }>(response);
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