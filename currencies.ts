export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Exchange rate relative to a common baseline (USD)
}

// Rates are relative to USD as of a fictional point in time.
export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.93 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', rate: 18.10 },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP', rate: 930.00 },
  { code: 'Bs', name: 'Venezuelan Bolívar', symbol: 'Bs', rate: 36.42 },
];
