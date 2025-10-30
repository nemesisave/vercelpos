import React, { useState, useEffect, useMemo } from 'react';
import type { Product, ProductUpdatePayload } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface InventoryCountTabProps {
  products: Product[];
  onUpdateProduct: (productId: number, updates: ProductUpdatePayload) => void;
  onExit?: () => void;
}

// Sub-component for the confirmation modal
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  discrepancies: { product: Product; expected: number; counted: number; impact: number }[];
}> = ({ isOpen, onClose, onConfirm, discrepancies }) => {
    const { t } = useTranslations();
    const { formatCurrency } = useCurrency();
    if (!isOpen) return null;

    const message = t('adminPanel.inventoryCount.confirmModalMessage').replace('{count}', String(discrepancies.length));
    const totalImpact = discrepancies.reduce((sum, d) => sum + d.impact, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{t('adminPanel.inventoryCount.confirmModalTitle')}</h2>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-gray-600 mb-4">
                        {message}
                    </p>
                    <h3 className="font-semibold mb-2">{t('adminPanel.inventoryCount.discrepancyReport')}</h3>
                    <div className="bg-gray-50 p-2 rounded-md border text-xs">
                        <div className="grid grid-cols-6 gap-2 font-bold text-gray-700">
                            <div className="col-span-3">{t('adminPanel.inventoryCount.product')}</div>
                            <div className="text-center">{t('adminPanel.inventoryCount.expectedStock')}</div>
                            <div className="text-center">{t('adminPanel.inventoryCount.countedStock')}</div>
                            <div className="text-right">{t('adminPanel.inventoryCount.financialImpact')}</div>
                        </div>
                        <ul className="divide-y mt-1">
                            {discrepancies.map(({ product, expected, counted, impact }) => (
                                <li key={product.id} className="grid grid-cols-6 gap-2 py-1 items-center">
                                    <div className="col-span-3 font-medium">{product.name}</div>
                                    <div className="text-center">{expected}</div>
                                    <div className="text-center font-bold">{counted}</div>
                                    <div className={`text-right font-semibold ${
                                        impact === 0 ? 'text-gray-500' :
                                        impact > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {impact > 0 ? '+' : ''}{formatCurrency(impact)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div className="mt-4 pt-4 border-t text-sm">
                        <div className="flex justify-between font-bold text-base">
                            <span>{t('adminPanel.inventoryCount.netDifference')}:</span>
                            <span className={totalImpact === 0 ? 'text-gray-800' : totalImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                                {totalImpact > 0 ? '+' : ''}{formatCurrency(totalImpact)}
                            </span>
                        </div>
                        <p className="text-xs text-right text-gray-500 mt-1">
                            {totalImpact < 0 ? t('adminPanel.inventoryCount.lossWarning').replace('{amount}', formatCurrency(Math.abs(totalImpact))) :
                            totalImpact > 0 ? t('adminPanel.inventoryCount.surplusInfo').replace('{amount}', formatCurrency(totalImpact)) :
                            t('adminPanel.inventoryCount.balancedInfo')}
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('adminPanel.inventoryCount.cancel')}</button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('adminPanel.inventoryCount.confirm')}</button>
                </div>
            </div>
        </div>
    );
};


const InventoryCountTab: React.FC<InventoryCountTabProps> = ({ products, onUpdateProduct, onExit }) => {
    const { t } = useTranslations();
    const { formatCurrency, baseCurrencyCode } = useCurrency();
    const [counts, setCounts] = useState<Record<number, string>>({});
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

    useEffect(() => {
        // Initialize counts with current stock values
        const initialCounts = products.reduce((acc, product) => {
            acc[product.id] = product.stock.toString();
            return acc;
        }, {} as Record<number, string>);
        setCounts(initialCounts);
    }, [products]);

    const handleCountChange = (productId: number, value: string) => {
        setCounts(prev => ({
            ...prev,
            [productId]: value,
        }));
    };

    const discrepancies = useMemo(() => {
        return products.map(product => {
            const expected = product.stock;
            const countedStr = counts[product.id];
            const counted = product.sellBy === 'weight' ? parseFloat(countedStr) : parseInt(countedStr, 10);
            const difference = isNaN(counted) ? 0 : counted - expected;
            const impact = difference * (product.purchasePrice[baseCurrencyCode] || 0);
            return { product, expected, counted, impact };
        }).filter(item => !isNaN(item.counted) && item.expected !== item.counted);
    }, [products, counts, baseCurrencyCode]);

    const handleReview = () => {
        if (discrepancies.length === 0) {
            alert(t('adminPanel.inventoryCount.noChanges'));
            return;
        }
        setConfirmModalOpen(true);
    };

    const handleConfirmUpdate = () => {
        discrepancies.forEach(({ product, counted }) => {
            onUpdateProduct(product.id, { stock: counted });
        });
        setConfirmModalOpen(false);
        alert(t('adminPanel.inventoryCount.updateSuccess'));
    };
    
    return (
        <div className="flex-grow flex flex-col p-6 overflow-hidden bg-gray-50">
            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800">{t('adminPanel.inventoryCount.title')}</h3>
                <p className="text-sm text-gray-500">{t('adminPanel.inventoryCount.description')}</p>
            </div>

            <div className="flex-grow overflow-y-auto -mx-6 px-6">
                <div className="bg-white rounded-lg shadow-sm border">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 font-semibold text-xs text-gray-600 border-b bg-gray-50 sticky top-0">
                        <div className="col-span-4">Product</div>
                        <div className="col-span-2 text-center">{t('adminPanel.inventoryCount.expectedStock')}</div>
                        <div className="col-span-2 text-center">{t('adminPanel.inventoryCount.countedStock')}</div>
                        <div className="col-span-1 text-center">{t('adminPanel.inventoryCount.difference')}</div>
                        <div className="col-span-3 text-center">{t('adminPanel.inventoryCount.financialImpact')}</div>
                    </div>
                    {/* Rows */}
                    <div className="divide-y">
                        {products.map(product => {
                            const expected = product.stock;
                            const countedStr = counts[product.id] || '';
                            const counted = product.sellBy === 'weight' ? parseFloat(countedStr) : parseInt(countedStr, 10);
                            const difference = isNaN(counted) ? 0 : counted - expected;
                            const impact = difference * (product.purchasePrice[baseCurrencyCode] || 0);

                            return (
                                <div key={product.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                                    <div className="col-span-4 flex items-center">
                                        <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-md object-cover mr-4" />
                                        <span className="font-medium text-gray-800 text-sm">{product.name}</span>
                                    </div>
                                    <div className="col-span-2 text-center text-gray-700 font-medium">{product.sellBy === 'weight' ? expected.toFixed(3) : expected}</div>
                                    <div className="col-span-2 text-center">
                                        <input
                                            type="number"
                                            value={countedStr}
                                            step={product.sellBy === 'weight' ? "0.001" : "1"}
                                            onChange={(e) => handleCountChange(product.id, e.target.value)}
                                            className="w-24 text-center border border-gray-300 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className={`col-span-1 text-center font-bold text-lg ${
                                        difference === 0 ? 'text-gray-400' :
                                        difference > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {difference > 0 ? `+${product.sellBy === 'weight' ? difference.toFixed(3) : difference}` : (product.sellBy === 'weight' ? difference.toFixed(3) : difference)}
                                    </div>
                                    <div className={`col-span-3 text-center font-bold text-lg ${
                                        impact === 0 ? 'text-gray-400' :
                                        impact > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {impact > 0 ? '+' : ''}{formatCurrency(impact)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t mt-4 flex justify-end space-x-3">
                {onExit && (
                    <button 
                        type="button"
                        onClick={onExit}
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {t('adminPanel.inventoryCount.cancel')}
                    </button>
                )}
                <button 
                    onClick={handleReview}
                    disabled={discrepancies.length === 0}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {t('adminPanel.inventoryCount.reviewButton')} ({discrepancies.length})
                </button>
            </div>
            
            <ConfirmationModal 
                isOpen={isConfirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleConfirmUpdate}
                discrepancies={discrepancies}
            />
        </div>
    );
};

export default InventoryCountTab;