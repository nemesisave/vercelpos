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
  const [isLoading, setIsLoading] = useState(true);
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
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<Customer | null>(null);
  const [isSelectCustomerModalOpen, setSelectCustomerModalOpen] = useState(false);

  const [theme, setThemeState] = useState<ThemeName>('default');
  const [language, setLanguageState] = useState<'en' | 'es'>('es');


  const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
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

          const openSession = data.sessionHistory.find(s => s.isOpen);
          setCurrentSession(openSession || null);

          if (data.appSettings) {
            setThemeState(data.appSettings.theme);
            setLanguageState(data.appSettings.language);
          }
      } catch (e) {
          setError(e instanceof Error ? e.message : 'An unknown error occurred while loading data.');
      } finally {
          setIsLoading(false);
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

  const addAuditLog = useCallback(async (action: string, details: string, user: User | null = currentUser) => {
    if (!user) return;
    try {
        const newLog = await api.addAuditLog(user.id, user.name, action, details);
        setAuditLogs(prev => [newLog, ...prev]);
    } catch (error) {
        console.error("Failed to add audit log:", error);
    }
  }, [currentUser]);

  const handleUpdateBusinessSettings = async (newSettings: BusinessSettings) => {
    try {
        const updatedSettings = await api.updateBusinessSettings(newSettings);
        setBusinessSettings(updatedSettings);
        addAuditLog('UPDATE_SETTINGS', 'Business settings updated.');
    } catch (error) {
        alert(`Failed to update business settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateProduct = useCallback(async (productId: number, updates: ProductUpdatePayload) => {
    try {
        const updatedProduct = await api.updateProduct(productId, updates);
        setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
        addAuditLog('UPDATE_PRODUCT', `Updated product: ${updatedProduct.name}`);
    } catch (error) {
        alert(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addAuditLog]);
  
  const handleDeleteProduct = useCallback(async (productId: number) => {
    try {
        await api.deleteProduct(productId);
        const deletedProductName = products.find(p => p.id === productId)?.name || `ID ${productId}`;
        setProducts(prev => prev.filter(p => p.id !== productId));
        addAuditLog('DELETE_PRODUCT', `Deleted product: ${deletedProductName}`);
    } catch (error) {
        alert(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addAuditLog, products]);

  const handleAddNewProduct = useCallback(async (newProductData: NewProductPayload) => {
    try {
        const newProduct = await api.addProduct(newProductData);
        setProducts(prev => [newProduct, ...prev]);
        addAuditLog('ADD_PRODUCT', `Added new product: ${newProduct.name}`);
    } catch (error) {
        alert(`Failed to add new product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addAuditLog]);

  const handleAddNewUser = async (newUserData: Omit<NewUserPayload, 'creatorId' | 'creatorName'>) => {
    if (!currentUser) return;
    try {
        const payload: NewUserPayload = {
            ...newUserData,
            creatorId: currentUser.id,
            creatorName: currentUser.name,
        };
        const newUser = await api.addUser(payload);
        setUsers(prev => [...prev, newUser]);
        addAuditLog('ADD_USER', `Added new user: ${newUser.name}`);
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
        addAuditLog('UPDATE_USER', `Updated user: ${updatedUser.name}`);
    } catch (error) {
        alert(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!currentUser) return;
    if (currentUser.id === userId) {
      alert("You cannot delete your own account.");
      return;
    }
    try {
        const userToDelete = users.find(u => u.id === userId);
        await api.deleteUser(userId, { adminUserId: currentUser.id, adminUserName: currentUser.name });
        setUsers(prev => prev.filter(u => u.id !== userId));
        // Audit log is now handled by the API, but we can add a more detailed one here if needed.
        // The API log is better as it's part of the transaction.
        // Let's rely on the API for the audit log.
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
        addAuditLog('ADD_ROLE', `Added new role: ${newRole.name}`);
    } catch (error) {
        alert(`Failed to add role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleUpdateRolePermissions = async (roleId: string, permissions: Permission[]) => {
    try {
        const updatedRole = await api.updateRolePermissions(roleId, permissions);
        setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
        addAuditLog('UPDATE_ROLE_PERMISSIONS', `Updated permissions for role: ${updatedRole.name}`);
    } catch (error) {
        alert(`Failed to update role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddSupplier = async (newSupplierData: NewSupplierPayload) => {
    try {
        const newSupplier = await api.addSupplier(newSupplierData);
        setSuppliers(prev => [...prev, newSupplier]);
        addAuditLog('ADD_SUPPLIER', `Added new supplier: ${newSupplier.name}`);
    } catch (error) {
        alert(`Failed to add supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateSupplier = async (supplierId: number, updates: SupplierUpdatePayload) => {
    try {
        const updatedSupplier = await api.updateSupplier(supplierId, updates);
        setSuppliers(prev => prev.map(s => s.id === supplierId ? updatedSupplier : s));
        addAuditLog('UPDATE_SUPPLIER', `Updated supplier: ${updatedSupplier.name}`);
    } catch (error) {
         alert(`Failed to update supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    if(confirm(t('app.deleteSupplierConfirm'))) {
        try {
            const supplierName = suppliers.find(s => s.id === supplierId)?.name || `ID ${supplierId}`;
            await api.deleteSupplier(supplierId);
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
            addAuditLog('DELETE_SUPPLIER', `Deleted supplier: ${supplierName}`);
        } catch(error) {
            alert(`Failed to delete supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
  };

  const handleCreatePurchaseOrder = async (orderData: { supplierId: number; supplierName: string; items: Omit<PurchaseOrderItem, 'quantityReceived'>[]; totalCost: number; }) => {
    if (!currentUser) return;
    try {
        const newPO = await api.createPurchaseOrder({
          ...orderData,
          userId: currentUser.id,
          userName: currentUser.name,
        });
        setPurchaseOrders(prev => [newPO, ...prev]);
        addAuditLog('CREATE_PO', `Created Purchase Order ${newPO.id} for ${newPO.supplierName}`);
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
        addAuditLog('RECEIVE_STOCK', `Received stock for PO ${purchaseOrderId}`);
    } catch (error) {
        alert(`Failed to receive stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleProcessRefund = async (originalInvoiceId: string, itemsToRefund: { id: number; quantity: number }[], restock: boolean) => {
    if (!currentUser) return;
    try {
        const { updatedOrder, newRefund, updatedProducts } = await api.processRefund(originalInvoiceId, itemsToRefund, restock, currentUser.id);
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
    if (!currentSession?.isOpen) {
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


  const handlePinSuccess = (user: User) => {
    const lastLogin = new Date().toISOString();
    setCurrentUser({ ...user, lastLogin });
    setIsPinModalOpen(false);
    setPinEntryUser(null);
    
    const openSession = sessionHistory.find(s => s.isOpen);
    setCurrentSession(openSession || null);

    if (!openSession) {
      setDrawerModalOpen(true);
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

  const handleLockSession = () => {
    setCurrentUser(null);
    clearOrder();
  };
  
  const handleOpenDrawer = async (startingCash: number) => {
    const user = pinEntryUser || currentUser;
    if (!user) return;

    try {
        const newSession = await api.openSession({
            startingCash,
            openedBy: user.name,
            openedAt: new Date().toISOString(),
            userId: user.id
        });
        setCurrentSession(newSession);
        setDrawerModalOpen(false);
    } catch(e) {
        alert(`Failed to open cash drawer session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleCloseDrawer = async (countedCash: number) => {
    if (!currentSession || !currentUser) return;
    try {
        const { session: closedSession, message } = await api.closeSession(currentSession.id, {
            countedCash,
            closedBy: currentUser.name,
            closedAt: new Date().toISOString(),
            userId: currentUser.id
        });
        setSessionHistory(prev => [closedSession, ...prev.filter(s => s.id !== closedSession.id)]);
        setCurrentSession(null);
        alert(message);
    } catch(e) {
        alert(`Failed to close cash drawer session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const addActivity = async (activity: Omit<CashDrawerActivity, 'timestamp'>) => {
    if (!currentSession || !currentUser) return;
    const fullActivity: CashDrawerActivity = {
        ...activity,
        timestamp: new Date().toISOString(),
    };
    try {
        const updatedSession = await api.addSessionActivity(currentSession.id, fullActivity, currentUser.id, currentUser.name);
        setCurrentSession(updatedSession);
        // Update history in case it's displayed
        setSessionHistory(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
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
            currentUser.name,
            paymentMethod,
            tip,
            discount,
            selectedCustomerForOrder?.id,
            selectedCustomerForOrder?.name,
            currentUser.id
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

        if (currentSession) {
             addActivity({
                type: 'sale',
                amount: newOrder.total,
                orderId: newOrder.invoiceId,
                paymentMethod,
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

  const handleSetCustomerForOrder = (customer: Customer | null) => {
    setSelectedCustomerForOrder(customer);
    setSelectCustomerModalOpen(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500 p-4">Error: {error}</div>;
  }
  
  if (!businessSettings) {
      return <div className="flex items-center justify-center h-screen">Error: Business settings not loaded.</div>;
  }

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
            sessionHistory={sessionHistory}
            currencies={currencies}
            auditLogs={auditLogs}
            isOrderSummaryOpen={isOrderSummaryOpen}
            productToWeigh={productToWeigh}
            isDrawerModalOpen={isDrawerModalOpen}
            isPinModalOpen={isPinModalOpen}
            pinEntryUser={pinEntryUser}
            discount={discount}
            tip={tip}
            selectedCustomerForOrder={selectedCustomerForOrder}
            isSelectCustomerModalOpen={isSelectCustomerModalOpen}
            setSelectCustomerModalOpen={setSelectCustomerModalOpen}
            onSetCustomerForOrder={handleSetCustomerForOrder}
            setDiscount={setDiscount}
            setTip={setTip}
            onPinSuccess={handlePinSuccess}
            onPinFailure={handlePinFailure}
            setPinEntryUser={setPinEntryUser}
            setIsPinModalOpen={setIsPinModalOpen}
            // FIX: Pass correct handler for locking session
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
            // FIX: Pass correct handler for adding a product
            onAddProduct={handleAddNewProduct}
            onAddUser={handleAddNewUser}
            onUpdateUser={handleUpdateUser}
            onUpdateUserStatus={handleUpdateUserStatus}
            onDeleteUser={handleDeleteUser}
            onAddRole={handleAddRole}
            onUpdateRolePermissions={handleUpdateRolePermissions}
            onUpdateBusinessSettings={handleUpdateBusinessSettings}
            onViewReceipt={(order) => setViewingReceipt(order)}
            onCloseDrawer={handleCloseDrawer}
            // FIX: Pass correct handler for pay in
            onPayIn={handlePayIn}
            // FIX: Pass correct handler for pay out
            onPayOut={handlePayOut}
            onAddSupplier={handleAddSupplier}
            // FIX: Pass correct handler for updating supplier
            onUpdateSupplier={handleUpdateSupplier}
            // FIX: Pass correct handler for deleting supplier
            onDeleteSupplier={handleDeleteSupplier}
            onCreatePurchaseOrder={handleCreatePurchaseOrder}
            // FIX: Pass correct handler for receiving stock
            onReceiveStock={handleReceiveStock}
            // FIX: Pass correct handler for processing refund
            onProcessRefund={handleProcessRefund}
            onSetCurrencies={handleSetCurrencies}
            onFetchLatestRates={handleFetchLatestRates}
            onParkSale={handleParkSale}
            onUnparkSale={handleUnparkSale}
            onAddCustomer={handleAddCustomer}
            // FIX: Pass correct handler for updating customer
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        </CurrencyProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;