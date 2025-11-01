import React, { useState } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface OpenDrawerModalProps {
  isOpen: boolean;
  onOpenDrawer: (startingCash: number) => void;
  onClose: () => void;
}

const OpenDrawerModal: React.FC<OpenDrawerModalProps> = ({ isOpen, onOpenDrawer, onClose }) => {
  const [amount, setAmount] = useState('');
  const { t } = useTranslations();
  const { baseCurrencySymbol } = useCurrency();

  const handleOpen = () => {
    const cashAmount = parseFloat(amount);
    if (isNaN(cashAmount) || cashAmount < 0) {
      alert(t('openDrawerModal.invalidAmount'));
      return;
    }
    onOpenDrawer(cashAmount);
    setAmount('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100] p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm p-8 text-center relative">
        <button type="button" onClick={onClose} className="absolute top-2 right-2 text-text-secondary/50 hover:text-text-primary text-3xl leading-none">&times;</button>
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <h2 className="text-2xl font-bold text-text-primary mb-2">{t('openDrawerModal.title')}</h2>
        <p className="text-text-secondary mb-6">{t('openDrawerModal.message')}</p>
        
        <div className="mb-6">
          <label htmlFor="starting-cash" className="block text-sm font-medium text-text-primary sr-only">{t('openDrawerModal.label')}</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-text-secondary sm:text-lg">{baseCurrencySymbol}</span>
            </div>
            <input
              type="number"
              name="starting-cash"
              id="starting-cash"
              className="block w-full bg-background text-text-primary rounded-md border-border pl-8 pr-4 py-3 text-center text-2xl focus:border-primary focus:ring-primary"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                    handleOpen();
                }
              }}
            />
          </div>
        </div>

        <button
          onClick={handleOpen}
          className="w-full bg-primary text-text-on-primary font-bold py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-primary/50"
          disabled={!amount}
        >
          {t('openDrawerModal.button')}
        </button>
      </div>
    </div>
  );
};

export default OpenDrawerModal;