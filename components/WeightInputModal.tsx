import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface WeightInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onConfirm: (product: Product, weight: number) => void;
  currentWeight?: number;
}

const WeightInputModal: React.FC<WeightInputModalProps> = ({ isOpen, onClose, product, onConfirm, currentWeight }) => {
  const [weight, setWeight] = useState(currentWeight ? currentWeight.toString() : '');
  const { t } = useTranslations();
  const { formatCurrency, baseCurrencyCode } = useCurrency();

  useEffect(() => {
    setWeight(currentWeight ? currentWeight.toString() : '');
  }, [currentWeight, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericWeight = parseFloat(weight);
    if (isNaN(numericWeight) || numericWeight <= 0) {
      alert(t('weightInputModal.invalidWeight'));
      return;
    }
    onConfirm(product, numericWeight);
  };
  
  const priceInBase = product.price[baseCurrencyCode] || 0;
  const currentPrice = priceInBase * (parseFloat(weight) || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-text-primary mb-2">
              {t('weightInputModal.title').replace('{productName}', product.name)}
            </h2>
            <p className="text-text-secondary mb-4">{t('weightInputModal.enterWeightInKg')}</p>

            <div className="mb-4">
              <label htmlFor="weight-input" className="sr-only">{t('weightInputModal.weightKg')}</label>
              <div className="relative">
                <input
                  id="weight-input"
                  type="number"
                  step="0.001"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full text-center text-4xl font-bold border-b-2 bg-transparent p-2 focus:outline-none focus:border-primary"
                  autoFocus
                  placeholder="0.000"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-secondary">{t('orderSummary.kg')}</span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-primary mb-6">{formatCurrency(currentPrice)}</p>

          </div>
          <div className="p-4 bg-background flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface border border-border rounded-md shadow-sm hover:bg-background">
              {t('addProductModal.cancel')}
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover">
              {currentWeight ? t('weightInputModal.updateWeight') : t('weightInputModal.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WeightInputModal;