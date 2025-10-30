import React, { useState } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface CashAdjustmentModalProps {
  isOpen: boolean;
  type: 'in' | 'out';
  onClose: () => void;
  onAdjust: (amount: number, reason: string) => void;
}

const CashAdjustmentModal: React.FC<CashAdjustmentModalProps> = ({ isOpen, type, onClose, onAdjust }) => {
  const { t } = useTranslations();
  const { baseCurrencySymbol } = useCurrency();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert(t('openDrawerModal.invalidAmount'));
      return;
    }
    if (!reason.trim()) {
      alert(t('app.fillAllFields'));
      return;
    }
    
    onAdjust(numericAmount, reason);
    setAmount('');
    setReason('');
    onClose();
  };

  const isPayIn = type === 'in';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">
              {isPayIn ? t('cashAdjustmentModal.addTitle') : t('cashAdjustmentModal.removeTitle')}
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="adjustment-amount" className="block text-sm font-medium text-gray-700">{t('cashAdjustmentModal.amount')}</label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-lg">{baseCurrencySymbol}</span>
                </div>
                <input
                  type="number"
                  name="adjustment-amount"
                  id="adjustment-amount"
                  className="block w-full rounded-md border-gray-300 pl-8 pr-4 py-2 text-lg focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label htmlFor="adjustment-reason" className="block text-sm font-medium text-gray-700">{t('cashAdjustmentModal.reason')}</label>
              <input
                type="text"
                name="adjustment-reason"
                id="adjustment-reason"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('cashAdjustmentModal.reasonPlaceholder')}
                required
              />
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
              {t('cashAdjustmentModal.cancel')}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm ${
                isPayIn
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              {isPayIn ? t('cashAdjustmentModal.add') : t('cashAdjustmentModal.remove')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CashAdjustmentModal;