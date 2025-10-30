
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { Currency } from '../currencies';
import type { BusinessSettings } from '../types';

interface CurrencyContextType {
  formatCurrency: (amount: number) => string;
  formatAmount: (amount: number, currencyCode: string) => string;
  setSelectedCurrencyCode: (code: string) => void;
  selectedCurrencyCode: string;
  currencies: Currency[];
  baseCurrencyCode: string;
  baseCurrencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode, businessSettings: BusinessSettings, currencies: Currency[] }> = ({ children, businessSettings, currencies }) => {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(
    businessSettings.defaultDisplayCurrency || businessSettings.currency
  );
  
  // This effect ensures that if the default display currency is changed in settings,
  // the UI updates to reflect that new default immediately.
  useEffect(() => {
    setSelectedCurrencyCode(businessSettings.defaultDisplayCurrency || businessSettings.currency);
  }, [businessSettings.defaultDisplayCurrency, businessSettings.currency]);

  const baseCurrencyCode = businessSettings.currency;
  const baseCurrency = currencies.find(c => c.code === baseCurrencyCode);

  const formatAmount = useCallback((amount: number, currencyCode: string): string => {
    const currency = currencies.find(c => c.code === currencyCode);
    if (!currency) return amount.toString(); // Fallback

    if (currency.code === 'Bs') {
      const formattedNumber = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${currency.symbol} ${formattedNumber}`;
    }

    if (currency.code === 'CLP') {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        currencyDisplay: 'code', // Use currency code instead of symbol
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
        currencyDisplay: 'symbol',
      }).format(amount);
    } catch (e) {
      console.warn(`Could not format currency for code: ${currency.code}. Falling back to symbol prefix.`, e);
      const formattedNumber = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${currency.symbol}${formattedNumber}`;
    }
  }, [currencies]);

  const formatCurrency = useCallback((amountInBase: number): string => {
    const selectedCurrency = currencies.find(c => c.code === selectedCurrencyCode);
    const baseRate = currencies.find(c => c.code === baseCurrencyCode)?.rate || 1;
    
    if (!selectedCurrency) {
      // Fallback to base currency if selected is not found
      return formatAmount(amountInBase, baseCurrencyCode);
    }

    // Convert the base currency amount to the common baseline (USD), then to the selected currency
    const amountInBaseline = amountInBase / baseRate;
    const convertedAmount = amountInBaseline * selectedCurrency.rate;

    return formatAmount(convertedAmount, selectedCurrencyCode);

  }, [selectedCurrencyCode, baseCurrencyCode, currencies, formatAmount]);


  const value = {
    formatCurrency,
    formatAmount,
    selectedCurrencyCode,
    setSelectedCurrencyCode,
    currencies: currencies,
    baseCurrencyCode,
    baseCurrencySymbol: baseCurrency?.symbol || '$',
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};