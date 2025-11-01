import React, { useState, useCallback, useEffect } from 'react';
import type { OrderItem, Product, ProductUpdatePayload, NewProductPayload, User, NewUserPayload, UserUpdatePayload, CompletedOrder, PaymentMethod, BusinessSettings, CashDrawerSession, CashDrawerActivity, Supplier, NewSupplierPayload, SupplierUpdatePayload, PurchaseOrder, PurchaseOrderItem, Role, Permission, RefundTransaction, AuditLog, ParkedOrder, Customer, NewCustomerPayload, CustomerUpdatePayload, ThemeName } from './types';
import { CURRENCIES as INITIAL_CURRENCIES } from './currencies';
import type { Currency } from './currencies';
import { LanguageProvider, useTranslations } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import AppContent from './components/AppContent';
import * as api from './services/apiService';

const MAX_LOGIN_ATTEMPTS = 5;

const App: React.FC = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
  const [refundTransactions, setRefundTransactions] = useState<RefundTransaction[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [sessionHistory, setSessionHistory] = useState<CashDrawerSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([]);
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<CompletedOrder | null>(null);
  const [currentSession, setCurrentSession] = useState<CashDrawerSession | null>(null);
  const [isDrawerModalOpen, setDrawerModalOpen] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>(INITIAL_CURRENCIES);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState<Record<string, number>>({});
  const [isOrderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [productToWeigh, setProductToWeigh] = useState<Product | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinEntryUser, setPinEntryUser] = useState<User | null>(null);
  const [pinError, setPinError] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<Customer | null>(null);
  const [isSelectCustomerModalOpen, setSelectCustomerModalOpen] = useState(false);

  const [theme, setThemeState] = useState<ThemeName>('default');
  const [language, setLanguageState] = useState<'en' | 'es'>('es');

  const loadInitialData = async () => {
      setIsInitialLoad(true);
      setError(null);
      try {
          // Check for authenticated user first
          const user = await api.getCurrentUser().catch(() => null);
          setCurrentUser(user);

          const data = await api.getInitialData();
          setProducts(data.products || []);
          setUsers(data.users || []);
          setRoles(data.roles || []);
          setSuppliers(data.suppliers || []);
          setCustomers(data.customers || []);
          setBusinessSettings(data.businessSettings || null);
          setCompletedOrders(data.completedOrders || []);
          setPurchaseOrders(data.purchaseOrders || []);
          setRefundTransactions(data.refundTransactions || []);
          setSessionHistory(data.sessionHistory || []);
          setAuditLogs(data.auditLogs || []);
          setCurrencies(data.currencies || INITIAL_CURRENCIES);
          setParkedOrders(data.parkedOrders || []);

          if (user) {
            const openSession = data.sessionHistory.find(s => s.status === 'open' && s.user_id === user.id);
            setCurrentSession(openSession || null);
          } else {
            setCurrentSession(null);
          }


          if (data.appSettings) {
            setThemeState(data.appSettings.theme);
            setLanguageState(data.appSettings.language);
          }
      } catch (e) {
          setError(e instanceof Error ? e.message : 'An unknown error occurred while loading data.');
      } finally {
          setIsInitialLoad(false);
      }
  };

  useEffect(() => {
    loadInitialData();
  }, []);
  
  const { t } = useTranslations();

  const handleSetTheme = async (newTheme: ThemeName) => {
    setThemeState(newTheme); // Optimistic update
    try {
        await api.updateAppSettings({ theme: newTheme });
    } catch (e) {
        console.error("Failed to save theme", e);
    }
  };

  const handleSetLanguage = async (newLang: 'en' | 'es') => {
      setLanguageState(newLang);
      try {
          await api.updateAppSettings({ language: newLang });
      } catch (e) {
          console.error("Failed to save language", e);
      }
  };

  const addAuditLog = useCallback(async (action: string, details: string) => {
    try {
        const newLog = await api.addAuditLog(action, details);
        setAuditLogs(prev => [newLog, ...prev]);
    } catch (error) {
        console.error("Failed to add audit log:", error);
    }
  }, []);

  const handleUpdateBusinessSettings = async (newSettings: BusinessSettings) => {
    try {
        const updatedSettings = await api.updateBusinessSettings(newSettings);
        setBusinessSettings(updatedSettings);
        // Audit log now handled by backend
    } catch (error) {
        alert(`Failed to update business settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateProduct = useCallback(async (productId: number, updates: ProductUpdatePayload) => {
    try {
        const updatedProduct = await api.updateProduct(productId, updates);
        setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);
  
  const handleDeleteProduct = useCallback(async (productId: number) => {
    try {
        await api.deleteProduct(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleAddNewProduct = useCallback(async (newProductData: NewProductPayload) => {
    try {
        const newProduct = await api.addProduct(newProductData);
        setProducts(prev => [newProduct, ...prev]);
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to add new product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleAddNewUser = async (newUserData: NewUserPayload) => {
    try {
        const newUser = await api.addUser(newUserData);
        setUsers(prev => [...prev, newUser]);
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to add new user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleUpdateUser = async (userId: number, updates: UserUpdatePayload) => {
    try {
        const updatedUser = await api.updateUser(userId, updates);
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (currentUser?.id === userId) {
      alert("You cannot delete your own account.");
      return;
    }
    try {
        await api.deleteUser(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleAddCustomer = async (newCustomerData: NewCustomerPayload) => {
    try {
        const newCustomer = await api.addCustomer(newCustomerData);
        setCustomers(prev => [newCustomer, ...prev]);
        addAuditLog('ADD_CUSTOMER', `Added new customer: ${newCustomer.name}`);
        return newCustomer;
    } catch(e) { 
      alert(`Error: ${e instanceof Error ? e.message : 'Failed to add customer.'}`);
      throw e;
    }
  };
  
  const handleUpdateCustomer = async (id: number, data: CustomerUpdatePayload) => {
     try {
        const updatedCustomer = await api.updateCustomer(id, data);
        setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));
        addAuditLog('UPDATE_CUSTOMER', `Updated customer: ${updatedCustomer.name}`);
    } catch(e) { alert(`Error: ${e instanceof Error ? e.message : 'Failed to update customer.'}`); }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
        const customerName = customers.find(c => c.id === id)?.name || `ID ${id}`;
        await api.deleteCustomer(id);
        setCustomers(prev => prev.filter(c => c.id !== id));
        addAuditLog('DELETE_CUSTOMER', `Deleted customer: ${customerName}`);
    } catch(e) { alert(`Error: ${e instanceof Error ? e.message : 'Failed to delete customer.'}`); }
  };

  const handleUpdateUserStatus = (userId: number, status: 'active' | 'inactive') => {
    if (currentUser?.id === userId) {
        alert(t('app.deactivateSelfError'));
        return;
    }
    handleUpdateUser(userId, { status });
  };
  
  const handleAddRole = async (newRoleData: Omit<Role, 'descriptionKey'>) => {
     try {
        const newRole = await api.addRole(newRoleData);
        setRoles(prev => [...prev, newRole]);
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to add role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleUpdateRolePermissions = async (roleId: string, permissions: Permission[]) => {
    try {
        const updatedRole = await api.updateRolePermissions(roleId, permissions);
        setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to update role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddSupplier = async (newSupplierData: NewSupplierPayload) => {
    try {
        const newSupplier = await api.addSupplier(newSupplierData);
        setSuppliers(prev => [...prev, newSupplier]);
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to add supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateSupplier = async (supplierId: number, updates: SupplierUpdatePayload) => {
    try {
        const updatedSupplier = await api.updateSupplier(supplierId, updates);
        setSuppliers(prev => prev.map(s => s.id === supplierId ? updatedSupplier : s));
        // Audit log handled by backend
    } catch (error) {
         alert(`Failed to update supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    if(confirm(t('app.deleteSupplierConfirm'))) {
        try {
            await api.deleteSupplier(supplierId);
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
            // Audit log handled by backend
        } catch(error) {
            alert(`Failed to delete supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
  };

  const handleCreatePurchaseOrder = async (orderData: { supplierId: number; supplierName: string; items: Omit<PurchaseOrderItem, 'quantityReceived'>[]; totalCost: number; }) => {
    try {
        const newPO = await api.createPurchaseOrder(orderData);
        setPurchaseOrders(prev => [newPO, ...prev]);
        // Audit log handled by backend
    } catch (error) {
         alert(`Failed to create purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReceiveStock = async (purchaseOrderId: string, receivedQuantities: Record<number, number>) => {
    try {
        const { updatedPO, updatedProducts } = await api.receiveStock(purchaseOrderId, receivedQuantities);
        setPurchaseOrders(prev => prev.map(po => po.id === purchaseOrderId ? updatedPO : po));
        setProducts(prev => {
            const newProducts = [...prev];
            updatedProducts.forEach(p_update => {
                const index = newProducts.findIndex(p => p.id === p_update.id);
                if (index !== -1) newProducts[index].stock = p_update.stock;
            });
            return newProducts;
        });
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to receive stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleProcessRefund = async (originalInvoiceId: string, itemsToRefund: { id: number; quantity: number }[], restock: boolean) => {
    try {
        const { updatedOrder, newRefund, updatedProducts } = await api.processRefund(originalInvoiceId, itemsToRefund, restock);
        setRefundTransactions(prev => [newRefund, ...prev]);
        setCompletedOrders(prev => prev.map(o => o.invoiceId === originalInvoiceId ? updatedOrder : o));
        if (updatedProducts) {
             setProducts(prev => {
                const newProducts = [...prev];
                updatedProducts.forEach(p_update => {
                    const index = newProducts.findIndex(p => p.id === p_update.id);
                    if (index !== -1) newProducts[index].stock = p_update.stock;
                });
                return newProducts;
            });
        }
        // Audit log handled by backend
    } catch (error) {
        alert(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSetCurrencies = async (newCurrencies: Currency[]) => {
    try {
        const updatedCurrencies = await api.updateCurrencies(newCurrencies);
        setCurrencies(updatedCurrencies);
    } catch (error) {
        console.error("Failed to save currency settings:", error);
        alert(`Failed to save currency settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFetchLatestRates = async () => {
    try {
        const { currencies: newCurrencies, businessSettings: newSettings } = await api.fetchLatestCurrencyRates();
        setCurrencies(newCurrencies);
        setBusinessSettings(newSettings);
    } catch (error) {
        console.error("Failed to fetch latest currency rates:", error);
        alert(`Failed to fetch latest currency rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addToOrder = useCallback(async (product: Product, quantity = 1) => {
    if (currentSession?.status !== 'open') {
        alert(t('app.drawerClosedError'));
        return;
    }
    
    if (product.sellBy === 'weight' && quantity === 1) { // quantity=1 is default, so open weigh modal
        setProductToWeigh(product);
        return;
    }
    
    const productInStock = products.find(p => p.id === product.id);
    const itemInOrder = orderItems.find(item => item.id === product.id);
    const currentQuantityInOrder = itemInOrder ? itemInOrder.quantity : 0;

    if (productInStock && productInStock.stock >= currentQuantityInOrder + quantity) {
      setOrderItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === product.id);
        if (existingItem) {
          return prevItems.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          return [...prevItems, { ...product, quantity }];
        }
      });
    } else {
      alert(`${product.name} ${t('app.outOfStock')}`);
    }
  }, [products, orderItems, t, currentSession]);

   const handleWeightEntered = (product: Product, weight: number) => {
    if (weight <= 0) {
      setProductToWeigh(null);
      return;
    }

    const productInStock = products.find(p => p.id === product.id);
    if (!productInStock) return;

    const itemInOrder = orderItems.find(item => item.id === product.id);
    const isEditing = !!itemInOrder;
    const quantityChange = isEditing ? weight - itemInOrder.quantity : weight;

    if (productInStock.stock >= (itemInOrder?.quantity || 0) + quantityChange) {
      setOrderItems(prevItems => {
        if (isEditing) {
          return prevItems.map(item =>
            item.id === product.id ? { ...item, quantity: weight } : item
          );
        } else {
          return [...prevItems, { ...product, quantity: weight }];
        }
      });
    } else {
      alert(`${t('app.onlyStockAvailable')} ${productInStock.stock.toFixed(3)}kg ${t('app.of')} ${productInStock.name} ${t('app.inStock')}.`);
    }
    setProductToWeigh(null);
  };

  const removeFromOrder = useCallback((productId: number) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);
  
  const updateQuantity = useCallback((productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(productId);
      return;
    }
  
    const productInStock = products.find(p => p.id === productId);
    
    if (productInStock && productInStock.stock >= newQuantity) {
      setOrderItems((prevItems) =>
        prevItems.map((item) =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    } else {
        const stockMessage = productInStock?.sellBy === 'weight'
            ? `${productInStock.stock.toFixed(3)}kg`
            : `${productInStock?.stock}`;
        alert(`${t('app.onlyStockAvailable')} ${stockMessage} ${t('app.of')} ${productInStock?.name} ${t('app.inStock')}.`);
    }
  }, [products, removeFromOrder, t]);

  const clearOrder = useCallback(() => {
    setOrderItems([]);
    setDiscount(0);
    setTip(0);
    setSelectedCustomerForOrder(null);
  }, []);
  
  const handleParkSale = async () => {
    if (orderItems.length === 0) return;
    const name = prompt("Enter a name for this parked sale (e.g., 'Table 5', 'Customer's name')");
    if (name) {
        try {
            const newParkedOrder = await api.parkSale({ name, items: orderItems });
            setParkedOrders(prev => [...prev, newParkedOrder]);
            clearOrder();
        } catch (error) {
            alert(`Failed to park sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
  };

  const handleUnparkSale = async (parkedOrderId: string) => {
    if (orderItems.length > 0) {
        if (!confirm('This will replace the current order. Are you sure?')) {
            return;
        }
    }
    const orderToUnpark = parkedOrders.find(p => p.id === parkedOrderId);
    if (orderToUnpark) {
        try {
            await api.unparkSale(parkedOrderId);
            setOrderItems(orderToUnpark.items);
            setParkedOrders(prev => prev.filter(p => p.id !== parkedOrderId));
        } catch (error) {
            alert(`Failed to unpark sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
  };

  const handlePinSubmit = async (password: string) => {
    if (!pinEntryUser) return;
    try {
      const user = await api.login(pinEntryUser.username, password);
      handlePinSuccess(user);
    } catch (error) {
      const errorMsg = handlePinFailure(pinEntryUser.username);
      setPinError(errorMsg);
    }
  };

  const handlePinSuccess = (user: User) => {
    const lastLogin = new Date().toISOString();
    setCurrentUser({ ...user, lastLogin });
    setIsPinModalOpen(false);
    setPinEntryUser(null);
    setPinError('');
    
    const openSession = sessionHistory.find(s => s.status === 'open' && s.user_id === user.id);
    setCurrentSession(openSession || null);

    if (!openSession) {
      // The drawer might need to be opened. We don't force it here anymore,
      // the main UI will show the 'Drawer Closed' overlay with an open button.
    }
    handleUpdateUser(user.id, { lastLogin });
    setFailedLoginAttempts(prev => {
        const newAttempts = { ...prev };
        delete newAttempts[user.username];
        return newAttempts;
    });
  };
  
   const handlePinFailure = (username: string) => {
    const newCount = (failedLoginAttempts[username] || 0) + 1;
    setFailedLoginAttempts(prev => ({ ...prev, [username]: newCount }));
    const user = users.find(u => u.username === username);

    if (newCount >= MAX_LOGIN_ATTEMPTS && user) {
        handleUpdateUserStatus(user.id, 'inactive');
        return t('login.accountLocked');
    }
    return t('login.error');
  };

  const handleLockSession = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentSession(null);
    clearOrder();
  };
  
  const handleOpenDrawer = async (startingCash: number) => {
    if (!currentUser) return;

    try {
        const newSession = await api.openSession({ opening_amount: startingCash });
        setCurrentSession(newSession);
        setSessionHistory(prev => [newSession, ...prev]);
        setDrawerModalOpen(false);
    } catch(e) {
        alert(`Failed to open cash drawer session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleCloseDrawer = async (countedCash: number) => {
    if (!currentSession || !currentUser) return;
    try {
        const { session: closedSession, message } = await api.closeSession(currentSession.id, { closing_amount: countedCash });
        setSessionHistory(prev => [closedSession, ...prev.filter(s => s.id !== closedSession.id)]);
        setCurrentSession(null);
        alert(message);
    } catch(e) {
        alert(`Failed to close cash drawer session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const addActivity = async (activity: Omit<CashDrawerActivity, 'created_at' | 'id' | 'session_id' | 'user_id'>) => {
    if (!currentSession || !currentUser) return;
    
    try {
        const updatedActivities = await api.addSessionActivity(currentSession.id, activity);
        setCurrentSession(prev => prev ? { ...prev, activities: updatedActivities } : null);
        // Update history in case it's displayed
        setSessionHistory(prev => prev.map(s => s.id === currentSession.id ? { ...s, activities: updatedActivities } : s));
    } catch(e) {
        alert(`Failed to record activity: ${activity.type}. Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };
  
  const handlePayIn = (amount: number, reason: string) => {
    addActivity({ type: 'pay-in', amount, notes: reason });
  };

  const handlePayOut = (amount: number, reason: string) => {
    addActivity({ type: 'pay-out', amount, notes: reason });
  };

  const handlePaymentSuccess = async (paymentMethod: PaymentMethod) => {
    if (!businessSettings || !currentUser) return;

    try {
        const { updatedProducts, newOrder } = await api.processPayment(
            orderItems,
            businessSettings,
            paymentMethod,
            tip,
            discount,
            selectedCustomerForOrder?.id,
            selectedCustomerForOrder?.name,
        );
        
        setCompletedOrders(prev => [newOrder, ...prev]);
        setProducts(prev => {
            const newProducts = [...prev];
            updatedProducts.forEach(p_update => {
                const index = newProducts.findIndex(p => p.id === p_update.id);
                if (index !== -1) newProducts[index].stock = p_update.stock;
            });
            return newProducts;
        });

        if (currentSession && paymentMethod === 'cash') {
             addActivity({
                type: 'sale',
                amount: newOrder.total,
                order_id: newOrder.invoiceId,
                payment_method: paymentMethod,
            });
        }

        clearOrder();
        setCheckoutModalOpen(false);
        setViewingReceipt(newOrder);
    } catch (error) {
        console.error("Payment processing failed:", error);
        alert(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // FIX: Added onViewReceipt function to handle viewing a receipt from various parts of the app.
  const onViewReceipt = (order: CompletedOrder) => {
    setViewingReceipt(order);
  };

  const handleSetCustomerForOrder = (customer: Customer | null) => {
    setSelectedCustomerForOrder(customer);
    setSelectCustomerModalOpen(false);
  };

  if (isInitialLoad) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500 p-4">Error: {error}</div>;
  }
  
  if (!businessSettings) {
      return <div className="flex items-center justify-center h-screen">Error: Business settings not loaded.</div>;
  }

  const userRole = currentUser ? roles.find(r => r.id === currentUser.roleId) : null;
  const displayedSessionHistory = currentUser && userRole && userRole.id !== 'admin'
    ? sessionHistory.filter(s => s.user_id === currentUser.id)
    : sessionHistory;

  return (
    <LanguageProvider language={language} setLanguage={handleSetLanguage}>
      <ThemeProvider theme={theme} setTheme={handleSetTheme}>
        <CurrencyProvider businessSettings={businessSettings} currencies={currencies}>
          <AppContent
            currentUser={currentUser}
            users={users}
            roles={roles}
            suppliers={suppliers}
            customers={customers}
            purchaseOrders={purchaseOrders}
            orderItems={orderItems}
            products={products}
            parkedOrders={parkedOrders}
            isCheckoutModalOpen={isCheckoutModalOpen}
            isAdminPanelOpen={isAdminPanelOpen}
            completedOrders={completedOrders}
            refundTransactions={refundTransactions}
            viewingReceipt={viewingReceipt}
            businessSettings={businessSettings}
            currentSession={currentSession}
            sessionHistory={displayedSessionHistory}
            currencies={currencies}
            auditLogs={auditLogs}
            isOrderSummaryOpen={isOrderSummaryOpen}
            productToWeigh={productToWeigh}
            isDrawerModalOpen={isDrawerModalOpen}
            setDrawerModalOpen={setDrawerModalOpen}
            pinEntryUser={pinEntryUser}
            pinError={pinError}
            discount={discount}
            tip={tip}
            selectedCustomerForOrder={selectedCustomerForOrder}
            isSelectCustomerModalOpen={isSelectCustomerModalOpen}
            setSelectCustomerModalOpen={setSelectCustomerModalOpen}
            onSetCustomerForOrder={handleSetCustomerForOrder}
            setDiscount={setDiscount}
            setTip={setTip}
            onPinSubmit={handlePinSubmit}
            setPinEntryUser={setPinEntryUser}
            setIsPinModalOpen={setIsPinModalOpen}
            setPinError={setPinError}
            onLockSession={handleLockSession}
            onOpenAdminPanel={() => setAdminPanelOpen(true)}
            onCloseAdminPanel={() => setAdminPanelOpen(false)}
            addToOrder={addToOrder}
            updateQuantity={updateQuantity}
            removeFromOrder={removeFromOrder}
            clearOrder={clearOrder}
            setCheckoutModalOpen={setCheckoutModalOpen}
            handlePaymentSuccess={handlePaymentSuccess}
            setViewingReceipt={setViewingReceipt}
            setProductToWeigh={setProductToWeigh}
            handleWeightEntered={handleWeightEntered}
            handleOpenDrawer={handleOpenDrawer}
            setOrderSummaryOpen={setOrderSummaryOpen}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddProduct={handleAddNewProduct}
            onAddUser={handleAddNewUser}
            onUpdateUser={handleUpdateUser}
            onUpdateUserStatus={handleUpdateUserStatus}
            onDeleteUser={handleDeleteUser}
            onAddRole={handleAddRole}
            onUpdateRolePermissions={handleUpdateRolePermissions}
            onUpdateBusinessSettings={handleUpdateBusinessSettings}
            onViewReceipt={onViewReceipt}
            onCloseDrawer={handleCloseDrawer}
            onPayIn={handlePayIn}
            onPayOut={handlePayOut}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onCreatePurchaseOrder={handleCreatePurchaseOrder}
            onReceiveStock={handleReceiveStock}
            onProcessRefund={handleProcessRefund}
            onSetCurrencies={handleSetCurrencies}
            onFetchLatestRates={handleFetchLatestRates}
            onParkSale={handleParkSale}
            onUnparkSale={handleUnparkSale}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        </CurrencyProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
