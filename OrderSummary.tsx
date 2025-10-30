import React from 'react';
import type { OrderItem, User, Role, Customer } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface OrderSummaryProps {
  items: OrderItem[];
  user: User;
  roles: Role[];
  taxRate: number;
  isLocked: boolean;
  selectedCustomer: Customer | null;
  onAddCustomerClick: () => void;
  onRemoveCustomerClick: () => void;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  onParkSale: () => void;
  discount: number;
  tip: number;
  onApplyDiscount: (amount: number) => void;
  isMobileView?: boolean;
  onClose?: () => void;
}

const OrderItemRow: React.FC<{
  item: OrderItem;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
}> = ({ item, onUpdateQuantity, onRemoveItem }) => {
  const { formatCurrency, baseCurrencyCode } = useCurrency();
  const { t } = useTranslations();
  const basePrice = item.price[baseCurrencyCode] || 0;

  return (
    <div className="flex items-center p-3">
      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover mr-4" />
      <div className="flex-grow">
        <p className="font-semibold text-text-primary">{item.name}</p>
        <p className="text-sm text-text-secondary">{formatCurrency(basePrice)} {item.sellBy === 'weight' ? `/${t('productCard.perKg')}`: ''}</p>
         {item.sellBy === 'weight' ? (
            <div className="flex items-center mt-2">
                <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                    className="w-24 text-center border border-border rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    step="0.001"
                    min="0"
                />
                <span className="ml-2 font-semibold text-text-secondary">{t('orderSummary.kg')}</span>
            </div>
        ) : (
             <div className="flex items-center mt-2">
                <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="text-text-secondary hover:text-text-primary p-1 rounded-full w-8 h-8 flex items-center justify-center bg-background hover:bg-border font-bold text-lg">-</button>
                <span className="mx-3 w-5 text-center font-bold text-text-primary text-lg">{item.quantity}</span>
                <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="text-text-secondary hover:text-text-primary p-1 rounded-full w-8 h-8 flex items-center justify-center bg-background hover:bg-border font-bold text-lg">+</button>
            </div>
        )}
      </div>
      <div className="text-right">
        <p className="font-bold text-lg text-text-primary mb-2">{formatCurrency(basePrice * item.quantity)}</p>
        <button onClick={() => onRemoveItem(item.id)} className="text-red-500 hover:text-red-700 text-xs hover:underline">
          {t('adminPanel.users.delete')}
        </button>
      </div>
    </div>
  );
};


const OrderSummary: React.FC<OrderSummaryProps> = ({
  items, user, roles, taxRate, isLocked, selectedCustomer, onAddCustomerClick, onRemoveCustomerClick, onUpdateQuantity, onRemoveItem, onClearOrder, onCheckout, onParkSale,
  discount, tip, onApplyDiscount, isMobileView = false, onClose
}) => {
  const permissions = usePermissions(user, roles);
  const { t } = useTranslations();
  const { formatCurrency, baseCurrencyCode } = useCurrency();
  const subtotal = items.reduce((sum, item) => sum + (item.price[baseCurrencyCode] || 0) * item.quantity, 0);
  const subtotalAfterDiscount = subtotal - discount;
  const tax = subtotalAfterDiscount * taxRate;
  const total = subtotalAfterDiscount + tax + tip;

  const handleApplyDiscount = () => {
    const discountInput = prompt(t('orderSummary.enterDiscount'), '0');
    const discountAmount = parseFloat(discountInput || '0');
    if (!isNaN(discountAmount) && discountAmount >= 0) {
      onApplyDiscount(discountAmount);
    }
  }

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border">
      <div className="p-6 border-b border-border">
         {isMobileView && (
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1.5 bg-border rounded-full cursor-grab" onClick={onClose}></div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-text-primary">{t('orderSummary.currentOrder')}</h2>
          {isMobileView ? (
             <button onClick={onClose} className="text-3xl text-text-secondary hover:text-text-primary">&times;</button>
          ) : (
            <div className="flex items-center space-x-2">
                <button onClick={onParkSale} className="text-sm text-yellow-600 hover:underline disabled:text-text-secondary/50 disabled:cursor-not-allowed" disabled={items.length === 0}>{t('orderSummary.parkSale')}</button>
                <button onClick={onClearOrder} className="text-sm text-red-500 hover:underline disabled:text-text-secondary/50 disabled:cursor-not-allowed" disabled={items.length === 0}>{t('orderSummary.clearAll')}</button>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-b border-border">
        {selectedCustomer ? (
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                <div>
                    <p className="text-xs text-blue-800/70 font-medium">{t('orderSummary.customer')}</p>
                    <p className="font-semibold text-blue-900">{selectedCustomer.name}</p>
                </div>
                <button onClick={onRemoveCustomerClick} className="text-xs text-red-500 hover:underline font-semibold">{t('orderSummary.remove')}</button>
            </div>
        ) : (
            <button onClick={onAddCustomerClick} className="w-full flex items-center justify-center space-x-2 p-3 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>
                <span>{t('orderSummary.addCustomer')}</span>
            </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-text-primary/5 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-text-primary font-semibold text-lg">{t('orderSummary.emptyCart')}</p>
          <p className="text-sm text-text-secondary mt-1 max-w-xs">{t('orderSummary.emptyCartMessage')}</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-background/50 divide-y divide-border">
          {items.map(item => <OrderItemRow key={item.id} item={item} onUpdateQuantity={onUpdateQuantity} onRemoveItem={onRemoveItem} />)}
        </div>
      )}
      <div className="p-6 mt-auto bg-surface border-t-2 border-border">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-text-secondary">
            <span className="font-medium">{t('orderSummary.subtotal')}</span>
            <span className="font-medium text-text-primary">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <button onClick={handleApplyDiscount} className="font-medium hover:underline text-blue-600">{t('orderSummary.discount')}</button>
            <span className="font-medium text-red-600">-{formatCurrency(discount)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span className="font-medium">{t('orderSummary.tax')} ({ (taxRate * 100).toFixed(0) }%)</span>
            <span className="font-medium text-text-primary">{formatCurrency(tax)}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-text-secondary">
              <span className="font-medium">{t('orderSummary.tip')}</span>
              <span className="font-medium text-green-600">{formatCurrency(tip)}</span>
            </div>
          )}
          <div className="flex justify-between text-text-primary font-bold text-2xl pt-2 border-t-2 border-dashed border-border mt-3">
            <span>{t('orderSummary.total')}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0 || !permissions.CAN_PROCESS_PAYMENTS || isLocked}
          className="w-full bg-primary text-text-on-primary font-bold py-4 rounded-lg hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/30 flex items-center justify-center text-lg"
          title={isLocked ? t('app.drawerClosedError') : ''}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          <span>
            {permissions.CAN_PROCESS_PAYMENTS ? t('orderSummary.payNow') : t('orderSummary.paymentDisabled')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default OrderSummary;