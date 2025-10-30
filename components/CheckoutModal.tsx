import React, { useState, useMemo } from 'react';
import type { OrderItem, PaymentMethod } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  taxRate: number;
  discount: number;
  tip: number;
  onTipChange: (tip: number) => void;
  onPaymentSuccess: (paymentMethod: PaymentMethod) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, orderItems, taxRate, discount, tip, onTipChange, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customTip, setCustomTip] = useState('');

  const { t } = useTranslations();
  const { formatCurrency, baseCurrencyCode, baseCurrencySymbol } = useCurrency();

  const subtotal = useMemo(() => orderItems.reduce((sum, item) => sum + (item.price[baseCurrencyCode] || 0) * item.quantity, 0), [orderItems, baseCurrencyCode]);

  if (!isOpen) return null;

  const subtotalAfterDiscount = subtotal - discount;
  const tax = subtotalAfterDiscount * taxRate;
  const total = subtotalAfterDiscount + tax + tip;

  const handlePayment = () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      onPaymentSuccess(paymentMethod);
      setIsProcessing(false);
      onTipChange(0);
      setCustomTip('');
    }, 1500);
  };

  const handleTipSelection = (percentage: number) => {
    onTipChange(subtotalAfterDiscount * percentage);
    setCustomTip('');
  }
  
  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value);
    onTipChange(isNaN(amount) ? 0 : amount);
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-text-primary">{t('checkoutModal.checkout')}</h2>
            <button onClick={onClose} className="text-text-secondary/50 hover:text-text-secondary text-2xl">&times;</button>
          </div>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <p className="text-center text-text-secondary mb-2">{t('checkoutModal.totalAmountDue')}</p>
          <p className="text-center text-5xl font-bold text-primary mb-6">{formatCurrency(total)}</p>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-text-primary">{t('checkoutModal.addTip')}</h3>
            <div className="grid grid-cols-4 gap-2">
                {[0.10, 0.15, 0.20].map(p => (
                    <button key={p} onClick={() => handleTipSelection(p)} className={`p-2 border-2 rounded-lg transition-all ${tip === subtotalAfterDiscount * p && customTip === '' ? 'border-primary bg-primary/10' : 'border-border hover:bg-background'}`}>
                        {(p*100)}%
                    </button>
                ))}
                <div className="relative">
                     <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary text-sm">{baseCurrencySymbol}</span>
                    <input type="number" placeholder={t('checkoutModal.custom')} value={customTip} onChange={e => handleCustomTipChange(e.target.value)} className="w-full p-2 border-2 rounded-lg pl-8 focus:border-primary focus:ring-0 bg-transparent" />
                </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-text-primary">{t('checkoutModal.paymentMethod')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${paymentMethod === 'card' ? 'border-primary bg-primary/10 shadow-inner' : 'border-border hover:border-primary/50 bg-background/50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <span className="font-semibold text-text-primary">{t('checkoutModal.card')}</span>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${paymentMethod === 'cash' ? 'border-green-500 bg-green-500/10 shadow-inner' : 'border-border hover:border-green-400/50 bg-background/50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="font-semibold text-text-primary">{t('checkoutModal.cash')}</span>
              </button>
            </div>
          </div>
           <div className="text-center mb-6">
                <button disabled title={t('app.featureNotImplemented')} className="text-sm text-blue-600/50 cursor-not-allowed">{t('checkoutModal.splitBill')}</button>
           </div>

          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('checkoutModal.processing')}
              </>
            ) : t('checkoutModal.confirmPayment')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;