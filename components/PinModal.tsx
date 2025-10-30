import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface PinModalProps {
    user: User | null;
    onClose: () => void;
    onPinSubmit: (password: string) => void;
    error: string;
}

const PinModal: React.FC<PinModalProps> = ({ user, onClose, onPinSubmit, error }) => {
    const [password, setPassword] = useState('');
    const [shake, setShake] = useState(false);
    const { t } = useTranslations();

    useEffect(() => {
        if (error) {
            setShake(true);
            const timer = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(timer);
        }
    }, [error]);
    
    useEffect(() => {
      setPassword('');
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPinSubmit(password);
    };
    
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className={`bg-surface rounded-lg shadow-xl p-8 w-full max-w-xs text-center relative ${shake ? 'animate-shake' : ''}`}>
                <button type="button" onClick={onClose} className="absolute top-2 right-2 text-text-secondary hover:text-text-primary text-3xl">&times;</button>
                <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-surface shadow-lg" />
                <h2 className="text-xl font-bold text-text-primary mb-1">{user.name}</h2>
                <p className="text-text-secondary mb-4">{t('pinModal.enterPassword')}</p>
                
                <div className="mb-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center"
                        required
                        autoFocus
                        placeholder={t('login.password')}
                    />
                </div>

                <div className="h-5 mb-4">
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                <button
                    type="submit"
                    className="w-full bg-primary text-text-on-primary font-bold py-3 rounded-lg hover:bg-primary-hover transition-colors"
                >
                    {t('login.signIn')}
                </button>
                 <button 
                    type="button" 
                    onClick={onClose} 
                    className="w-full mt-4 text-sm font-semibold text-text-secondary hover:underline"
                >
                    {t('pinModal.switchUser')}
                </button>
            </form>
             <style>{`
                @keyframes shake {
                  10%, 90% { transform: translate3d(-1px, 0, 0); }
                  20%, 80% { transform: translate3d(2px, 0, 0); }
                  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                  40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .animate-shake {
                  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};

export default PinModal;