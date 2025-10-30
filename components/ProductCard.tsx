import React from 'react';
import type { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTranslations } from '../context/LanguageContext';

interface ProductCardProps {
  product: Product;
  onAddToOrder: (product: Product) => void;
  highlight?: string;
}

const LOW_STOCK_THRESHOLD = 10;

// Utility to escape special characters for regex
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

interface HighlightedNameProps {
  name: string;
  highlight?: string;
}

const HighlightedName: React.FC<HighlightedNameProps> = ({ name, highlight }) => {
    if (!highlight?.trim()) {
      return <>{name}</>;
    }
    // Use a regular expression to split the name by the highlight text, keeping the delimiter
    const safeHighlight = escapeRegExp(highlight);
    const regex = new RegExp(`(${safeHighlight})`, 'gi');
    const parts = name.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={index} className="bg-yellow-200 rounded-sm">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
};


const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToOrder, highlight }) => {
  const { formatCurrency, formatAmount, selectedCurrencyCode, baseCurrencyCode } = useCurrency();
  const { t } = useTranslations();

  const stockStatus = product.stock === 0 ? 'out' : product.stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';
  const isOutOfStock = stockStatus === 'out';

  const getDisplayPrice = () => {
    const priceInSelectedCurrency = product.price[selectedCurrencyCode];
    const basePrice = product.price[baseCurrencyCode] || 0;

    if (priceInSelectedCurrency !== undefined) {
      // A price is defined for this currency. Format it directly.
      return formatAmount(priceInSelectedCurrency, selectedCurrencyCode);
    } else {
      // No specific price. Convert from base price.
      return formatCurrency(basePrice);
    }
  };

  return (
    <div
      onClick={isOutOfStock ? undefined : () => onAddToOrder(product)}
      className={`bg-surface rounded-lg shadow-lg overflow-hidden transform hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isOutOfStock ? t('productCard.outOfStock') : ''}
    >
       {stockStatus !== 'ok' && (
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold leading-none text-white shadow z-10 ${stockStatus === 'low' ? 'bg-orange-500' : 'bg-red-600'}`}>
            {stockStatus === 'low' ? t('productCard.lowStock') : t('productCard.outOfStock')}
          </div>
        )}
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-32 object-cover"
        />
        {!isOutOfStock && (
           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-center justify-center">
             <div className="opacity-0 group-hover:opacity-100 transform group-hover:scale-100 scale-90 transition-all duration-300 flex items-center justify-center bg-primary text-text-on-primary rounded-full w-12 h-12 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
             </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-text-primary truncate">
          <HighlightedName name={product.name} highlight={highlight} />
        </h3>
        <p className="text-text-primary text-lg font-bold mt-1">
            {getDisplayPrice()}
            {product.sellBy === 'weight' && <span className="text-sm font-normal text-text-secondary">/{t('productCard.perKg')}</span>}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;