import React from 'react';
import type { User } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface UserSelectionScreenProps {
    users: User[];
    onSelectUser: (user: User) => void;
}

const UserSelectionScreen: React.FC<UserSelectionScreenProps> = ({ users, onSelectUser }) => {
    const { t } = useTranslations();
    const activeUsers = users.filter(u => u.status === 'active');

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
            <div className="text-center mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h1 className="text-4xl font-bold text-text-primary">Gemini POS</h1>
                <p className="text-text-secondary mt-2">{t('login.selectUser')}</p>
            </div>
            
            <div className="w-full max-w-2xl bg-surface shadow-xl rounded-lg p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {activeUsers.map(user => (
                        <button key={user.id} onClick={() => onSelectUser(user)} className="flex flex-col items-center space-y-2 group">
                            <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full border-4 border-transparent group-hover:border-primary group-focus:border-primary transition-all shadow-md group-hover:shadow-xl"/>
                            <span className="font-semibold text-text-primary text-center">{user.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserSelectionScreen;