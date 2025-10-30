import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '../types';
import ProductCard from './ProductCard';
import { useTranslations } from '../context/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';

const CategoryFilters: React.FC<{
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}> = ({ categories, selectedCategory, onSelectCategory }) => {
  const { t } = useTranslations();
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
      <button
        onClick={() => onSelectCategory('All')}
        className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-primary text-text-on-primary' : 'bg-surface text-text-primary hover:bg-background'}`}
      >
        {t('adminPanel.inventory.allCategories')}
      </button>
      {categories.map(category => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${selectedCategory === category ? 'bg-primary text-text-on-primary' : 'bg-surface text-text-primary hover:bg-background'}`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};


interface ProductGridProps {
  products: Product[];
  onAddToOrder: (product: Product) => void;
  isLocked: boolean;
  onVoiceCommand: (command: string) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToOrder, isLocked, onVoiceCommand }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isListening, setIsListening] = useState(false);
  const { t } = useTranslations();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products]);

  const filteredProducts = useMemo(() => {
    let tempProducts = products;
    
    if (selectedCategory !== 'All') {
      tempProducts = tempProducts.filter(p => p.category === selectedCategory);
    }
    
    if (debouncedSearchQuery.trim() !== '') {
      const lowercasedQuery = debouncedSearchQuery.toLowerCase();
      tempProducts = tempProducts.filter(p =>
        p.name.toLowerCase().includes(lowercasedQuery) ||
        p.category.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    return tempProducts;
  }, [products, debouncedSearchQuery, selectedCategory]);
  
  const handleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Or use the current app language
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      onVoiceCommand(command);
    };

    recognition.start();
  };

  return (
    <div className="relative">
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder={t('productGrid.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-20 text-text-primary bg-surface border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search products"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-text-secondary hover:text-text-primary rounded-full p-1"
                aria-label={t('productGrid.clearSearch')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={handleVoiceRecognition}
              className={`p-1 rounded-full ${isListening ? 'text-red-500 animate-pulse' : 'text-text-secondary hover:text-text-primary'}`}
              title="Voice command"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
          </div>
        </div>
        <CategoryFilters categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      </div>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 ${isLocked ? 'pointer-events-none' : ''}`}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToOrder={onAddToOrder} 
              highlight={debouncedSearchQuery} 
            />
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-text-secondary font-medium">{t('productGrid.noProductsFound')}</p>
            <p className="text-sm text-text-secondary/70 mt-1">{t('productGrid.noProductsMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;