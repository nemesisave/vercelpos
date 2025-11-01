import React, { useState, useEffect, useRef } from 'react';
import type { User, CashDrawerSession, Role, ParkedOrder } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { usePermissions } from '../hooks/usePermissions';

interface HeaderProps {
  user: User;
  roles: Role[];
  cashDrawerSession: CashDrawerSession | null;
  parkedOrders: ParkedOrder[];
  onOpenAdminPanel: () => void;
  onLockSession: () => void;
  onUnparkSale: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({ user, roles, cashDrawerSession, parkedOrders, onOpenAdminPanel, onLockSession, onUnparkSale }) => {
  const { t } = useTranslations();
  const permissions = usePermissions(user, roles);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isParkedMenuOpen, setParkedMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const parkedMenuRef = useRef<HTMLDivElement>(null);

  const userRole = roles.find(r => r.id === user.roleId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (parkedMenuRef.current && !parkedMenuRef.current.contains(event.target as Node)) {
        setParkedMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  return (
    <header className="bg-surface/80 backdrop-blur-sm border-b border-border sticky top-0 z-20 print-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h1 className="text-xl font-bold text-text-primary ml-3 hidden sm:block">Gemini POS</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {parkedOrders.length > 0 && (
                <div className="relative" ref={parkedMenuRef}>
                    <button onClick={() => setParkedMenuOpen(!isParkedMenuOpen)} className="relative flex items-center space-x-2 px-4 py-2 text-sm font-medium text-text-secondary bg-yellow-100 border border-yellow-200 rounded-lg shadow-sm hover:bg-yellow-200 hover:text-text-primary">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       <span className="hidden sm:inline">{t('header.parkedSales')}</span>
                       <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-white text-xs font-bold">{parkedOrders.length}</span>
                    </button>
                    {isParkedMenuOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-surface rounded-lg shadow-lg border border-border origin-top-right">
                            <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                                {parkedOrders.map(order => (
                                    <li key={order.id}>
                                        <button onClick={() => { onUnparkSale(order.id); setParkedMenuOpen(false); }} className="w-full flex justify-between items-center p-3 hover:bg-background text-sm">
                                            <div>
                                                <p className="font-semibold text-text-primary">{order.name}</p>
                                                <p className="text-xs text-text-secondary">{t('header.parkedAt')} {order.parkedAt}</p>
                                            </div>
                                            <span className="text-xs font-bold text-text-primary bg-background px-2 py-1 rounded-full">{order.items.length} {t('adminPanel.salesHistory.items')}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}


            <div className="hidden sm:flex items-center space-x-2 bg-background border border-border px-3 py-1.5 rounded-full text-sm">
                {cashDrawerSession?.status === 'open' ? (
                <>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-semibold text-green-700">{t('header.drawerOpen')}</span>
                </>
                ) : (
                <>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="font-semibold text-red-700">{t('header.drawerClosed')}</span>
                </>
                )}
            </div>

            {permissions.canAccessAdminPanel && (
              <button
                onClick={onOpenAdminPanel}
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-text-secondary bg-surface border border-border rounded-lg shadow-sm hover:bg-background hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">{t('header.admin')}</span>
              </button>
            )}

             <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2 focus:outline-none rounded-full focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-transparent hover:border-primary" />
                </button>
                {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-surface rounded-lg shadow-lg border border-border origin-top-right">
                        <div className="py-2 px-3 border-b border-border">
                            <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                            <p className="text-xs text-text-secondary">{userRole ? t(userRole.descriptionKey) : user.roleId}</p>
                        </div>
                        <div className="p-1">
                             <div className="md:hidden divide-y divide-border">
                                {permissions.canAccessAdminPanel && (
                                <button onClick={() => { onOpenAdminPanel(); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-background focus:outline-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{t('header.admin')}</span>
                                </button>
                                )}
                                <div className="sm:hidden flex items-center p-3 text-sm">
                                    {cashDrawerSession?.status === 'open' ? (
                                    <div className="flex items-center space-x-2 text-green-700">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="font-semibold">{t('header.drawerOpen')}</span>
                                    </div>
                                    ) : (
                                    <div className="flex items-center space-x-2 text-red-700">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                        <span className="font-semibold">{t('header.drawerClosed')}</span>
                                    </div>
                                    )}
                                </div>
                             </div>
                             <button
                                onClick={onLockSession}
                                className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-background focus:outline-none"
                                aria-label="Lock session"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>{t('header.lock')}</span>
                            </button>
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;