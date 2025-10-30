import React from 'react';
import { useCurrency } from '../context/CurrencyContext';

const CurrencySwitcher: React.FC = () => {
    const { currencies, selectedCurrencyCode, setSelectedCurrencyCode } = useCurrency();

    return (
        <div>
            <select
                value={selectedCurrencyCode}
                onChange={(e) => setSelectedCurrencyCode(e.target.value)}
                className="bg-surface border border-border rounded-md shadow-sm pl-3 pr-8 py-2 text-sm font-medium text-text-primary hover:bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                aria-label="Select currency"
            >
                {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                        {currency.code}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default CurrencySwitcher;