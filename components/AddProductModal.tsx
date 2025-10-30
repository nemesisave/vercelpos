import React, { useState, useEffect } from 'react';
import type { NewProductPayload, BusinessSettings } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (data: NewProductPayload) => void;
  businessSettings: BusinessSettings;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onAddProduct, businessSettings }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('https://picsum.photos/400/300');
  const [sellBy, setSellBy] = useState<'unit' | 'weight'>('unit');
  const { t } = useTranslations();
  const { currencies } = useCurrency();

  const baseCurrencyCode = businessSettings.currency;
  const baseCurrency = currencies.find(c => c.code === baseCurrencyCode);
  
  useEffect(() => {
    if (isOpen) {
      // Reset for new product
      setName('');
      setCategory('');
      setPrice('');
      setPurchasePrice('');
      setStock('');
      setSellBy('unit');
      setImageUrl(`https://picsum.photos/400/300?random=${Date.now()}`);
    }
  }, [isOpen]);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !category || !price || !purchasePrice || !stock) {
        alert(t('app.fillAllFields'));
        return;
    }
    
    const finalPrices: { [key: string]: number } = {
      [baseCurrencyCode]: parseFloat(price)
    };
    const finalPurchasePrices: { [key: string]: number } = {
      [baseCurrencyCode]: parseFloat(purchasePrice)
    };

    onAddProduct({
      name, category, sellBy, imageUrl,
      price: finalPrices,
      purchasePrice: finalPurchasePrices,
      stock: parseFloat(stock),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">{t('addProductModal.title')}</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Form fields */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('addProductModal.productName')}</label>
              <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">{t('addProductModal.category')}</label>
                    <input type="text" id="category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                </div>
                <div>
                    <label htmlFor="sellBy" className="block text-sm font-medium text-gray-700">{t('addProductModal.sellBy')}</label>
                     <select id="sellBy" value={sellBy} onChange={e => setSellBy(e.target.value as 'unit' | 'weight')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="unit">{t('addProductModal.unit')}</option>
                        <option value="weight">{t('addProductModal.weight')}</option>
                    </select>
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      {sellBy === 'unit' ? t('addProductModal.salePrice') : t('addProductModal.pricePerKg')} ({baseCurrency?.code})
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">{baseCurrency?.symbol}</span>
                      <input 
                          type="number" 
                          id="price"
                          step="0.01" 
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          className="pl-8 pr-2 py-2 w-full border rounded-md shadow-sm focus:outline-none sm:text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          required
                      />
                    </div>
                </div>
                <div>
                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">
                      {sellBy === 'unit' ? t('addProductModal.costPrice') : t('addProductModal.costPerKg')} ({baseCurrency?.code})
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">{baseCurrency?.symbol}</span>
                      <input 
                          type="number" 
                          id="purchasePrice"
                          step="0.01" 
                          value={purchasePrice}
                          onChange={e => setPurchasePrice(e.target.value)}
                          className="pl-8 pr-2 py-2 w-full border rounded-md shadow-sm focus:outline-none sm:text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          required
                      />
                    </div>
                </div>
            </div>
            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700">{sellBy === 'unit' ? t('addProductModal.initialStock') : t('addProductModal.stockInKg')}</label>
              <input type="number" step={sellBy === 'weight' ? "0.001" : "1"} id="stock" value={stock} onChange={e => setStock(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">{t('addProductModal.imageUrl')}</label>
              <input type="text" id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('addProductModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('addProductModal.addProduct')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;