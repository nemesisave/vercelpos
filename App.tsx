import React, { useState, useCallback, useEffect } from 'react';
import type { OrderItem, Product, ProductUpdatePayload, NewProductPayload, User, NewUserPayload, UserUpdatePayload, CompletedOrder, PaymentMethod, BusinessSettings, CashDrawerSession, CashDrawerActivity, Supplier, NewSupplierPayload, SupplierUpdatePayload, PurchaseOrder, PurchaseOrderItem, Role, Permission, RefundTransaction, AuditLog, ParkedOrder, Customer, NewCustomerPayload, CustomerUpdatePayload, ThemeName } from './types';
import { CURRENCIES as INITIAL_CURRENCIES } from './currencies';
import type { Currency } from './currencies';
import { LanguageProvider, useTranslations } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import AppContent from './components/AppContent';
import * as api from './services/apiService';
import { getUpsellSuggestion, parseVoiceCommand } from './services/geminiService';

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
  const [aiUpsellSuggestion, setAiUpsellSuggestion] = useState<string | null>(null);
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
        // Optionally revert state here
    }
  };

  const handleSetLanguage = async (newLang: 'en' | 'es') => {
      setLanguageState(newLang); // Optimistic update
      try {
          await api.updateAppSettings({ language: newLang });
      } catch (e) {
          console.error("Failed to save language", e);
          // Optionally revert state here
      }
  };

  const addAuditLog = useCallback(async (action: string, details: string, user: User | null = currentUser) => {
    if (!user) return;
    try {
        // This now calls the backend. Audit logging is also done automatically for most actions.
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
    } catch (error) {
        alert('Failed to update business settings.');
    }
  };

  const handleUpdateProduct = useCallback(async (productId: number, updates: ProductUpdatePayload) => {
    try {
        const updatedProduct = await api.updateProduct(productId, updates);
        setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
    } catch (error) {
        alert('Failed to update product.');
    }
  }, []);
  
  const handleDeleteProduct = useCallback(async (productId: number) => {
    try {
        await api.deleteProduct(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
        alert('Failed to delete product.');
    }
  }, []);

  const handleAddNewProduct = useCallback(async (newProductData: NewProductPayload) => {
    try {
        const newProduct = await api.addProduct(newProductData);
        setProducts(prev => [newProduct, ...prev]);
    } catch (error) {
        alert('Failed to add new product.');
    }
  }, []);

  const handleAddNewUser = async (newUserData: NewUserPayload) => {
    try {
        const newUser = await api.addUser(newUserData);
        setUsers(prev => [...prev, newUser]);
    } catch (error) {
        alert('Failed to add new user.');
    }
  };
  
  const handleUpdateUser = async (userId: number, updates: UserUpdatePayload) => {
    try {
        const updatedUser = await api.updateUser(userId, updates);
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        if (currentUser?.id === userId) {
            setCurrentUser(updatedUser);
        }
    } catch (error) {
        alert('Failed to update user.');
    }
  };
  
  const handleAddCustomer = async (newCustomerData: NewCustomerPayload) => {
    try {
        const newCustomer = await api.addCustomer(newCustomerData);
        setCustomers(prev => [newCustomer, ...prev]);
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
    } catch(e) { alert(`Error: ${e instanceof Error ? e.message : 'Failed to update customer.'}`); }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
        await api.deleteCustomer(id);
        setCustomers(prev => prev.filter(c => c.id !== id));
    } catch(e) { alert(`Error: ${e instanceof Error ? e.message : 'Failed to delete customer.'}`); }
  };


  const handleUpdateUserStatus = (userId: number, status: 'active' | 'inactive') => {
    const userToUpdate = users.find(user => user.id === userId);
    if (!userToUpdate) return;
    
    if (currentUser?.id === userId) {
        alert(t('app.deactivateSelfError'));
        return;
    }

    const adminUsers = users.filter(user => user.roleId === 'admin' && user.status === 'active');
    if (adminUsers.length === 1 && userToUpdate.roleId === 'admin' && status === 'inactive') {
        alert(t('app.deactivateLastAdminError'));
        return;
    }

    handleUpdateUser(userId, { status });
  };
  
  const handleAddRole = async (newRoleData: Omit<Role, 'descriptionKey'>) => {
     try {
        const newRole = await api.addRole(newRoleData);
        setRoles(prev => [...prev, newRole]);
    } catch (error) {
        alert('Failed to add role.');
    }
  };
  
  const handleUpdateRolePermissions = async (roleId: string, permissions: Permission[]) => {
    try {
        const updatedRole = await api.updateRolePermissions(roleId, permissions);
        setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
    } catch (error) {
        alert('Failed to update role permissions.');
    }
  };

  const handleAddSupplier = async (newSupplierData: NewSupplierPayload) => {
    try {
        const newSupplier = await api.addSupplier(newSupplierData);
        setSuppliers(prev => [...prev, newSupplier]);
    } catch (error) {
        alert('Failed to add supplier.');
    }
  };

  const handleUpdateSupplier = async (supplierId: number, updates: SupplierUpdatePayload) => {
    try {
        const updatedSupplier = await api.updateSupplier(supplierId, updates);
        setSuppliers(prev => prev.map(s => s.id === supplierId ? updatedSupplier : s));
    } catch (error) {
         alert('Failed to update supplier.');
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    if(confirm(t('app.deleteSupplierConfirm'))) {
        try {
            await api.deleteSupplier(supplierId);
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        } catch(error) {
            alert('Failed to delete supplier.');
        }
    }
  };

  const handleCreatePurchaseOrder = async (orderData: { supplierId: number; supplierName: string; items: Omit<PurchaseOrderItem, 'quantityReceived'>[]; totalCost: number; }) => {
    try {
        const newPO = await api.createPurchaseOrder(orderData);
        setPurchaseOrders(prev => [newPO, ...prev]);
    } catch (error) {
         alert('Failed to create purchase order.');
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
    } catch (error) {
        alert('Failed to receive stock.');
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
    } catch (error) {
        alert('Failed to process refund.');
    }
  };

  const handleSetCurrencies = async (newCurrencies: Currency[]) => {
    try {
        const updatedCurrencies = await api.updateCurrencies(newCurrencies);
        setCurrencies(updatedCurrencies);
    } catch (error) {
        console.error("Failed to save currency settings:", error);
        alert('Failed to save currency settings.');
    }
  };

  const handleFetchLatestRates = async () => {
    try {
        const { currencies: newCurrencies, businessSettings: newSettings } = await api.fetchLatestCurrencyRates();
        setCurrencies(newCurrencies);
        setBusinessSettings(newSettings);
    } catch (error) {
        console.error("Failed to fetch latest currency rates:", error);
        alert('Failed to fetch latest currency rates.');
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
      let newOrderItems: OrderItem[] = [];
      setOrderItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === product.id);
        if (existingItem) {
          newOrderItems = prevItems.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newOrderItems = [...prevItems, { ...product, quantity }];
        }
        return newOrderItems;
      });

      // Fetch upsell suggestion
      const suggestion = await getUpsellSuggestion(newOrderItems, products, businessSettings?.currency || 'USD');
      setAiUpsellSuggestion(suggestion);

    } else {
      alert(`${product.name} ${t('app.outOfStock')}`);
    }
  }, [products, orderItems, t, currentSession, businessSettings]);

  const handleVoiceCommand = useCallback(async (command: string) => {
    const itemsToAdd = await parseVoiceCommand(command, products);
    if (itemsToAdd) {
        for (const item of itemsToAdd) {
            const product = products.find(p => p.name.toLowerCase() === item.productName.toLowerCase());
            if (product) {
                await addToOrder(product, item.quantity);
            }
        }
    } else {
        alert("Sorry, I didn't understand that. Please try again.");
    }
  }, [products, addToOrder]);
  
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
       let newOrderItems: OrderItem[] = [];
      setOrderItems(prevItems => {
        if (isEditing) {
          newOrderItems = prevItems.map(item =>
            item.id === product.id ? { ...item, quantity: weight } : item
          );
        } else {
          newOrderItems = [...prevItems, { ...product, quantity: weight }];
        }
        return newOrderItems;
      });
      // Fetch upsell suggestion after updating order
      getUpsellSuggestion(newOrderItems, products, businessSettings?.currency || 'USD').then(setAiUpsellSuggestion);
    } else {
      alert(`${t('app.onlyStockAvailable')} ${productInStock.stock.toFixed(3)}kg ${t('app.of')} ${productInStock.name} ${t('app.inStock')}.`);
    }
    setProductToWeigh(null);
  };

  const removeFromOrder = useCallback((productId: number) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    setAiUpsellSuggestion(null);
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
    setAiUpsellSuggestion(null);
    setDiscount(0);
    setTip(0);
    setSelectedCustomerForOrder(null);
  }, []);
  
  const handleParkSale = () => {
    if (orderItems.length === 0) return;
    const name = prompt("Enter a name for this parked sale (e.g., 'Table 5', 'Customer's name')");
    if (name) {
        const newParkedOrder: ParkedOrder = {
            id: `parked-${Date.now()}`,
            name,
            items: orderItems,
            parkedAt: new Date().toLocaleTimeString()
        };
        setParkedOrders(prev => [...prev, newParkedOrder]);
        clearOrder();
        // TODO: Persist parked sales in backend
    }
  };

  const handleUnparkSale = (parkedOrderId: string) => {
    if (orderItems.length > 0) {
        if (!confirm('This will replace the current order. Are you sure?')) {
            return;
        }
    }
    const orderToUnpark = parkedOrders.find(p => p.id === parkedOrderId);
    if (orderToUnpark) {
        setOrderItems(orderToUnpark.items);
        setParkedOrders(prev => prev.filter(p => p.id !== parkedOrderId));
        // TODO: Persist parked sales in backend
    }
  };


  const handlePinSuccess = (user: User) => {
    const lastLogin = new Date().toISOString();
    setCurrentUser({ ...user, lastLogin });
    setIsPinModalOpen(false);
    setPinEntryUser(null);
    
    if (!currentSession) {
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
    setIsPinModalOpen(true);
    setPinEntryUser(currentUser);
    setCurrentUser(null);
    clearOrder();
  };
  
  const handleOpenDrawer = (startingCash: number) => {
    if (!currentUser && !pinEntryUser) return;
    const user = currentUser || pinEntryUser;
    if (!user) return;

    const newSession: CashDrawerSession = {
      id: (sessionHistory[0]?.id || 0) + 1,
      isOpen: true,
      startingCash,
      openedBy: user.name,
      openedAt: new Date().toLocaleString(language),
      activities: [],
    };
    
    setCurrentSession(newSession);
    setDrawerModalOpen(false);
    // TODO: Persist session in backend
  };

  const handleCloseDrawer = (countedCash: number) => {
    if (!currentSession || (!currentUser && !pinEntryUser)) return;
    const user = currentUser || pinEntryUser;
    if (!user) return;
    
    const cashSales = currentSession.activities
        .filter(a => a.type === 'sale' && a.paymentMethod === 'cash')
        .reduce((sum, a) => sum + a.amount, 0);
    const totalPayIns = currentSession.activities
        .filter(a => a.type === 'pay-in')
        .reduce((sum, a) => sum + a.amount, 0);
    const totalPayOuts = currentSession.activities
        .filter(a => a.type === 'pay-out')
        .reduce((sum, a) => sum + a.amount, 0);

    const expectedInDrawer = currentSession.startingCash + cashSales + totalPayIns - totalPayOuts;
    const difference = countedCash - expectedInDrawer;

    const closedSession: CashDrawerSession = {
      ...currentSession,
      isOpen: false,
      closingCash: countedCash,
      difference,
      closedBy: user.name,
      closedAt: new Date().toLocaleString(language),
    };

    setSessionHistory(prev => [closedSession, ...prev]);
    setCurrentSession(null);
    // TODO: Persist session in backend
    
    alert(t('app.drawerClosedAndLoggedOut'));
    setCurrentUser(null);
    setPinEntryUser(null);
    setIsPinModalOpen(false);
  };
  
  const handlePayIn = (amount: number, reason: string) => {
    if (!currentSession || !currentUser) return;
    const payInActivity: CashDrawerActivity = {
      type: 'pay-in',
      amount,
      timestamp: new Date().toLocaleString(language),
      notes: reason,
    };
    setCurrentSession(prev => prev ? { ...prev, activities: [...prev.activities, payInActivity] } : null);
    // TODO: Persist session in backend
  };

  const handlePayOut = (amount: number, reason: string) => {
    if (!currentSession || !currentUser) return;
     const payOutActivity: CashDrawerActivity = {
      type: 'pay-out',
      amount,
      timestamp: new Date().toLocaleString(language),
      notes: reason,
    };
    setCurrentSession(prev => prev ? { ...prev, activities: [...prev.activities, payOutActivity] } : null);
    // TODO: Persist session in backend
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
            selectedCustomerForOrder?.name
        );
        
        // Update local state
        setCompletedOrders(prev => [newOrder, ...prev]);
        setProducts(prev => {
            const newProducts = [...prev];
            updatedProducts.forEach(p_update => {
                const index = newProducts.findIndex(p => p.id === p_update.id);
                if (index !== -1) newProducts[index].stock = p_update.stock;
            });
            return newProducts;
        });

        // Add cash drawer activity if needed
        if (currentSession) {
             const saleActivity: CashDrawerActivity = {
                type: 'sale',
                amount: newOrder.total,
                timestamp: new Date().toLocaleString(language),
                orderId: newOrder.invoiceId,
                paymentMethod,
            };
            setCurrentSession(prev => prev ? { ...prev, activities: [...prev.activities, saleActivity] } : null);
            // TODO: Persist session update in backend
        }

        clearOrder();
        setCheckoutModalOpen(false);
        setViewingReceipt(newOrder);
    } catch (error) {
        console.error("Payment processing failed:", error);
        alert(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Optionally, reload data to ensure consistency
        await loadInitialData();
    }
  };

  const handleSetCustomerForOrder = (customer: Customer | null) => {
    setSelectedCustomerForOrder(customer);
    setSelectCustomerModalOpen(false);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (!businessSettings) {
      return <div>Error: Business settings not loaded.</div>;
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
            aiUpsellSuggestion={aiUpsellSuggestion}
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
            onAddRole={handleAddRole}
            onUpdateRolePermissions={handleUpdateRolePermissions}
            onUpdateBusinessSettings={handleUpdateBusinessSettings}
            onViewReceipt={(order) => setViewingReceipt(order)}
            // Fix: Assign correct handler functions to props.
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
            onVoiceCommand={handleVoiceCommand}
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