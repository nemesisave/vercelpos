import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Product, ProductUpdatePayload, NewProductPayload, User, NewUserPayload, UserUpdatePayload, BusinessSettings, CompletedOrder, CashDrawerSession, Supplier, NewSupplierPayload, SupplierUpdatePayload, PurchaseOrder, PurchaseOrderItem, Role, Permission, RefundTransaction, AuditLog, Customer, NewCustomerPayload, CustomerUpdatePayload } from '../types';
import type { Currency } from '../currencies';

import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import DashboardTab from './DashboardTab';
import CashDrawerTab from './CashDrawerTab';
import SuppliersTab from './SuppliersTab';
import CustomersTab from './CustomersTab';
import InventoryCountTab from './InventoryCountTab';
import { usePermissions } from '../hooks/usePermissions';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '../constants';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmationModal from './ConfirmationModal';
import { useDebounce } from '../hooks/useDebounce';
import SalesHistoryTab from './SalesHistoryTab';
import AddRoleModal from './AddRoleModal';
import AuditLogTab from './AuditLogTab';
import UserActivityAnalysisModal from './UserActivityAnalysisModal';
import { analyzeUserActivity } from '../services/geminiService';


interface InventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  users: User[];
  roles: Role[];
  suppliers: Supplier[];
  customers: Customer[];
  purchaseOrders: PurchaseOrder[];
  user: User;
  businessSettings: BusinessSettings;
  completedOrders: CompletedOrder[];
  refundTransactions: RefundTransaction[];
  currentSession: CashDrawerSession | null;
  sessionHistory: CashDrawerSession[];
  auditLogs: AuditLog[];
  currencies: Currency[];
  onUpdateProduct: (productId: number, updates: ProductUpdatePayload) => void;
  onDeleteProduct: (productId: number) => void;
  onAddProduct: (productData: NewProductPayload) => void;
  onAddUser: (newUserData: NewUserPayload) => void;
  onUpdateUser: (userId: number, updates: UserUpdatePayload) => void;
  onUpdateUserStatus: (userId: number, status: 'active' | 'inactive') => void;
  onAddRole: (newRole: Omit<Role, 'descriptionKey'>) => void;
  onUpdateRolePermissions: (roleId: string, permissions: Permission[]) => void;
  onUpdateBusinessSettings: (settings: BusinessSettings) => void;
  onViewReceipt: (order: CompletedOrder) => void;
  onCloseDrawer: (countedCash: number) => void;
  onPayIn: (amount: number, reason: string) => void;
  onPayOut: (amount: number, reason: string) => void;
  onAddSupplier: (data: NewSupplierPayload) => void;
  onUpdateSupplier: (id: number, data: SupplierUpdatePayload) => void;
  onDeleteSupplier: (id: number) => void;
  onCreatePurchaseOrder: (orderData: { supplierId: number; supplierName: string; items: Omit<PurchaseOrderItem, 'quantityReceived'>[]; totalCost: number; }) => void;
  onReceiveStock: (purchaseOrderId: string, receivedQuantities: Record<number, number>) => void;
  onProcessRefund: (originalInvoiceId: string, itemsToRefund: { id: number; quantity: number }[], restock: boolean) => void;
  onSetCurrencies: (currencies: Currency[]) => void;
  onFetchLatestRates: () => Promise<void>;
  onAddCustomer: (data: NewCustomerPayload) => Promise<Customer>;
  onUpdateCustomer: (id: number, data: CustomerUpdatePayload) => void;
  onDeleteCustomer: (id: number) => void;
}

const LOW_STOCK_THRESHOLD = 10;

const EditPricesModal: React.FC<{
    product: Product;
    isOpen: boolean;
    onClose: () => void;
    onSave: (productId: number, updates: ProductUpdatePayload) => void;
}> = ({ product, isOpen, onClose, onSave }) => {
    const { t } = useTranslations();
    const { currencies, baseCurrencyCode } = useCurrency();
    const [prices, setPrices] = useState<Record<string, string>>({});
    const [purchasePrices, setPurchasePrices] = useState<Record<string, string>>({});

    useEffect(() => {
        if (product) {
            const salePrices: Record<string, string> = {};
            const costPrices: Record<string, string> = {};
            currencies.forEach(c => {
                if (product.price[c.code] !== undefined) salePrices[c.code] = String(product.price[c.code]);
                if (product.purchasePrice[c.code] !== undefined) costPrices[c.code] = String(product.purchasePrice[c.code]);
            });
            setPrices(salePrices);
            setPurchasePrices(costPrices);
        }
    }, [product, currencies]);

    if (!isOpen) return null;

    const handlePriceChange = (code: string, value: string, type: 'sale' | 'purchase') => {
        if (type === 'sale') {
            setPrices(prev => ({ ...prev, [code]: value }));
        } else {
            setPurchasePrices(prev => ({ ...prev, [code]: value }));
        }
    };
    
    const handleSave = () => {
        const finalPrices: { [key: string]: number } = {};
        for (const code in prices) {
            if (prices[code]) finalPrices[code] = parseFloat(prices[code]) || 0;
        }
        const finalPurchasePrices: { [key: string]: number } = {};
        for (const code in purchasePrices) {
            if (purchasePrices[code]) finalPurchasePrices[code] = parseFloat(purchasePrices[code]) || 0;
        }

        onSave(product.id, { price: finalPrices, purchasePrice: finalPurchasePrices });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Edit Prices for {product.name}</h2>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('addProductModal.salePrice')}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {currencies.map(currency => (
                                <div key={currency.code} className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">{currency.symbol}</span>
                                    <input type="number" step="0.01" value={prices[currency.code] || ''} onChange={e => handlePriceChange(currency.code, e.target.value, 'sale')} placeholder={currency.code}
                                        className={`pl-8 pr-2 py-2 w-full border rounded-md shadow-sm focus:outline-none sm:text-sm ${currency.code === baseCurrencyCode ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
                                    />
                                </div>
                            ))}
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('addProductModal.costPrice')}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {currencies.map(currency => (
                                <div key={currency.code} className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">{currency.symbol}</span>
                                    <input type="number" step="0.01" value={purchasePrices[currency.code] || ''} onChange={e => handlePriceChange(currency.code, e.target.value, 'purchase')} placeholder={currency.code}
                                        className={`pl-8 pr-2 py-2 w-full border rounded-md shadow-sm focus:outline-none sm:text-sm ${currency.code === baseCurrencyCode ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
                                    />
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('addProductModal.cancel')}</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('editUserModal.saveChanges')}</button>
                </div>
            </div>
        </div>
    )
};


const RolePermissionsEditor: React.FC<{
  role: Role;
  onUpdateRolePermissions: (roleId: string, permissions: Permission[]) => void;
}> = ({ role, onUpdateRolePermissions }) => {
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set(role.permissions));
  const { t } = useTranslations();

  useEffect(() => {
    setPermissions(new Set(role.permissions));
  }, [role]);

  const handlePermissionChange = (permission: Permission, isChecked: boolean) => {
    const newPermissions = new Set(permissions);
    if (isChecked) {
      newPermissions.add(permission);
    } else {
      newPermissions.delete(permission);
    }
    setPermissions(newPermissions);
  };

  const handleSave = () => {
    onUpdateRolePermissions(role.id, Array.from(permissions));
    alert(t('adminPanel.users.permissionsUpdated'));
  };

  const sortedCurrentPermissions = Array.from(permissions).sort();
  const sortedInitialPermissions = [...role.permissions].sort();
  const isModified = JSON.stringify(sortedCurrentPermissions) !== JSON.stringify(sortedInitialPermissions);

  const isAdminRole = role.id === 'admin';

  const roleNameTranslationKey = `roles.${role.id}`;
  const translatedRoleName = t(roleNameTranslationKey);
  const displayName = translatedRoleName === roleNameTranslationKey ? role.name : translatedRoleName;


  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-gray-800">{displayName}</h4>
        {!isAdminRole && (
          <button onClick={handleSave} disabled={!isModified} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {t('adminPanel.users.savePermissions')}
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">{t(role.descriptionKey) || role.name}</p>
      {isAdminRole && <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md mb-4">{t('adminPanel.users.adminWarning')}</p>}
      
      {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
          <div key={key} className="mb-6 last:mb-0">
              <h5 className="text-md font-semibold text-gray-600 mb-3 border-b pb-2">{t(group.labelKey)}</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {group.permissions.map(permission => (
                      <label key={permission} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50">
                          <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              checked={permissions.has(permission)}
                              onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                              disabled={isAdminRole}
                          />
                          <span className="text-sm text-gray-700">{t(`permissions.${permission}`)}</span>
                      </label>
                  ))}
              </div>
          </div>
      ))}
    </div>
  );
};

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight) {
      return <>{text}</>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 rounded-sm">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
};

const InventoryRow: React.FC<{
  product: Product;
  onUpdateProduct: (productId: number, updates: ProductUpdatePayload) => void;
  canEdit: boolean;
  highlight: string;
  onEditRequest: (product: Product) => void;
  onDeleteRequest: (product: Product) => void;
  canEditDelete: boolean;
}> = ({ product, onUpdateProduct, canEdit, highlight, onEditRequest, onDeleteRequest, canEditDelete }) => {
  const [stock, setStock] = useState(product.stock.toString());
  const [isModified, setIsModified] = useState(false);
  const { t } = useTranslations();
  const { formatCurrency, formatAmount, selectedCurrencyCode, baseCurrencyCode } = useCurrency();
  const [isPriceModalOpen, setPriceModalOpen] = useState(false);

  const stockValue = parseFloat(stock);
  const stockStatus = isNaN(stockValue) ? 'ok' : stockValue === 0 ? 'out' : stockValue <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';
  
  const stockInputClasses = useMemo(() => {
    let base = "w-20 text-center border rounded-md p-1.5 focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed";
    if (stockStatus === 'out') {
        return `${base} border-red-300 bg-red-50 text-red-600 font-bold focus:ring-red-500`;
    }
    if (stockStatus === 'low') {
        return `${base} border-orange-300 bg-orange-50 text-orange-600 font-bold focus:ring-orange-500`;
    }
    return `${base} border-gray-300 focus:ring-blue-500`;
  }, [stockStatus]);


  useEffect(() => {
     if (!canEdit) return;
     const stockChanged = Number(stock) !== product.stock;
     setIsModified(stockChanged);
  }, [stock, product, canEdit]);
  
  const handleSave = () => {
    onUpdateProduct(product.id, { stock: parseFloat(stock) });
    setIsModified(false);
  };

  const getDisplayPrice = (priceObject: { [key: string]: number }) => {
      const priceInSelected = priceObject[selectedCurrencyCode];
      const priceInBase = priceObject[baseCurrencyCode] || 0;
      
      if (priceInSelected !== undefined) {
          return formatAmount(priceInSelected, selectedCurrencyCode);
      }
      return formatCurrency(priceInBase);
  }
  
  return (
    <>
    <div className="grid grid-cols-12 gap-4 items-center py-3 px-4">
        {/* Product Info */}
        <div className="col-span-12 sm:col-span-5 md:col-span-4 flex items-center">
            <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover mr-4" />
            <div className="flex-grow">
                <p className="font-semibold text-gray-800">
                    <HighlightedText text={product.name} highlight={highlight} />
                </p>
                <p className="text-sm text-gray-500">{product.category}</p>
            </div>
        </div>
        {/* Stock */}
        <div className="col-span-4 sm:col-span-2 md:col-span-2 flex flex-col items-start sm:items-center">
            <label htmlFor={`stock-${product.id}`} className="sm:hidden text-xs font-medium text-gray-500 mb-1">{t('adminPanel.inventory.stock')}</label>
            <div className="relative">
                <input 
                    id={`stock-${product.id}`}
                    type="number"
                    step={product.sellBy === 'weight' ? "0.001" : "1"}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    disabled={!canEdit}
                    className={stockInputClasses}
                />
                 {product.sellBy === 'weight' && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>}
            </div>
        </div>
        {/* Cost Price */}
        <div className={`col-span-4 sm:col-span-2 md:col-span-2 flex-col items-start sm:items-center ${canEdit ? 'flex' : 'hidden'}`}>
            <label className="sm:hidden text-xs font-medium text-gray-500 mb-1">{t('adminPanel.inventory.costPrice')}</label>
            <button onClick={() => setPriceModalOpen(true)} disabled={!canEdit} className="text-left font-semibold text-gray-700 p-1.5 rounded-md hover:bg-gray-100 disabled:cursor-not-allowed">
                {getDisplayPrice(product.purchasePrice)}
            </button>
        </div>
        {/* Sale Price */}
        <div className="col-span-4 sm:col-span-3 md:col-span-2 flex flex-col items-start sm:items-center">
            <label className="sm:hidden text-xs font-medium text-gray-500 mb-1">{t('adminPanel.inventory.salePrice')}</label>
            <button onClick={() => setPriceModalOpen(true)} disabled={!canEdit} className="text-left font-bold text-blue-600 p-1.5 rounded-md hover:bg-blue-50 disabled:cursor-not-allowed">
               {getDisplayPrice(product.price)}
               {product.sellBy === 'weight' && <span className="text-xs font-normal text-gray-500 ml-1">/kg</span>}
            </button>
        </div>
        {/* Actions */}
        <div className="col-span-12 md:col-span-2 flex justify-end items-center space-x-2">
            {isModified && canEdit && (
                <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
                >
                    {t('adminPanel.inventory.save')}
                </button>
            )}
            {canEditDelete && (
                <div className="flex items-center">
                    <button onClick={() => onEditRequest(product)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100" title={t('adminPanel.inventory.edit')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={() => onDeleteRequest(product)} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100" title={t('adminPanel.inventory.delete')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    </div>
    <EditPricesModal isOpen={isPriceModalOpen} onClose={() => setPriceModalOpen(false)} product={product} onSave={onUpdateProduct} />
    </>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border flex items-start">
      <div className="bg-blue-100 text-blue-600 rounded-full p-3 mr-4">
          {icon}
      </div>
      <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
  </div>
);


const InventoryPanel: React.FC<InventoryPanelProps> = ({ 
    isOpen, onClose, products, user, onUpdateProduct, onDeleteProduct, onAddProduct, 
    users, roles, onAddUser, onUpdateUser, onUpdateUserStatus, onAddRole, onUpdateRolePermissions,
    suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier,
    customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer,
    purchaseOrders, onCreatePurchaseOrder, onReceiveStock,
    businessSettings, onUpdateBusinessSettings,
    completedOrders, refundTransactions, onViewReceipt, onProcessRefund,
    currentSession, sessionHistory, auditLogs, onCloseDrawer, onPayIn, onPayOut,
    currencies, onSetCurrencies, onFetchLatestRates
}) => {
  const permissions = usePermissions(user, roles);
  const { t, language, setLanguage } = useTranslations();
  const { theme, setTheme } = useTheme();
  const { formatCurrency, baseCurrencyCode } = useCurrency();
  const [manualRates, setManualRates] = useState<{ [key: string]: string }>({});
  const [isCountingMode, setIsCountingMode] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);

  // Inventory Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const inventoryStats = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice[baseCurrencyCode] || 0)), 0);
    const potentialRevenue = products.reduce((sum, p) => sum + (p.stock * (p.price[baseCurrencyCode] || 0)), 0);
    const uniqueSKUs = products.length;
    return { totalUnits, totalValue, potentialRevenue, uniqueSKUs };
  }, [products, baseCurrencyCode]);

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let tempProducts = [...products];

    // Filtering
    if (stockStatusFilter !== 'All') {
        tempProducts = tempProducts.filter(p => {
            if (stockStatusFilter === 'low') return p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD;
            if (stockStatusFilter === 'out') return p.stock === 0;
            if (stockStatusFilter === 'in') return p.stock > 0;
            return true;
        });
    }
    if (selectedCategory !== 'All') {
        tempProducts = tempProducts.filter(p => p.category === selectedCategory);
    }
    if (debouncedSearchQuery) {
        const lowerQuery = debouncedSearchQuery.toLowerCase();
        tempProducts = tempProducts.filter(p => p.name.toLowerCase().includes(lowerQuery));
    }

    // Sorting
    tempProducts.sort((a, b) => {
        const [key, direction] = sortBy.split('-');
        const asc = direction === 'asc' ? 1 : -1;
        
        switch (key) {
            case 'name':
                return a.name.localeCompare(b.name) * asc;
            case 'stock':
                return (a.stock - b.stock) * asc;
            case 'price':
                const priceA = a.price[baseCurrencyCode] || 0;
                const priceB = b.price[baseCurrencyCode] || 0;
                return (priceA - priceB) * asc;
            default:
                return 0;
        }
    });

    return tempProducts;
  }, [products, stockStatusFilter, selectedCategory, debouncedSearchQuery, sortBy, baseCurrencyCode]);


  const availableTabs = useMemo(() => {
    const tabs = [];
    if (permissions.CAN_VIEW_DASHBOARD_REPORTS) tabs.push({ id: 'dashboard', label: t('adminPanel.tabs.dashboard') });
    if (permissions.CAN_MANAGE_CASH_DRAWER) tabs.push({ id: 'cashDrawer', label: t('adminPanel.tabs.cashDrawer') });
    if (permissions.CAN_VIEW_INVENTORY) {
        tabs.push({ id: 'inventory', label: t('adminPanel.tabs.inventory') });
    }
    if (permissions.CAN_MANAGE_SUPPLIERS_AND_POs) tabs.push({ id: 'suppliers', label: t('adminPanel.tabs.suppliers') });
    if (permissions.CAN_MANAGE_CUSTOMERS) tabs.push({ id: 'customers', label: t('adminPanel.tabs.customers') });
    if (permissions.CAN_VIEW_SALES_HISTORY) tabs.push({ id: 'sales', label: t('adminPanel.tabs.salesHistory') });
    if (permissions.CAN_MANAGE_USERS_AND_ROLES) {
        tabs.push({ id: 'users', label: t('adminPanel.tabs.users') });
        tabs.push({ id: 'auditLog', label: t('adminPanel.tabs.auditLog') });
    }
    if (permissions.CAN_MANAGE_BUSINESS_SETTINGS) tabs.push({ id: 'settings', label: t('adminPanel.tabs.settings') });
    return tabs;
  }, [permissions, t]);
  
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || '');
  
  const themeOptions = [
    { id: 'default', label: t('adminPanel.settings.themes.default'), colors: { bg: 'bg-gray-100', primary: 'bg-blue-600', surface: 'bg-white' } },
    { id: 'dark', label: t('adminPanel.settings.themes.dark'), colors: { bg: 'bg-gray-900', primary: 'bg-sky-400', surface: 'bg-gray-800' } },
    { id: 'forest', label: t('adminPanel.settings.themes.forest'), colors: { bg: 'bg-green-50', primary: 'bg-green-800', surface: 'bg-white' } },
    { id: 'latte', label: t('adminPanel.settings.themes.latte'), colors: { bg: 'bg-amber-50', primary: 'bg-amber-900', surface: 'bg-white' } },
    { id: 'ios', label: t('adminPanel.settings.themes.ios'), colors: { bg: 'bg-[#F2F2F7]', primary: 'bg-[#007AFF]', surface: 'bg-white' } },
    { id: 'android', label: t('adminPanel.settings.themes.android'), colors: { bg: 'bg-[#eeeeee]', primary: 'bg-[#3F51B5]', surface: 'bg-white' } }
  ];

  useEffect(() => {
    // If the panel is opened or permissions change, default to the first available tab
    if (isOpen && availableTabs.length > 0 && !availableTabs.some(tab => tab.id === activeTab)) {
        setActiveTab(availableTabs[0].id);
    }
  }, [isOpen, availableTabs, activeTab]);

  useEffect(() => {
    if (activeTab !== 'inventory') {
        setIsCountingMode(false);
    }
  }, [activeTab]);


  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setEditUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isAddRoleModalOpen, setAddRoleModalOpen] = useState(false);
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedUser, setAnalyzedUser] = useState<User | null>(null);

  const [settings, setSettings] = useState({
    ...businessSettings,
    taxRate: businessSettings.taxRate * 100
  });

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const lowerQuery = userSearchQuery.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(lowerQuery) || u.username.toLowerCase().includes(lowerQuery);
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, userSearchQuery, userStatusFilter]);

  useEffect(() => {
    setSettings({
        ...businessSettings,
        taxRate: businessSettings.taxRate * 100
    });
  }, [businessSettings]);

  useEffect(() => {
    if (currencies) {
        const initialRates = currencies.reduce((acc, c) => {
            acc[c.code] = c.rate.toString();
            return acc;
        }, {} as { [key: string]: string });
        setManualRates(initialRates);
    }
  }, [currencies]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
        setSettings(prev => ({
          ...prev,
          [name]: name === 'taxRate' ? parseFloat(value) || 0 : value,
        }));
    }
  };
  
  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusinessSettings({
        ...settings,
        taxRate: settings.taxRate / 100
    });
    alert(t('adminPanel.settings.settingsSaved'));
  };

  const openEditUserModal = (user: User) => {
    setUserToEdit(user);
    setEditUserModalOpen(true);
  }
  
  const openDeactivateConfirmModal = (user: User) => {
    setUserToDeactivate(user);
  }
    
  const handleConfirmDeactivateUser = () => {
    if (userToDeactivate) {
        onUpdateUserStatus(userToDeactivate.id, userToDeactivate.status === 'active' ? 'inactive' : 'active');
        setUserToDeactivate(null);
    }
  }
  
  const handleAnalyzeActivity = async (userToAnalyze: User) => {
    setAnalyzedUser(userToAnalyze);
    setIsAnalyzing(true);
    setAnalysisResult('');
    setAnalysisModalOpen(true);
    try {
        const userLogs = auditLogs.filter(log => log.userId === userToAnalyze.id);
        const result = await analyzeUserActivity(userToAnalyze.name, userLogs);
        setAnalysisResult(result);
    } catch (error) {
        console.error(error);
        setAnalysisResult(t('analysisModal.error'));
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleRateInputChange = (code: string, value: string) => {
    setManualRates(prev => ({ ...prev, [code]: value }));
  };

  const handleSaveRate = (code: string) => {
    const newRate = parseFloat(manualRates[code]);
    if (isNaN(newRate) || newRate < 0) {
        alert('Please enter a valid, non-negative rate.');
        // Revert to original value
        const originalRate = currencies.find(c => c.code === code)?.rate.toString() || '0';
        setManualRates(prev => ({ ...prev, [code]: originalRate }));
        return;
    }

    const updatedCurrencies = currencies.map(c =>
        c.code === code ? { ...c, rate: newRate } : c
    );
    onSetCurrencies(updatedCurrencies);
    alert(`Rate for ${code} updated successfully.`);
  };

  const handleFetchRates = async () => {
    setIsFetchingRates(true);
    await onFetchLatestRates();
    setIsFetchingRates(false);
  };


  return (
     <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`fixed top-0 right-0 h-full w-full sm:max-w-5xl bg-gray-50 shadow-2xl transform transition-transform z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-panel-title"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center bg-white">
            <h3 id="inventory-panel-title" className="text-xl font-bold text-gray-800">{t('adminPanel.title')}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-full text-2xl leading-none" aria-label="Close inventory panel">&times;</button>
          </div>
          
          <div className="border-b border-gray-200 bg-white">
              <nav className="-mb-px flex space-x-6 px-4 overflow-x-auto hide-scrollbar" aria-label="Tabs">
                  {availableTabs.map(tab => (
                       <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        {tab.label}
                      </button>
                  ))}
              </nav>
          </div>

          {activeTab === 'dashboard' && permissions.CAN_VIEW_DASHBOARD_REPORTS && (
            <DashboardTab completedOrders={completedOrders} products={products} permissions={permissions} />
          )}

          {activeTab === 'cashDrawer' && permissions.CAN_MANAGE_CASH_DRAWER && (
            <CashDrawerTab
              currentSession={currentSession}
              sessionHistory={sessionHistory}
              onCloseDrawer={onCloseDrawer}
              onPayIn={onPayIn}
              onPayOut={onPayOut}
            />
          )}

          {activeTab === 'inventory' && permissions.CAN_VIEW_INVENTORY && (
            isCountingMode ? (
              <InventoryCountTab 
                products={products} 
                onUpdateProduct={onUpdateProduct} 
                onExit={() => setIsCountingMode(false)}
              />
            ) : (
                <div className="flex-grow flex flex-col overflow-hidden">
                    {/* Stats */}
                    <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 border-b">
                        {permissions.CAN_MANAGE_INVENTORY_STOCK_PRICES && (
                             <StatCard title={t('adminPanel.inventory.totalValue')} value={formatCurrency(inventoryStats.totalValue)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
                        )}
                        {permissions.CAN_MANAGE_INVENTORY_STOCK_PRICES && (
                            <StatCard title={t('adminPanel.inventory.potentialRevenue')} value={formatCurrency(inventoryStats.potentialRevenue)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
                        )}
                        <StatCard title={t('adminPanel.inventory.totalSKUs')} value={inventoryStats.uniqueSKUs} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
                        <StatCard title={t('adminPanel.inventory.totalUnits')} value={inventoryStats.totalUnits.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} />
                    </div>

                    {/* Controls */}
                    <div className="p-4 bg-white border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="relative flex-grow">
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('adminPanel.inventory.searchPlaceholder')} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-full" />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="border-gray-300 rounded-md shadow-sm">
                                {categories.map(c => <option key={c} value={c}>{c === 'All' ? t('adminPanel.inventory.allCategories') : c}</option>)}
                            </select>
                            <div className="flex rounded-md shadow-sm">
                                <button onClick={() => setStockStatusFilter('All')} className={`px-3 py-1.5 border border-gray-300 text-sm rounded-l-md ${stockStatusFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-white'}`}>{t('adminPanel.inventory.stockStatus.all')}</button>
                                <button onClick={() => setStockStatusFilter('in')} className={`px-3 py-1.5 border-t border-b border-gray-300 text-sm ${stockStatusFilter === 'in' ? 'bg-blue-600 text-white' : 'bg-white'}`}>{t('adminPanel.inventory.stockStatus.inStock')}</button>
                                <button onClick={() => setStockStatusFilter('low')} className={`px-3 py-1.5 border border-gray-300 text-sm ${stockStatusFilter === 'low' ? 'bg-blue-600 text-white' : 'bg-white'}`}>{t('adminPanel.inventory.stockStatus.lowStock')}</button>
                                <button onClick={() => setStockStatusFilter('out')} className={`px-3 py-1.5 border border-gray-300 text-sm rounded-r-md ${stockStatusFilter === 'out' ? 'bg-blue-600 text-white' : 'bg-white'}`}>{t('adminPanel.inventory.stockStatus.outOfStock')}</button>
                            </div>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border-gray-300 rounded-md shadow-sm">
                                <option value="name-asc">{t('adminPanel.inventory.sortBy.nameAsc')}</option>
                                <option value="name-desc">{t('adminPanel.inventory.sortBy.nameDesc')}</option>
                                <option value="stock-desc">{t('adminPanel.inventory.sortBy.stockDesc')}</option>
                                <option value="stock-asc">{t('adminPanel.inventory.sortBy.stockAsc')}</option>
                                <option value="price-desc">{t('adminPanel.inventory.sortBy.priceDesc')}</option>
                                <option value="price-asc">{t('adminPanel.inventory.sortBy.priceAsc')}</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                          {permissions.CAN_PERFORM_STOCK_COUNT && (
                            <button onClick={() => setIsCountingMode(true)} className="p-2 text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50" title={t('adminPanel.inventory.startCount')}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            </button>
                          )}
                          {permissions.CAN_ADD_PRODUCTS && (
                            <button onClick={() => setAddProductModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
                                <span className="hidden sm:inline">{t('adminPanel.inventory.addProduct')}</span>
                            </button>
                          )}
                        </div>
                    </div>
                    
                    {/* Inventory List */}
                    <div className="flex-grow overflow-y-auto bg-white">
                        {/* List Header */}
                        <div className="grid-cols-12 gap-4 px-4 py-2 font-semibold text-xs text-gray-500 border-b bg-gray-50 sticky top-0 hidden sm:grid">
                            <div className="col-span-5 md:col-span-4">{t('adminPanel.inventory.product')}</div>
                            <div className="col-span-2 md:col-span-2 text-center">{t('adminPanel.inventory.stock')}</div>
                            {permissions.CAN_MANAGE_INVENTORY_STOCK_PRICES && <div className="col-span-2 md:col-span-2 text-center">{t('adminPanel.inventory.costPrice')}</div>}
                            <div className="col-span-3 md:col-span-2 text-center">{t('adminPanel.inventory.salePrice')}</div>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {filteredAndSortedProducts.map((product) => (
                                <InventoryRow 
                                  key={product.id} 
                                  product={product} 
                                  onUpdateProduct={onUpdateProduct} 
                                  canEdit={permissions.CAN_MANAGE_INVENTORY_STOCK_PRICES} 
                                  highlight={debouncedSearchQuery}
                                  onEditRequest={setProductToEdit}
                                  onDeleteRequest={setProductToDelete}
                                  canEditDelete={permissions.CAN_EDIT_DELETE_PRODUCTS}
                                />
                            ))}
                        </div>
                        {filteredAndSortedProducts.length === 0 && (
                            <div className="text-center py-16 text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <p className="mt-4 font-semibold">{t('productGrid.noProductsFound')}</p>
                                <p className="text-sm">{t('productGrid.noProductsMessage')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )
          )}
          
          {activeTab === 'suppliers' && permissions.CAN_MANAGE_SUPPLIERS_AND_POs && (
            <SuppliersTab 
                suppliers={suppliers}
                products={products}
                purchaseOrders={purchaseOrders}
                onAddSupplier={onAddSupplier}
                onUpdateSupplier={onUpdateSupplier}
                onDeleteSupplier={onDeleteSupplier}
                onCreatePurchaseOrder={onCreatePurchaseOrder}
                onReceiveStock={onReceiveStock}
            />
          )}

          {activeTab === 'customers' && permissions.CAN_MANAGE_CUSTOMERS && (
            <CustomersTab
              customers={customers}
              onAddCustomer={onAddCustomer}
              onUpdateCustomer={onUpdateCustomer}
              onDeleteCustomer={onDeleteCustomer}
              completedOrders={completedOrders}
              onViewReceipt={onViewReceipt}
            />
          )}

          {activeTab === 'sales' && permissions.CAN_VIEW_SALES_HISTORY && (
            <SalesHistoryTab
              orders={completedOrders}
              users={users}
              refundTransactions={refundTransactions}
              onViewReceipt={onViewReceipt}
              onProcessRefund={onProcessRefund}
            />
          )}

          {activeTab === 'users' && permissions.CAN_MANAGE_USERS_AND_ROLES && (
             <div className="flex-grow overflow-y-auto p-6 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Users Column */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{t('adminPanel.users.users')}</h3>
                            <button 
                                onClick={() => setAddUserModalOpen(true)}
                                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>
                                <span>{t('adminPanel.users.addUser')}</span>
                            </button>
                        </div>
                        <div className="flex gap-4 mb-4">
                          <input
                              type="text"
                              placeholder={t('adminPanel.users.searchPlaceholder')}
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                           <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value as any)} className="border-gray-300 rounded-md shadow-sm">
                                <option value="all">{t('adminPanel.users.status.all')}</option>
                                <option value="active">{t('adminPanel.users.status.active')}</option>
                                <option value="inactive">{t('adminPanel.users.status.inactive')}</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            {filteredUsers.map((u) => (
                                <div key={u.id} className="bg-white rounded-lg shadow-sm border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <img src={u.avatarUrl} alt={u.name} className="w-12 h-12 rounded-full mr-4" />
                                            <div>
                                                <h4 className="font-bold text-gray-800">{u.name}</h4>
                                                <p className="text-sm text-gray-500">@{u.username}</p>
                                                <p className="text-xs text-gray-400 mt-1">{t('adminPanel.users.lastLogin')}: {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.roleId === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {roles.find(r => r.id === u.roleId)?.name || u.roleId}
                                            </span>
                                             <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {t(`adminPanel.users.status.${u.status}`)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                                        <button onClick={() => handleAnalyzeActivity(u)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900" title={t('adminPanel.users.analyzeActivity')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg></button>
                                        <button onClick={() => openEditUserModal(u)} className="text-sm font-medium text-blue-600 hover:text-blue-900">{t('adminPanel.users.edit')}</button>
                                        <button onClick={() => openDeactivateConfirmModal(u)} disabled={user.id === u.id} className="text-sm font-medium text-red-600 hover:text-red-900 disabled:text-gray-300 disabled:cursor-not-allowed">
                                            {u.status === 'active' ? t('adminPanel.users.deactivate') : t('adminPanel.users.activate')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Roles Column */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{t('adminPanel.users.rolePermissions')}</h3>
                             <button 
                                onClick={() => setAddRoleModalOpen(true)}
                                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
                            >
                                <span>{t('adminPanel.users.addRole')}</span>
                            </button>
                        </div>
                        {roles.map(role => (
                            <RolePermissionsEditor 
                                key={role.id} 
                                role={role} 
                                onUpdateRolePermissions={onUpdateRolePermissions} 
                            />
                        ))}
                    </div>
                </div>
            </div>
          )}
          
          {activeTab === 'auditLog' && permissions.CAN_MANAGE_USERS_AND_ROLES && (
            <AuditLogTab auditLogs={auditLogs} users={users} />
          )}

           {activeTab === 'settings' && permissions.CAN_MANAGE_BUSINESS_SETTINGS && (
                <div className="flex-grow overflow-y-auto p-6 bg-gray-50">
                    <form onSubmit={handleSettingsSave} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
                        <div>
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">{t('adminPanel.settings.businessInfo')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.businessName')}</label>
                                    <input type="text" name="businessName" id="businessName" value={settings.businessName} onChange={handleSettingsChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.taxRate')}</label>
                                    <div className="relative mt-1">
                                        <input type="number" name="taxRate" id="taxRate" step="0.01" value={settings.taxRate} onChange={handleSettingsChange} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-8 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.phone')}</label>
                                    <input type="text" name="phone" id="phone" value={settings.phone} onChange={handleSettingsChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.taxId')}</label>
                                    <input type="text" name="taxId" id="taxId" value={settings.taxId} onChange={handleSettingsChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.address')}</label>
                                    <input type="text" name="address" id="address" value={settings.address} onChange={handleSettingsChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">{t('adminPanel.settings.receiptCustomization')}</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.logoUrl')}</label>
                                    <div className="flex items-center space-x-4 mt-1">
                                      <input type="text" name="logoUrl" id="logoUrl" value={settings.logoUrl || ''} onChange={handleSettingsChange} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder={t('adminPanel.settings.logoUrlPlaceholder')} />
                                      {settings.logoUrl && <img src={settings.logoUrl} alt="Logo Preview" className="h-10 w-auto bg-gray-100 p-1 rounded-md border" />}
                                    </div>
                                </div>
                                <div>
                                  <label htmlFor="receiptHeaderText" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.receiptHeaderText')}</label>
                                  <textarea name="receiptHeaderText" id="receiptHeaderText" value={settings.receiptHeaderText || ''} onChange={handleSettingsChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                                <div>
                                  <label htmlFor="receiptFooterText" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.receiptFooterText')}</label>
                                  <textarea name="receiptFooterText" id="receiptFooterText" value={settings.receiptFooterText || ''} onChange={handleSettingsChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                    <p className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.showOnReceipt')}</p>
                                    <div className="mt-2 space-y-2">
                                        <label className="flex items-center">
                                            <input type="checkbox" name="receiptShowAddress" checked={settings.receiptShowAddress || false} onChange={handleSettingsChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                            <span className="ml-2 text-sm text-gray-700">{t('adminPanel.settings.showAddress')}</span>
                                        </label>
                                         <label className="flex items-center">
                                            <input type="checkbox" name="receiptShowPhone" checked={settings.receiptShowPhone || false} onChange={handleSettingsChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                            <span className="ml-2 text-sm text-gray-700">{t('adminPanel.settings.showPhone')}</span>
                                        </label>
                                         <label className="flex items-center">
                                            <input type="checkbox" name="receiptShowTaxId" checked={settings.receiptShowTaxId || false} onChange={handleSettingsChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                            <span className="ml-2 text-sm text-gray-700">{t('adminPanel.settings.showTaxId')}</span>
                                        </label>
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="border-t pt-6">
                             <h4 className="text-lg font-semibold text-gray-800 mb-4">{t('adminPanel.settings.localization')}</h4>
                             <div className="max-w-xs">
                                <label htmlFor="language-select" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.languageLabel')}</label>
                                <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'es')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                </select>
                             </div>
                        </div>
                        
                        <div className="border-t pt-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">{t('adminPanel.settings.appearance')}</h4>
                            <p className="text-sm text-gray-500 mb-4">{t('adminPanel.settings.themeDescription')}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {themeOptions.map((themeOption) => (
                                    <div key={themeOption.id} onClick={() => setTheme(themeOption.id as any)} className={`cursor-pointer border-2 rounded-lg p-2 text-center transition-all ${theme === themeOption.id ? 'border-primary ring-2 ring-primary' : 'border-gray-300 hover:border-primary/50'}`}>
                                        <div className="flex justify-center space-x-1 mb-2 rounded-md p-2 bg-gray-100">
                                            <div className={`w-6 h-6 rounded-full ${themeOption.colors.bg}`}></div>
                                            <div className={`w-6 h-6 rounded-full ${themeOption.colors.primary}`}></div>
                                            <div className={`w-6 h-6 rounded-full ${themeOption.colors.surface} border`}></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{themeOption.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">{t('adminPanel.settings.currencySettings')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="baseCurrency" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.baseCurrency')}</label>
                                    <select id="baseCurrency" name="currency" value={settings.currency} onChange={handleSettingsChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">{t('adminPanel.settings.baseCurrencyDesc')}</p>
                                </div>
                                <div>
                                    <label htmlFor="defaultDisplayCurrency" className="block text-sm font-medium text-gray-700">{t('adminPanel.settings.defaultDisplayCurrency')}</label>
                                    <select
                                        id="defaultDisplayCurrency"
                                        name="defaultDisplayCurrency"
                                        value={settings.defaultDisplayCurrency || settings.currency}
                                        onChange={handleSettingsChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">{t('adminPanel.settings.defaultDisplayCurrencyDesc')}</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h5 className="text-md font-medium text-gray-700">{t('adminPanel.settings.exchangeRatesTitle')} {settings.currency}</h5>
                                        {settings.currencyRatesLastUpdated && (
                                            <p className="text-xs text-gray-500">
                                                {t('adminPanel.settings.lastUpdated')}: {new Date(settings.currencyRatesLastUpdated).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleFetchRates}
                                        disabled={isFetchingRates}
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
                                    >
                                        {isFetchingRates ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                {t('adminPanel.settings.fetchingRates')}
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5" /></svg>
                                                {t('adminPanel.settings.fetchLatestRates')}
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-md border max-h-48 overflow-y-auto mt-2">
                                    <ul className="divide-y divide-gray-200">
                                        {currencies.map(c => {
                                            const isBaseCurrency = c.code === settings.currency;
                                            const originalRate = c.rate;
                                            const manualRate = manualRates[c.code];
                                            const isModified = manualRate !== undefined && parseFloat(manualRate) !== originalRate;

                                            return (
                                                <li key={c.code} className="py-3 flex justify-between items-center text-sm">
                                                    <span className="font-medium text-gray-800 w-1/3 truncate" title={`${c.name} (${c.code})`}>{c.name} ({c.code})</span>
                                                    {isBaseCurrency ? (
                                                        <span className="font-mono text-gray-800 font-bold pr-4">
                                                            1.0000 ({t('adminPanel.settings.base')})
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-gray-500">1 {settings.currency} =</span>
                                                            <input
                                                                type="number"
                                                                step="0.0001"
                                                                value={manualRate || ''}
                                                                onChange={(e) => handleRateInputChange(c.code, e.target.value)}
                                                                className="w-28 text-right border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                                aria-label={`Rate for ${c.name}`}
                                                            />
                                                            <span className="text-gray-500 w-12">{c.code}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveRate(c.code)}
                                                                disabled={!isModified}
                                                                className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                            >
                                                                {t('adminPanel.inventory.save')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-6 border-t">
                            <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                {t('adminPanel.settings.save')}
                            </button>
                        </div>
                    </form>
                </div>
            )}


        </div>
      </div>
      {permissions.CAN_ADD_PRODUCTS && (
        <AddProductModal 
            isOpen={isAddProductModalOpen}
            onClose={() => setAddProductModalOpen(false)}
            onAddProduct={onAddProduct}
            businessSettings={businessSettings}
        />
      )}
      {productToEdit && permissions.CAN_EDIT_DELETE_PRODUCTS && (
        <EditProductModal
            isOpen={!!productToEdit}
            onClose={() => setProductToEdit(null)}
            product={productToEdit}
            onSave={onUpdateProduct}
        />
      )}
       {permissions.CAN_MANAGE_USERS_AND_ROLES && (
        <>
            <AddUserModal
              isOpen={isAddUserModalOpen}
              onClose={() => setAddUserModalOpen(false)}
              onAddUser={onAddUser}
              roles={roles}
            />
            {userToEdit && (
               <EditUserModal
                  isOpen={isEditUserModalOpen}
                  onClose={() => { setEditUserModalOpen(false); setUserToEdit(null); }}
                  userToEdit={userToEdit}
                  onUpdateUser={onUpdateUser}
                  roles={roles}
               />
            )}
             <AddRoleModal 
                isOpen={isAddRoleModalOpen}
                onClose={() => setAddRoleModalOpen(false)}
                onAddRole={onAddRole}
             />
             <UserActivityAnalysisModal
                isOpen={isAnalysisModalOpen}
                onClose={() => setAnalysisModalOpen(false)}
                isLoading={isAnalyzing}
                analysisText={analysisResult}
                userName={analyzedUser?.name || ''}
             />
        </>
       )}
       <ConfirmationModal
        isOpen={!!userToDeactivate}
        onClose={() => setUserToDeactivate(null)}
        onConfirm={handleConfirmDeactivateUser}
        title={userToDeactivate?.status === 'active' ? t('adminPanel.users.confirmDeactivateTitle') : t('adminPanel.users.confirmActivateTitle')}
        message={
            <p>
                {userToDeactivate?.status === 'active' ? t('adminPanel.users.confirmDeactivateMessage') : t('adminPanel.users.confirmActivateMessage')} <strong className="text-text-primary">{userToDeactivate?.name}</strong>?
            </p>
        }
        confirmText={userToDeactivate?.status === 'active' ? t('adminPanel.users.deactivate') : t('adminPanel.users.activate')}
      />
      <ConfirmationModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
            if (productToDelete) {
                onDeleteProduct(productToDelete.id);
                setProductToDelete(null);
            }
        }}
        title={t('adminPanel.inventory.confirmDeleteTitle')}
        message={
            <p>
                {t('adminPanel.inventory.confirmDeleteMessage')}{' '}
                <strong className="text-text-primary">{productToDelete?.name}</strong>?
            </p>
        }
        confirmText={t('adminPanel.inventory.delete')}
      />
    </>
  );
};

export default InventoryPanel;