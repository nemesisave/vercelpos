import React from 'react';
import type { CompletedOrder, BusinessSettings } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CompletedOrder;
  businessSettings: BusinessSettings;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, order, businessSettings }) => {
  const { t } = useTranslations();
  const { formatCurrency, baseCurrencyCode } = useCurrency();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 receipt-modal-wrapper">
      <div className="bg-surface text-text-primary rounded-lg shadow-xl w-full max-w-sm p-6 printable-receipt">
        <div className="text-center mb-6">
          {businessSettings.logoUrl && (
            <img src={businessSettings.logoUrl} alt="Business Logo" className="mx-auto h-16 w-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold">{businessSettings.businessName}</h2>
          {businessSettings.receiptShowAddress && <p className="text-xs text-text-secondary mt-1">{businessSettings.address}</p>}
          {businessSettings.receiptShowPhone && <p className="text-xs text-text-secondary">{businessSettings.phone}</p>}
          {businessSettings.receiptShowTaxId && <p className="text-xs text-text-secondary">{t('receiptModal.taxId')}: {businessSettings.taxId}</p>}
          {businessSettings.receiptHeaderText && <p className="text-xs text-text-secondary mt-2">{businessSettings.receiptHeaderText}</p>}
        </div>

        <div className="text-sm text-text-primary space-y-1 mb-4 border-b pb-4 border-dashed border-border">
          <p className="flex justify-between"><span>{t('receiptModal.invoiceId')}:</span> <span>{order.invoiceId}</span></p>
          <p className="flex justify-between"><span>{t('receiptModal.date')}:</span> <span>{order.date}</span></p>
          <p className="flex justify-between"><span>{t('receiptModal.cashier')}:</span> <span>{order.cashier}</span></p>
        </div>

        <div className="mb-4">
          <div className="flex font-semibold text-sm border-b border-border pb-2">
            <p className="flex-grow">{t('receiptModal.item')}</p>
            <p className="w-8 text-center">{t('receiptModal.qty')}</p>
            <p className="w-20 text-right">{t('receiptModal.total')}</p>
          </div>
          <div className="space-y-2 mt-2 text-sm max-h-48 overflow-y-auto">
            {order.items.map(item => {
              const priceInBase = item.price[baseCurrencyCode] || 0;
              return (
                <div key={item.id} className="flex">
                  <p className="flex-grow">{item.name} <br/> <span className="text-xs text-text-secondary">({item.quantity} &times; {formatCurrency(priceInBase)})</span></p>
                  <p className="w-8 text-center">{item.quantity}</p>
                  <p className="w-20 text-right font-medium">{formatCurrency(item.quantity * priceInBase)}</p>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="border-t border-dashed border-border pt-4 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>{t('receiptModal.subtotal')}</span>
            <span className="font-medium text-text-primary">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>{t('receiptModal.tax')}</span>
            <span className="font-medium text-text-primary">{formatCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-border">
            <span>{t('receiptModal.total')}</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
           <div className="flex justify-between text-text-secondary mt-2">
            <span>{t('receiptModal.paymentMethod')}</span>
            <span className="font-medium capitalize text-text-primary">{t(`checkoutModal.${order.paymentMethod}`)}</span>
          </div>
        </div>
        
        {businessSettings.receiptFooterText && (
            <div className="text-center text-xs text-text-secondary mt-6 border-t border-dashed pt-4">
                <p>{businessSettings.receiptFooterText}</p>
            </div>
        )}

        <div className="mt-8 flex space-x-3 print-hidden">
          <button
            onClick={onClose}
            className="w-full bg-background text-text-primary font-bold py-3 rounded-lg hover:bg-border transition-colors"
          >
            {t('receiptModal.newOrder')}
          </button>
          <button
            onClick={handlePrint}
            className="w-full bg-primary text-text-on-primary font-bold py-3 rounded-lg hover:bg-primary-hover transition-colors"
          >
            {t('receiptModal.printReceipt')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;