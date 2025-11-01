import React, { useState, useMemo } from 'react';
import type { CashDrawerSession, CashDrawerActivity } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import CashAdjustmentModal from './CashAdjustmentModal';
import SessionReportModal from './SessionReportModal';

interface CashDrawerTabProps {
  currentSession: CashDrawerSession | null;
  sessionHistory: CashDrawerSession[];
  onCloseDrawer: (countedCash: number) => void;
  onPayIn: (amount: number, reason: string) => void;
  onPayOut: (amount: number, reason: string) => void;
}

const ActivityIcon: React.FC<{ activity: CashDrawerActivity }> = ({ activity }) => {
    const iconMap = {
        'sale': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H4.792L4.25 1H3z" /><path d="M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>,
        'pay-in': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>,
        'pay-out': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>,
    };
    const colorMap = {
        'sale': 'text-blue-500 bg-blue-100',
        'pay-in': 'text-green-500 bg-green-100',
        'pay-out': 'text-red-500 bg-red-100',
    }
    const finalColor = activity.type === 'sale' && activity.payment_method === 'card' ? 'text-purple-500 bg-purple-100' : colorMap[activity.type];
    return <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${finalColor}`}>{iconMap[activity.type]}</div>
};

const ActivityLabel: React.FC<{ activity: CashDrawerActivity }> = ({ activity }) => {
    const { t } = useTranslations();
    if (activity.type === 'sale') {
        return activity.payment_method === 'cash' ? <>{t('adminPanel.cashDrawer.activityCashSale')}</> : <>{t('adminPanel.cashDrawer.activityCardSale')}</>
    }
    return activity.type === 'pay-in' ? <>{t('adminPanel.cashDrawer.activityPayIn')}</> : <>{t('adminPanel.cashDrawer.activityPayOut')}</>
};


const CashDrawerTab: React.FC<CashDrawerTabProps> = ({ currentSession, sessionHistory, onCloseDrawer, onPayIn, onPayOut }) => {
    const { t } = useTranslations();
    const { formatCurrency, baseCurrencySymbol } = useCurrency();
    const [countedCash, setCountedCash] = useState('');
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setAdjustmentModalOpen] = useState<'in' | 'out' | null>(null);
    const [viewingReport, setViewingReport] = useState<CashDrawerSession | null>(null);

    const sessionSummary = useMemo(() => {
        if (!currentSession) return null;
        
        const activities = currentSession.activities || [];
        
        const cashSales = activities
            .filter(a => a.type === 'sale' && a.payment_method === 'cash')
            .reduce((sum, a) => sum + Number(a.amount), 0);
        
        const cardSales = activities
            .filter(a => a.type === 'sale' && a.payment_method === 'card')
            .reduce((sum, a) => sum + Number(a.amount), 0);
        
        const totalPayIns = activities
            .filter(a => a.type === 'pay-in')
            .reduce((sum, a) => sum + Number(a.amount), 0);

        const totalPayOuts = activities
            .filter(a => a.type === 'pay-out')
            .reduce((sum, a) => sum + Number(a.amount), 0);

        const totalSales = cashSales + cardSales;
        const expectedInDrawer = Number(currentSession.opening_amount) + cashSales + totalPayIns - totalPayOuts;

        return { cashSales, cardSales, totalSales, expectedInDrawer, totalPayIns, totalPayOuts };
    }, [currentSession]);

    const handleInitiateClose = (e: React.FormEvent) => {
        e.preventDefault();
        const countedAmount = parseFloat(countedCash);
        if (isNaN(countedAmount) || countedAmount < 0) {
            alert(t('openDrawerModal.invalidAmount'));
            return;
        }
        setConfirmModalOpen(true);
    };

    const handleConfirmClose = () => {
        const countedAmount = parseFloat(countedCash);
        onCloseDrawer(countedAmount);
        setCountedCash('');
        setConfirmModalOpen(false);
    };
    
    const difference = useMemo(() => {
        if (!sessionSummary || countedCash === '') return null;
        const counted = parseFloat(countedCash);
        if (isNaN(counted)) return null;
        return counted - sessionSummary.expectedInDrawer;
    }, [countedCash, sessionSummary]);
    

    const renderCurrentSession = () => {
        if (!currentSession || !sessionSummary) {
            return (
                 <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                       <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6" />
                     </svg>
                    <p className="text-gray-600 font-medium text-lg">{t('adminPanel.cashDrawer.noActiveSession')}</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{t('adminPanel.cashDrawer.noActiveSessionMessage')}</p>
                </div>
            );
        }
        
        const activities = currentSession.activities || [];

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left side: Session Info & Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">{t('adminPanel.cashDrawer.currentSession')}</h4>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-4">
                                <h5 className="font-bold">{t('adminPanel.cashDrawer.sessionStatus')}</h5>
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{t('adminPanel.cashDrawer.statusOpen')}</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p className="flex justify-between"><span>{t('adminPanel.cashDrawer.openedBy')}:</span> <span className="font-medium">{currentSession.opened_by}</span></p>
                                <p className="flex justify-between"><span>{t('adminPanel.cashDrawer.startTime')}:</span> <span className="font-medium">{new Date(currentSession.opened_at).toLocaleString()}</span></p>
                                <p className="flex justify-between border-t pt-2 mt-2"><span>{t('adminPanel.cashDrawer.startingCash')}:</span> <span className="font-bold text-base">{formatCurrency(currentSession.opening_amount)}</span></p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">{t('adminPanel.cashDrawer.sessionSummary')}</h4>
                        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-2 text-sm">
                            <p className="flex justify-between"><span>{t('adminPanel.cashDrawer.cashSales')}:</span> <span className="font-medium">{formatCurrency(sessionSummary.cashSales)}</span></p>
                            <p className="flex justify-between"><span>{t('adminPanel.cashDrawer.cardSales')}:</span> <span className="font-medium">{formatCurrency(sessionSummary.cardSales)}</span></p>
                            <p className="flex justify-between font-bold border-t pt-2 mt-2"><span>{t('adminPanel.cashDrawer.totalSales')}:</span> <span>{formatCurrency(sessionSummary.totalSales)}</span></p>
                             <p className="flex justify-between text-green-600"><span>{t('adminPanel.cashDrawer.totalPayIns')}:</span> <span className="font-medium">{formatCurrency(sessionSummary.totalPayIns)}</span></p>
                             <p className="flex justify-between text-red-600"><span>{t('adminPanel.cashDrawer.totalPayOuts')}:</span> <span className="font-medium">{formatCurrency(sessionSummary.totalPayOuts)}</span></p>
                            <div className="flex justify-between font-bold text-blue-600 text-base border-t-2 border-blue-500 pt-3 mt-3">
                                <span>{t('adminPanel.cashDrawer.expectedInDrawer')}:</span>
                                <span>{formatCurrency(sessionSummary.expectedInDrawer)}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                         <h4 className="text-lg font-semibold text-gray-800 mb-2">{t('adminPanel.cashDrawer.closeDrawer')}</h4>
                         <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
                            <form onSubmit={handleInitiateClose}>
                                <label htmlFor="counted-cash" className="block text-sm font-medium text-gray-700">{t('adminPanel.cashDrawer.countedCash')}</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-lg">{baseCurrencySymbol}</span>
                                    </div>
                                    <input
                                    type="number"
                                    name="counted-cash"
                                    id="counted-cash"
                                    className="block w-full rounded-md border-gray-300 pl-8 pr-4 py-3 text-center text-2xl focus:border-red-500 focus:ring-red-500"
                                    placeholder="0.00"
                                    value={countedCash}
                                    onChange={(e) => setCountedCash(e.target.value)}
                                    required
                                    />
                                </div>
                                
                                {difference !== null && (
                                    <div className="flex justify-between font-semibold text-lg mt-4 pt-2 border-t">
                                        <span>{t('adminPanel.cashDrawer.difference')}:</span>
                                        <span className={difference === 0 ? 'text-green-600' : 'text-red-600'}>
                                            {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                        </span>
                                    </div>
                                )}

                                <button type="submit" className="w-full mt-4 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300" disabled={countedCash === ''}>
                                    {t('adminPanel.cashDrawer.closeAndEndShift')}
                                </button>
                            </form>
                         </div>
                    </div>
                </div>

                {/* Right side: Activity Log */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-semibold text-gray-800">{t('adminPanel.cashDrawer.activityLog')}</h4>
                        <div className="space-x-2">
                            <button onClick={() => setAdjustmentModalOpen('in')} className="px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200">{t('adminPanel.cashDrawer.addCash')}</button>
                            <button onClick={() => setAdjustmentModalOpen('out')} className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200">{t('adminPanel.cashDrawer.removeCash')}</button>
                        </div>
                    </div>
                     <div className="bg-white p-4 rounded-lg shadow-sm border h-[calc(100%-2.5rem)] overflow-y-auto">
                        {activities.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {[...activities].reverse().map((activity) => (
                                    <li key={activity.id} className="py-3 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <ActivityIcon activity={activity} />
                                            <div>
                                                <p className="font-semibold text-sm"><ActivityLabel activity={activity} /></p>
                                                <p className="text-xs text-gray-500">{activity.notes || activity.order_id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${activity.type === 'pay-out' ? 'text-red-600' : 'text-gray-800'}`}>
                                               {activity.type === 'pay-out' ? '-' : ''}{formatCurrency(Number(activity.amount))}
                                            </p>
                                            <p className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                             <div className="flex items-center justify-center h-full text-center text-gray-500">
                                <p>{t('adminPanel.cashDrawer.noActivity')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    const renderSessionHistory = () => (
      <div className="mt-10">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">{t('adminPanel.cashDrawer.sessionHistory')}</h4>
        <div className="bg-white rounded-lg shadow-sm border max-h-96 overflow-y-auto">
            {sessionHistory.length > 0 ? (
                <div className="divide-y">
                {sessionHistory.map(session => (
                    <div key={session.id} className="p-4">
                        <div className="flex justify-between items-start">
                           <div>
                             <p className="font-bold text-gray-700">{session.closed_at ? new Date(session.closed_at).toLocaleString() : new Date(session.opened_at).toLocaleString()}</p>
                             <p className="text-sm text-gray-500">{t('adminPanel.cashDrawer.openedBy')}: {session.opened_by} / {t('adminPanel.cashDrawer.closedBy')}: {session.closed_by}</p>
                           </div>
                           <div className="flex items-center space-x-4">
                               <div className={`text-right font-semibold ${session.difference === 0 ? 'text-gray-600' : session.difference && session.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 <p>{formatCurrency(session.difference || 0)}</p>
                                 <p className="text-xs font-normal">{t('adminPanel.cashDrawer.overShort')}</p>
                               </div>
                               <button onClick={() => setViewingReport(session)} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">{t('adminPanel.cashDrawer.viewReport')}</button>
                           </div>
                        </div>
                    </div>
                ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 p-8">{t('adminPanel.cashDrawer.noHistory')}</p>
            )}
        </div>
      </div>
    );

    return (
        <div className="flex-grow p-6 overflow-y-auto bg-gray-50">
            {renderCurrentSession()}
            {renderSessionHistory()}
            
            <CashAdjustmentModal 
                isOpen={isAdjustmentModalOpen !== null}
                type={isAdjustmentModalOpen || 'in'}
                onClose={() => setAdjustmentModalOpen(null)}
                onAdjust={(amount, reason) => {
                    if (isAdjustmentModalOpen === 'in') {
                        onPayIn(amount, reason);
                    } else {
                        onPayOut(amount, reason);
                    }
                }}
            />

            {viewingReport && (
                <SessionReportModal 
                    isOpen={!!viewingReport}
                    onClose={() => setViewingReport(null)}
                    session={viewingReport}
                />
            )}

            {isConfirmModalOpen && sessionSummary && difference !== null && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-close-title">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="p-6 text-center">
                        <h3 id="confirm-close-title" className="text-xl font-bold text-gray-800">{t('adminPanel.cashDrawer.confirmCloseTitle')}</h3>
                        <p className="text-sm text-gray-500 mt-2">{t('adminPanel.cashDrawer.confirmCloseMessage')}</p>
                    </div>
                    <div className="bg-gray-50 p-6 space-y-3">
                        <h4 className="text-md font-semibold text-gray-700 mb-4 text-center">{t('adminPanel.cashDrawer.finalSummary')}</h4>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('adminPanel.cashDrawer.expectedInDrawer')}:</span>
                            <span className="font-medium text-gray-800">{formatCurrency(sessionSummary.expectedInDrawer)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('adminPanel.cashDrawer.countedCash')}:</span>
                            <span className="font-medium text-gray-800">{formatCurrency(parseFloat(countedCash))}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                            <span>{t('adminPanel.cashDrawer.difference')}:</span>
                            <span className={difference === 0 ? 'text-green-600' : 'text-red-600'}>
                                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                            </span>
                        </div>
                    </div>
                    <div className="p-4 flex justify-end space-x-3">
                        <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                           {t('adminPanel.cashDrawer.cancel')}
                        </button>
                        <button onClick={handleConfirmClose} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                           {t('adminPanel.cashDrawer.confirmAndEnd')}
                        </button>
                    </div>
                </div>
              </div>
            )}
        </div>
    );
};

export default CashDrawerTab;