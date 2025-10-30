import React, { useState, useEffect } from 'react';
import type { Product, ProductUpdatePayload } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSave: (productId: number, updates: ProductUpdatePayload) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, product, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sellBy, setSellBy] = useState<'unit' | 'weight'>('unit');
  const { t } = useTranslations();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setImageUrl(product.imageUrl);
      setSellBy(product.sellBy);
    }
  }, [product]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !category) {
        alert(t('app.fillAllFields'));
        return;
    }
    
    const updates: ProductUpdatePayload = {};
    if (name !== product.name) updates.name = name;
    if (category !== product.category) updates.category = category;
    if (imageUrl !== product.imageUrl) updates.imageUrl = imageUrl;
    if (sellBy !== product.sellBy) updates.sellBy = sellBy;

    if (Object.keys(updates).length > 0) {
        onSave(product.id, updates);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">{t('productModal.editTitle')}</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">{t('addProductModal.productName')}</label>
              <input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">{t('addProductModal.category')}</label>
                    <input type="text" id="edit-category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                </div>
                <div>
                    <label htmlFor="edit-sellBy" className="block text-sm font-medium text-gray-700">{t('addProductModal.sellBy')}</label>
                     <select id="edit-sellBy" value={sellBy} onChange={e => setSellBy(e.target.value as 'unit' | 'weight')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="unit">{t('addProductModal.unit')}</option>
                        <option value="weight">{t('addProductModal.weight')}</option>
                    </select>
                </div>
            </div>
            <div>
              <label htmlFor="edit-imageUrl" className="block text-sm font-medium text-gray-700">{t('addProductModal.imageUrl')}</label>
              <input type="text" id="edit-imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <p className="text-xs text-gray-500">Nota: El precio y el stock se editan directamente en la lista de inventario.</p>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('addProductModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('editUserModal.saveChanges')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;