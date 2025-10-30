import React from 'react';
import { useTranslations } from '../context/LanguageContext';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  analysisText: string;
}

// A simple component to render the specific markdown from the AI
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 mb-4">
                    {listItems.map((item, index) => (
                        <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                </ul>
            );
            listItems = [];
        }
    };

    lines.forEach((line, index) => {
        // Replace **bold** with <strong>
        const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
        
        // Handle main header like **Sales & Inventory Analysis**
        if (line.startsWith('**') && line.endsWith('**') && !line.includes(':')) {
            flushList();
            elements.push(<h2 key={index} className="text-xl font-bold text-gray-800 mb-4" dangerouslySetInnerHTML={{ __html: formattedLine.replace(/\*\*/g, '') }} />);
            return;
        }
        
        // Handle subheaders like **1. Executive Summary:**
        if (line.match(/^\s*\*\*\d\..*:\*\*/)) {
            flushList();
            elements.push(<h3 key={index} className="text-lg font-semibold text-gray-700 mt-5 mb-2" dangerouslySetInnerHTML={{ __html: formattedLine.replace(/\*\*/g, '') }} />);
            return;
        }

        // Handle bullet points
        if (line.trim().startsWith('-')) {
            listItems.push(formattedLine.trim().substring(1).trim());
            return;
        }

        // Handle regular paragraphs
        if (line.trim() !== '') {
            flushList();
            elements.push(<p key={index} className="text-gray-600 mb-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />);
        }
    });
    
    flushList(); // Make sure to render any remaining list items

    return <div className="space-y-2">{elements}</div>;
}


const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, isLoading, analysisText }) => {
    const { t } = useTranslations();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{t('analysisModal.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-lg font-semibold text-gray-700">{t('analysisModal.loadingTitle')}</p>
                            <p className="text-sm text-gray-500">{t('analysisModal.loadingMessage')}</p>
                        </div>
                    ) : (
                        <div className="text-gray-700 font-sans text-sm">
                            <MarkdownRenderer text={analysisText} />
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {t('analysisModal.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;