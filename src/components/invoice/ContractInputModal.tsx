'use client';

import { useState } from 'react';
import { FileText, X, Loader2 } from 'lucide-react';

interface ContractInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (contractNumber: string) => void;
    isLoading?: boolean;
    error?: string;
}

export default function ContractInputModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
    error
}: ContractInputModalProps) {
    const [contractNumber, setContractNumber] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (contractNumber.trim()) {
            onSubmit(contractNumber.trim());
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setContractNumber('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            契約書から請求書を作成
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6">
                        <label
                            htmlFor="contractNumber"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                            契約書番号
                        </label>
                        <input
                            id="contractNumber"
                            type="text"
                            value={contractNumber}
                            onChange={(e) => setContractNumber(e.target.value)}
                            placeholder="例: CNT-20260120-001"
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            autoFocus
                        />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            契約書番号を入力してください。AIが契約内容を分析し、請求書を自動作成します。
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={!contractNumber.trim() || isLoading}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    分析中...
                                </>
                            ) : (
                                '次へ'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
