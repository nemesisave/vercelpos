import React, { useState, useMemo, useEffect } from 'react';
import type { CompletedOrder, OrderItem, RefundTransaction } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CompletedOrder;
  refundTransactions: RefundTransaction[];
  onProcessRefund: (originalInvoiceId: string, itemsToRefund: { id: number; quantity: number }[], restock: boolean) => void;
}

const RefundModal: React.FC<RefundModalProps> = ({ isOpen, onClose, order, refundTransactions, onProcessRefund }) => {
  const { t } = useTranslations();
  const { formatCurrency, baseCurrencyCode } = useCurrency();
  const [refundQuantities, setRefundQuantities] = useState<Record<number, number>>({});
  const [restock, setRestock] = useState(true);

  const previouslyRefundedQtys = useMemo(() => {
    const qtys: Record<number, number> = {};
    const relevantRefunds = refundTransactions.filter(
        (t) => t.originalInvoiceId === order.invoiceId
    );

    // Initialize with 0 for all items in the order
    for (const item of order.items) {
        qtys[item.id] = 0;
    }

    // Sum up quantities from all previous refunds for this order
    for (const refund of relevantRefunds) {
        for (const refundedItem of refund.items) {
            qtys[refundedItem.id] = (qtys[refundedItem.id] || 0) + refundedItem.quantity;
        }
    }
    return qtys;
  }, [order.invoiceId, order.items, refundTransactions]);


  useEffect(() => {
    // Reset state when a new order is passed in
    setRefundQuantities({});
    setRestock(true);
  }, [order.invoiceId]);
  
  const { refundItems, totalRefund } = useMemo(() => {
    const items: { id: number; quantity: number }[] = [];
    let subtotal = 0;
    
    for (const id in refundQuantities) {
      const qty = refundQuantities[id];
      if (qty > 0) {
        const originalItem = order.items.find(i => i.id === Number(id));
        if (originalItem) {
          items.push({ id: Number(id), quantity: qty });
          subtotal += (originalItem.price[baseCurrencyCode] || 0) * qty;
        }
      }
    }
    
    const taxRate = order.subtotal > 0 ? order.tax / (order.subtotal - (order.discount || 0)) : 0;
    const total = subtotal * (1 + taxRate);

    return { refundItems: items, totalRefund: total };
  }, [refundQuantities, order, baseCurrencyCode]);

  if (!isOpen) return null;

  const handleQtyChange = (item: OrderItem, value: string) => {
    const qty = parseInt(value, 10);
    const previouslyRefunded = previouslyRefundedQtys[item.id] || 0;
    const maxRefundable = item.quantity - previouslyRefunded;
    
    if (isNaN(qty) || qty < 0) {
      setRefundQuantities(prev => ({ ...prev, [item.id]: 0 }));
    } else if (qty > maxRefundable) {
      setRefundQuantities(prev => ({ ...prev, [item.id]: maxRefundable }));
    } else {
      setRefundQuantities(prev => ({ ...prev, [item.id]: qty }));
    }
  };

  const handleSubmit = () => {
    if (refundItems.length === 0) {
      alert(t('refundModal.error_noItems'));
      return;
    }
    onProcessRefund(order.invoiceId, refundItems, restock);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{t('refundModal.title')} #{order.invoiceId}</h2>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          <div className="bg-white rounded-lg border">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 p-4 font-semibold text-xs text-gray-600 border-b bg-gray-50">
              <div className="col-span-2">{t('refundModal.item')}</div>
              <div className="text-center">{t('refundModal.orderedQty')}</div>
              <div className="text-center">{t('refundModal.refundedQty')}</div>
              <div className="text-center">{t('refundModal.price')}</div>
              <div className="text-center">{t('refundModal.refundQty')}</div>
            </div>
            {/* Body */}
            <div className="divide-y">
              {order.items.map(item => {
                const previouslyRefunded = previouslyRefundedQtys[item.id] || 0;
                const maxRefundable = item.quantity - previouslyRefunded;
                return (
                    <div key={item.id} className="grid grid-cols-6 gap-4 p-4 items-center">
                    <div className="col-span-2 font-medium text-gray-800 text-sm">{item.name}</div>
                    <div className="text-center text-gray-700 font-medium">{item.quantity}</div>
                    <div className="text-center text-gray-500 font-medium">{previouslyRefunded}</div>
                    <div className="text-center text-gray-700">{formatCurrency(item.price[baseCurrencyCode] || 0)}</div>
                    <div className="text-center">
                        <input
                        type="number"
                        value={refundQuantities[item.id] || 0}
                        onChange={e => handleQtyChange(item, e.target.value)}
                        className="w-20 text-center border border-gray-300 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        min="0"
                        max={maxRefundable}
                        disabled={maxRefundable === 0}
                        />
                    </div>
                    </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 flex items-center">
            <input
              type="checkbox"
              id="restock-checkbox"
              checked={restock}
              onChange={e => setRestock(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="restock-checkbox" className="ml-2 block text-sm text-gray-900">{t('refundModal.restock')}</label>
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex justify-between items-center mt-auto border-t">
          <div className="text-lg font-bold">
            {t('refundModal.totalRefund')}: <span className="text-red-600">{formatCurrency(totalRefund)}</span>
          </div>
          <div className="space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('refundModal.cancel')}</button>
            <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700">{t('refundModal.confirm')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;