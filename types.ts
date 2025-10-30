import type { Currency } from './currencies';

export interface Product {
  id: number;
  name: string;
  price: { [currencyCode: string]: number };
  purchasePrice: { [currencyCode: string]: number };
  imageUrl: string;
  category: string;
  stock: number; // a.k.a. quantity in stock (units or kg)
  sellBy: 'unit' | 'weight'; // New property
}

export interface NewProductPayload {
  name: string;
  price: { [currencyCode: string]: number };
  purchasePrice: { [currencyCode: string]: number };
  imageUrl: string;
  category: string;
  stock: number;
  sellBy: 'unit' | 'weight'; // New property
}

export interface ProductUpdatePayload {
  name?: string;
  category?: string;
  imageUrl?: string;
  sellBy?: 'unit' | 'weight';
  stock?: number;
  price?: { [currencyCode: string]: number };
  purchasePrice?: { [currencyCode: string]: number };
}

export interface OrderItem extends Product {
  quantity: number; // Number of units or weight in kg
}

export interface ParkedOrder {
  id: string; // e.g., 'parked-1678886400000'
  name: string; // User-given name for the order, e.g., "Table 5"
  items: OrderItem[];
  parkedAt: string;
}

// Updated granular permissions
export type Permission =
  | 'CAN_PROCESS_PAYMENTS'
  | 'CAN_VIEW_DASHBOARD_REPORTS'
  | 'CAN_VIEW_SALES_HISTORY'
  | 'CAN_GENERATE_AI_ANALYSIS'
  | 'CAN_VIEW_INVENTORY'
  | 'CAN_MANAGE_INVENTORY_STOCK_PRICES'
  | 'CAN_ADD_PRODUCTS'
  | 'CAN_EDIT_DELETE_PRODUCTS'
  | 'CAN_PERFORM_STOCK_COUNT'
  | 'CAN_MANAGE_SUPPLIERS_AND_POs'
  | 'CAN_MANAGE_USERS_AND_ROLES'
  | 'CAN_MANAGE_CUSTOMERS'
  | 'CAN_MANAGE_CASH_DRAWER'
  | 'CAN_MANAGE_BUSINESS_SETTINGS';

export interface Role {
  id: string;
  name: string;
  descriptionKey: string;
  permissions: Permission[];
}

export interface User {
  id: number;
  name:string;
  roleId: string;
  username: string;
  password: string;
  pin: string;
  avatarUrl: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface NewUserPayload {
  name: string;
  username: string;
  password: string;
  pin: string;
  roleId: string;
}

export interface UserUpdatePayload {
  name?: string;
  username?: string;
  password?: string;
  pin?: string;
  roleId?: string;
  status?: 'active' | 'inactive';
  lastLogin?: string;
}

export type PaymentMethod = 'card' | 'cash';
export type OrderStatus = 'Completed' | 'Partially Refunded' | 'Fully Refunded';

export interface CompletedOrder {
  invoiceId: string;
  date: string;
  cashier: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  refundAmount?: number;
  customerId?: number | null;
  customerName?: string;
}

export interface RefundTransaction {
    id: string; // REF-timestamp
    originalInvoiceId: string;
    date: string;
    cashier: string; // User who processed the refund
    items: OrderItem[]; // The specific items and quantities refunded
    totalRefundAmount: number;
    stockRestored: boolean;
}


export interface BusinessSettings {
  businessName: string;
  taxRate: number; // e.g., 0.08 for 8%
  phone: string;
  address: string;
  taxId: string;
  currency: string; // Base currency for the business (e.g., 'USD')
  defaultDisplayCurrency?: string; // The currency to show by default in the UI
  logoUrl?: string;
  receiptHeaderText?: string;
  receiptFooterText?: string;
  receiptShowPhone?: boolean;
  receiptShowAddress?: boolean;
  receiptShowTaxId?: boolean;
  currencyRatesLastUpdated?: string;
}

export type CashDrawerActivityType = 'sale' | 'pay-in' | 'pay-out';

export interface CashDrawerActivity {
  type: CashDrawerActivityType;
  amount: number;
  timestamp: string;
  notes?: string;
  orderId?: string;
  paymentMethod?: PaymentMethod;
}


export interface CashDrawerSession {
  id: number; // Session ID
  isOpen: boolean;
  startingCash: number;
  openedBy: string; // User name
  openedAt: string; // Date string
  activities: CashDrawerActivity[];
  closingCash?: number;
  difference?: number;
  closedBy?: string;
  closedAt?: string;
}

// Supplier Management
export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
}

export interface NewSupplierPayload {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address?: string;
    notes?: string;
}

export interface SupplierUpdatePayload extends Partial<NewSupplierPayload> {}


// Purchase Orders
export interface PurchaseOrderItem {
    productId: number;
    productName: string;
    quantity: number;
    costPrice: number; // Cost at time of purchase
    quantityReceived: number;
}

export type PurchaseOrderStatus = 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled';

export interface PurchaseOrder {
    id: string; // PO-timestamp
    supplierId: number;
    supplierName: string;
    date: string;
    items: PurchaseOrderItem[];
    totalCost: number;
    status: PurchaseOrderStatus;
}

export interface AuditLog {
    id: number;
    timestamp: string;
    userId: number;
    userName: string;
    action: string;
    details: string;
}

export interface Customer {
    id: number;
    name: string;
    phone: string;
    email: string;
    address: string;
    notes?: string;
    createdAt: string;
}

export interface NewCustomerPayload {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes?: string;
}

export interface CustomerUpdatePayload extends Partial<NewCustomerPayload> {}


export type ThemeName = 'default' | 'dark' | 'forest' | 'latte' | 'ios' | 'android';

export interface AppSettings {
  theme: ThemeName;
  language: 'en' | 'es';
}

export interface SetupPayload {
  adminUser: {
    name: string;
    username: string;
    password: string;
    pin: string;
  };
  businessSettings: {
    businessName: string;
    taxRate: number;
    currency: string;
  };
}

// Data structure for initial data load from backend
export interface InitialData {
    products: Product[];
    users: User[];
    roles: Role[];
    suppliers: Supplier[];
    customers: Customer[];
    businessSettings: BusinessSettings;
    appSettings: AppSettings;
    purchaseOrders: PurchaseOrder[];
    completedOrders: CompletedOrder[];
    refundTransactions: RefundTransaction[];
    sessionHistory: CashDrawerSession[];
    auditLogs: AuditLog[];
    currencies: Currency[];
    parkedOrders: ParkedOrder[];
}