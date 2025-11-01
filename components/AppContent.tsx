import React, { useMemo, useState, useEffect } from 'react';
import type { OrderItem, Product, ProductUpdatePayload, NewProductPayload, User, NewUserPayload, UserUpdatePayload, CompletedOrder, PaymentMethod, BusinessSettings, CashDrawerSession, Supplier, NewSupplierPayload, SupplierUpdatePayload, PurchaseOrder, PurchaseOrderItem, Role, Permission, RefundTransaction, AuditLog, ParkedOrder, Customer, NewCustomerPayload, CustomerUpdatePayload } from '../types';
import type { Currency } from '../currencies';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

import Header from './Header';
import ProductGrid from './ProductGrid';
import OrderSummary from './OrderSummary';
import CheckoutModal from './CheckoutModal';
import ReceiptModal from './ReceiptModal';
import InventoryPanel from './InventoryPanel';
import LoginScreen from './LoginScreen';
import PinModal from './PinModal';
import OpenDrawerModal from './OpenDrawerModal';
import WeightInputModal from './WeightInputModal';
import SelectCustomerModal from './SelectCustomerModal';

interface AppContentProps {
    currentUser: User | null;
    users: User[];
    roles: Role[];
    suppliers: Supplier[];
    customers: Customer[];
    purchaseOrders: PurchaseOrder[];
    orderItems: OrderItem[];
    products: Product[];
    parkedOrders: ParkedOrder[];
    isCheckoutModalOpen: boolean;
    isAdminPanelOpen: boolean;
    completedOrders: CompletedOrder[];
    refundTransactions: RefundTransaction[];
    viewingReceipt: CompletedOrder | null;
    businessSettings: BusinessSettings;
    currentSession: CashDrawerSession | null;
    sessionHistory: CashDrawerSession[];
    currencies: Currency[];
    auditLogs: AuditLog[];
    isOrderSummaryOpen: boolean;
    productToWeigh: Product | null;
    isDrawerModalOpen: boolean;
    setDrawerModalOpen: (isOpen: boolean) => void;
    pinEntryUser: User | null;
    pinError: string;
    discount: number;
    tip: number;
    selectedCustomerForOrder: Customer | null;
    isSelectCustomerModalOpen: boolean;
    setSelectCustomerModalOpen: (isOpen: boolean) => void;
    onSetCustomerForOrder: (customer: Customer | null) => void;
    setDiscount: (discount: number) => void;
    setTip: (tip: number) => void;
    onPinSubmit: (password: string) => void;
    setPinEntryUser: (user: User | null) => void;
    setIsPinModalOpen: (isOpen: boolean) => void;
    setPinError: (error: string) => void;
    onLockSession: () => void;
    onOpenAdminPanel: () => void;
    onCloseAdminPanel: () => void;
    addToOrder: (product: Product, quantity?: number) => void;
    updateQuantity: (productId: number, newQuantity: number) => void;
    removeFromOrder: (productId: number) => void;
    clearOrder: () => void;
    setCheckoutModalOpen: (isOpen: boolean) => void;
    handlePaymentSuccess: (paymentMethod: PaymentMethod) => void;
    setViewingReceipt: (order: CompletedOrder | null) => void;
    setProductToWeigh: (product: Product | null) => void;
    handleWeightEntered: (product: Product, weight: number) => void;
    handleOpenDrawer: (startingCash: number) => void;
    setOrderSummaryOpen: (isOpen: boolean) => void;
    onUpdateProduct: (productId: number, updates: ProductUpdatePayload) => void;
    onDeleteProduct: (productId: number) => void;
    onAddProduct: (productData: NewProductPayload) => void;
    onAddUser: (newUserData: NewUserPayload) => void;
    onUpdateUser: (userId: number, updates: UserUpdatePayload) => void;
    onUpdateUserStatus: (userId: number, status: 'active' | 'inactive') => void;
    onDeleteUser: (userId: number) => void;
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
    onParkSale: () => void;
    onUnparkSale: (id: string) => void;
    onAddCustomer: (data: NewCustomerPayload) => Promise<Customer>;
    onUpdateCustomer: (id: number, data: CustomerUpdatePayload) => void;
    onDeleteCustomer: (id: number) => void;
}


const AppContent: React.FC<AppContentProps> = ({
    currentUser, users, roles, suppliers, customers, purchaseOrders, orderItems, products, parkedOrders,
    isCheckoutModalOpen, isAdminPanelOpen, completedOrders, refundTransactions,
    viewingReceipt, businessSettings, currentSession, sessionHistory, currencies,
    auditLogs, isOrderSummaryOpen, productToWeigh, isDrawerModalOpen, setDrawerModalOpen,
    pinEntryUser, pinError, onPinSubmit, setPinEntryUser, setIsPinModalOpen, setPinError, onLockSession, 
    onOpenAdminPanel, onCloseAdminPanel, addToOrder, updateQuantity, removeFromOrder, 
    clearOrder, setCheckoutModalOpen, handlePaymentSuccess, setViewingReceipt, setProductToWeigh, 
    handleWeightEntered, handleOpenDrawer, setOrderSummaryOpen, onUpdateProduct, onDeleteProduct,
    onAddProduct, onAddUser, onUpdateUser, onUpdateUserStatus, onDeleteUser, onAddRole, onUpdateRolePermissions,
    onUpdateBusinessSettings, onViewReceipt, onCloseDrawer, onPayIn, onPayOut,
    onAddSupplier, onUpdateSupplier, onDeleteSupplier, onCreatePurchaseOrder, onReceiveStock,
    onProcessRefund, onSetCurrencies, onFetchLatestRates, onParkSale, onUnparkSale,
    onAddCustomer, onUpdateCustomer, onDeleteCustomer, discount, tip, setDiscount, setTip,
    selectedCustomerForOrder, isSelectCustomerModalOpen, setSelectCustomerModalOpen, onSetCustomerForOrder
}) => {
    const { formatCurrency } = useCurrency();
    const { t } = useTranslations();
    
    // FIX: Moved searchQuery state declaration before its usage in useEffect.
    const [searchQuery, setSearchQuery] = useState('');

    const orderTotal = useMemo(() => {
        if (!businessSettings) return 0;
        const baseCurrency = businessSettings.currency;
        const subtotal = orderItems.reduce((sum, item) => sum + (item.price[baseCurrency] || 0) * item.quantity, 0);
        const subtotalAfterDiscount = subtotal - discount;
        const tax = subtotalAfterDiscount * businessSettings.taxRate;
        return subtotalAfterDiscount + tax + tip;
    }, [orderItems, businessSettings, discount, tip]);
    
    const handleSelectUser = (user: User) => {
        setPinEntryUser(user);
        setIsPinModalOpen(true);
    };

    const handleClosePinModal = () => {
        setIsPinModalOpen(false);
        setPinEntryUser(null);
        setPinError('');
    };

    useEffect(() => {
        const handleKeyDown = async (event: KeyboardEvent) => {
            // Simple barcode scanner detection: fast numeric input ending with Enter
            // In a real scenario, this would be more robust (e.g., checking timing, prefixes/suffixes)
            if (event.key === 'Enter' && /^\d{5,}$/.test(searchQuery)) {
                try {
                    const product = await (await fetch(`/api/products/by-barcode?code=${searchQuery}`)).json();
                    if (product && !product.error) {
                       addToOrder(product);
                    }
                } catch (error) {
                    console.warn(`No product found for barcode: ${searchQuery}`);
                }
                setSearchQuery('');
            } else if (event.key.length === 1 && !isNaN(parseInt(event.key))) {
                setSearchQuery(prev => prev + event.key);
            } else if (event.key === 'Backspace') {
                setSearchQuery(prev => prev.slice(0, -1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [searchQuery, addToOrder]);




    if (!currentUser) {
        return (
            <>
                <LoginScreen users={users} onSelectUser={handleSelectUser} />
                <PinModal
                    user={pinEntryUser}
                    onClose={handleClosePinModal}
                    onPinSubmit={onPinSubmit}
                    error={pinError}
                />
            </>
        );
    }
    
    const isLocked = !currentSession || currentSession.status !== 'open';

    return (
        <div className="flex flex-col h-screen font-sans text-text-primary bg-background">
            <Header 
              user={currentUser}
              roles={roles}
              cashDrawerSession={currentSession}
              parkedOrders={parkedOrders}
              onOpenAdminPanel={onOpenAdminPanel}
              onLockSession={onLockSession}
              onUnparkSale={onUnparkSale}
            />
            <main className="grid flex-grow grid-cols-1 md:grid-cols-3 lg:grid-cols-4 overflow-hidden relative">
            {isLocked && currentUser && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-20 flex items-center justify-center p-4">
                    <div className="text-center p-8 bg-surface rounded-lg shadow-2xl">
                        <h2 className="text-2xl font-bold text-text-primary">{t('app.drawerClosedTitle')}</h2>
                        <p className="text-text-secondary mt-2">{t('app.drawerClosedMessage')}</p>
                        <button 
                            onClick={() => setDrawerModalOpen(true)}
                            className="mt-6 px-6 py-3 bg-primary text-text-on-primary font-bold rounded-lg hover:bg-primary-hover transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/30"
                        >
                            {t('openDrawerModal.title')}
                        </button>
                    </div>
                </div>
            )}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
                <ProductGrid products={products} onAddToOrder={addToOrder} isLocked={isLocked} />
            </div>
            
            <div className="col-span-1 h-full flex-col hidden md:flex">
                <OrderSummary
                  items={orderItems}
                  user={currentUser}
                  roles={roles}
                  taxRate={businessSettings.taxRate}
                  isLocked={isLocked}
                  selectedCustomer={selectedCustomerForOrder}
                  onAddCustomerClick={() => setSelectCustomerModalOpen(true)}
                  onRemoveCustomerClick={() => onSetCustomerForOrder(null)}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeFromOrder}
                  onClearOrder={clearOrder}
                  onCheckout={() => setCheckoutModalOpen(true)}
                  onParkSale={onParkSale}
                  discount={discount}
                  tip={tip}
                  onApplyDiscount={setDiscount}
                />
            </div>
            </main>

            {orderItems.length > 0 && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 p-4 bg-surface/90 backdrop-blur-sm border-t border-border">
                    <button
                        onClick={() => setOrderSummaryOpen(true)}
                        className="w-full flex items-center justify-between bg-primary text-text-on-primary font-bold px-5 py-3 rounded-lg shadow-xl hover:bg-primary-hover transition-transform transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center space-x-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="text-sm">{orderItems.length} {orderItems.length === 1 ? t('adminPanel.salesHistory.item') : t('adminPanel.salesHistory.items')}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-base">{formatCurrency(orderTotal)}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </button>
                </div>
            )}
            
            {isOrderSummaryOpen && (
                <div className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setOrderSummaryOpen(false)}></div>
            )}
            <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${isOrderSummaryOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '85vh' }}>
                <OrderSummary
                  items={orderItems}
                  user={currentUser}
                  roles={roles}
                  taxRate={businessSettings.taxRate}
                  isLocked={isLocked}
                  selectedCustomer={selectedCustomerForOrder}
                  onAddCustomerClick={() => setSelectCustomerModalOpen(true)}
                  onRemoveCustomerClick={() => onSetCustomerForOrder(null)}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeFromOrder}
                  onClearOrder={clearOrder}
                  onCheckout={() => {
                      setOrderSummaryOpen(false);
                      setCheckoutModalOpen(true);
                  }}
                  onParkSale={onParkSale}
                  discount={discount}
                  tip={tip}
                  onApplyDiscount={setDiscount}
                  isMobileView={true}
                  onClose={() => setOrderSummaryOpen(false)}
                />
            </div>
            
            <OpenDrawerModal 
              isOpen={isDrawerModalOpen}
              onOpenDrawer={handleOpenDrawer}
              onClose={() => setDrawerModalOpen(false)}
            />

            <SelectCustomerModal
                isOpen={isSelectCustomerModalOpen}
                onClose={() => setSelectCustomerModalOpen(false)}
                customers={customers}
                onSelectCustomer={onSetCustomerForOrder}
                onAddCustomer={onAddCustomer}
            />

            <CheckoutModal
              isOpen={isCheckoutModalOpen}
              onClose={() => setCheckoutModalOpen(false)}
              orderItems={orderItems}
              taxRate={businessSettings.taxRate}
              discount={discount}
              tip={tip}
              onTipChange={setTip}
              onPaymentSuccess={handlePaymentSuccess}
            />
            
            {productToWeigh && (
                <WeightInputModal
                    isOpen={!!productToWeigh}
                    onClose={() => setProductToWeigh(null)}
                    product={productToWeigh}
                    onConfirm={handleWeightEntered}
                    currentWeight={orderItems.find(item => item.id === productToWeigh.id)?.quantity}
                />
            )}

            {viewingReceipt && (
            <ReceiptModal
                isOpen={!!viewingReceipt}
                onClose={() => setViewingReceipt(null)}
                order={viewingReceipt}
                businessSettings={businessSettings}
            />
            )}
            
            <InventoryPanel
              isOpen={isAdminPanelOpen}
              onClose={onCloseAdminPanel}
              products={products}
              users={users}
              roles={roles}
              suppliers={suppliers}
              customers={customers}
              purchaseOrders={purchaseOrders}
              user={currentUser}
              businessSettings={businessSettings}
              completedOrders={completedOrders}
              refundTransactions={refundTransactions}
              currentSession={currentSession}
              sessionHistory={sessionHistory}
              auditLogs={auditLogs}
              currencies={currencies}
              onUpdateProduct={onUpdateProduct}
              onDeleteProduct={onDeleteProduct}
              onAddProduct={onAddProduct}
              onAddUser={onAddUser}
              onUpdateUser={onUpdateUser}
              onUpdateUserStatus={onUpdateUserStatus}
              onDeleteUser={onDeleteUser}
              onAddRole={onAddRole}
              onUpdateRolePermissions={onUpdateRolePermissions}
              onUpdateBusinessSettings={onUpdateBusinessSettings}
              onViewReceipt={onViewReceipt}
              onCloseDrawer={onCloseDrawer}
              onPayIn={onPayIn}
              onPayOut={onPayOut}
              onAddSupplier={onAddSupplier}
              onUpdateSupplier={onUpdateSupplier}
              onDeleteSupplier={onDeleteSupplier}
              onCreatePurchaseOrder={onCreatePurchaseOrder}
              onReceiveStock={onReceiveStock}
              onProcessRefund={onProcessRefund}
              onSetCurrencies={onSetCurrencies}
              onFetchLatestRates={onFetchLatestRates}
              onAddCustomer={onAddCustomer}
              onUpdateCustomer={onUpdateCustomer}
              onDeleteCustomer={onDeleteCustomer}
            />
        </div>
        );
};

export default AppContent;
