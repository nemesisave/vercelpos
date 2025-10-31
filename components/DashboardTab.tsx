import React, { useMemo, useState } from 'react';
import type { CompletedOrder, Product } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePermissions } from '../hooks/usePermissions';

interface DashboardTabProps {
  completedOrders: CompletedOrder[];
  products: Product[];
  permissions: ReturnType<typeof usePermissions>;
}

type DateRange = 'today' | 'week' | 'month' | 'all';

const StatCard: React.FC<{ title: string; value: string; subtext?: string; icon: React.ReactNode }> = ({ title, value, subtext, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
    <div className="bg-blue-100 text-blue-600 rounded-full p-3">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800 truncate" title={value}>{value}</p>
      {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
    </div>
  </div>
);

const CategorySalesChart: React.FC<{ data: { name: string, value: number, formattedValue: string }[] }> = ({ data }) => {
    const { t } = useTranslations();
    const totalRevenue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    const sortedData = useMemo(() => data.sort((a, b) => b.value - a.value), [data]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('adminPanel.dashboard.salesByCategory')}</h3>
            <div className="space-y-3 overflow-y-auto">
                {sortedData.map((item, index) => {
                    const percentage = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
                    return (
                        <div key={index} className="text-sm">
                            <div className="flex justify-between mb-1">
                                <span className="font-medium text-gray-700">{item.name}</span>
                                <span className="font-semibold text-gray-600">{item.formattedValue}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface DateFilterButtonProps {
  value: DateRange;
  label: string;
  currentDateRange: DateRange;
  onClick: (value: DateRange) => void;
}

const DateFilterButton: React.FC<DateFilterButtonProps> = ({ value, label, currentDateRange, onClick }) => (
    <button
      onClick={() => onClick(value)}
      className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
        currentDateRange === value ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
);

const DashboardTab: React.FC<DashboardTabProps> = ({ completedOrders, products, permissions }) => {
  const { t } = useTranslations();
  const { formatCurrency, baseCurrencyCode } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const filteredOrders = useMemo(() => {
    if (dateRange === 'all') return completedOrders;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const startOfWeek = new Date(d.setDate(diff));
        return new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
    };
    
    return completedOrders.filter(order => {
        const orderTimestamp = parseInt(order.invoiceId.replace('INV-', ''), 10);
        if (isNaN(orderTimestamp)) return false;
        const orderDate = new Date(orderTimestamp);

        switch (dateRange) {
            case 'today':
                return isSameDay(orderDate, today);
            case 'week':
                const startOfWeek = getStartOfWeek(now);
                return orderDate >= startOfWeek;
            case 'month':
                return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    });
  }, [completedOrders, dateRange]);


  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const totalSales = filteredOrders.length;
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const productSales = new Map<number, number>();
    const productProfits = new Map<number, number>();
    
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        productSales.set(item.id, (productSales.get(item.id) || 0) + item.quantity);
        const salePrice = item.price[baseCurrencyCode] || 0;
        const purchasePrice = item.purchasePrice[baseCurrencyCode] || 0;
        const profit = (salePrice - purchasePrice) * item.quantity;
        productProfits.set(item.id, (productProfits.get(item.id) || 0) + profit);
      });
    });

    const topSellingProductId = [...productSales.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topSellingProduct = products.find(p => p.id === topSellingProductId);

    const topProfitableProductId = [...productProfits.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topProfitableProduct = products.find(p => p.id === topProfitableProductId);
      
    const salesByCategory = filteredOrders.reduce((acc, order) => {
        order.items.forEach(item => {
            const salePrice = item.price[baseCurrencyCode] || 0;
            acc[item.category] = (acc[item.category] || 0) + (salePrice * item.quantity);
        });
        return acc;
    }, {} as Record<string, number>);

    const categoryChartData = Object.entries(salesByCategory)
        .map(([name, value]) => ({ name, value, formattedValue: formatCurrency(value) }));

    return {
      totalRevenue,
      totalSales,
      averageSaleValue,
      topSellingProduct,
      topProfitableProduct,
      categoryChartData,
    };

  }, [filteredOrders, products, formatCurrency, baseCurrencyCode]);

  if (completedOrders.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-gray-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-gray-500 font-medium">{t('adminPanel.dashboard.noData')}</p>
        <p className="text-sm text-gray-400 mt-1">{t('adminPanel.dashboard.noDataMessage')}</p>
      </div>
    );
  }
  
  return (
    <div className="flex-grow p-6 overflow-y-auto bg-gray-50">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white rounded-full shadow-sm border p-1">
                <DateFilterButton value="today" label={t('adminPanel.dashboard.filterToday')} currentDateRange={dateRange} onClick={setDateRange} />
                <DateFilterButton value="week" label={t('adminPanel.dashboard.filterWeek')} currentDateRange={dateRange} onClick={setDateRange} />
                <DateFilterButton value="month" label={t('adminPanel.dashboard.filterMonth')} currentDateRange={dateRange} onClick={setDateRange} />
                <DateFilterButton value="all" label={t('adminPanel.dashboard.filterAll')} currentDateRange={dateRange} onClick={setDateRange} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
        <StatCard title={t('adminPanel.dashboard.totalRevenue')} value={formatCurrency(stats.totalRevenue)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
        <StatCard title={t('adminPanel.dashboard.totalSales')} value={stats.totalSales.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <StatCard title={t('adminPanel.dashboard.avgSale')} value={formatCurrency(stats.averageSaleValue)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <StatCard title={t('adminPanel.dashboard.bestSeller')} value={stats.topSellingProduct?.name || 'N/A'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>} />
        <StatCard title={t('adminPanel.dashboard.mostProfitableItem')} value={stats.topProfitableProduct?.name || 'N/A'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategorySalesChart data={stats.categoryChartData} />
        {/* Placeholder for another chart or table if needed */}
        <div className="bg-white p-6 rounded-lg shadow-md">
           <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('adminPanel.dashboard.topProducts')}</h3>
           <p className="text-sm text-gray-500">Placeholder for another detailed view.</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;