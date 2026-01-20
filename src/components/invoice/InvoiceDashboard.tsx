'use client';

import { useState, useEffect } from 'react';
import { Billing } from '@/lib/db';
import {
    CreditCard,
    TrendingUp,
    AlertCircle,
    Plus,
    FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import SalesAnalyticsModal from './SalesAnalyticsModal';


interface InvoiceDashboardProps {
    billings: Billing[];
    onSelectFilter?: (type: 'Sales' | 'Unpaid' | 'Overdue') => void;
}

export default function InvoiceDashboard({ billings, onSelectFilter }: InvoiceDashboardProps) {
    const router = useRouter();
    const [showSalesModal, setShowSalesModal] = useState(false);

    // Calculations
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonthSales = billings
        .filter(b => {
            if (!b.issue_date) return false;
            const date = new Date(b.issue_date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear && b.status !== 'Planned';
        })
        .reduce((sum, b) => sum + (b.total || b.amount || 0), 0);

    const unpaidAmount = billings
        .filter(b => b.status === 'Sent' || b.status === 'Approved')
        .reduce((sum, b) => sum + (b.total || b.amount || 0), 0);

    const overdueCount = billings.filter(b => {
        if (!b.payment_deadline || b.status === 'Paid') return false;
        return new Date(b.payment_deadline) < new Date();
    }).length;

    const handleSalesCardClick = () => {
        setShowSalesModal(true);
    };

    return (
        <div className="mb-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <button
                    onClick={handleSalesCardClick}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 transition-colors">今月の売上 (税込)</h3>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-600 transition-colors">
                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ¥{thisMonthSales.toLocaleString()}
                    </p>
                </button>

                <button
                    onClick={() => onSelectFilter?.('Unpaid')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:shadow-md hover:border-yellow-200 dark:hover:border-yellow-900 transition-all group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-yellow-600 transition-colors">未回収金額</h3>
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-full group-hover:bg-yellow-600 transition-colors">
                            <CreditCard className="w-5 h-5 text-yellow-600 dark:text-yellow-400 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ¥{unpaidAmount.toLocaleString()}
                    </p>
                </button>

                <button
                    onClick={() => onSelectFilter?.('Overdue')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:shadow-md hover:border-red-200 dark:hover:border-red-900 transition-all group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-red-600 transition-colors">期限超過アラート</h3>
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-full group-hover:bg-red-600 transition-colors">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {overdueCount} <span className="text-sm font-normal text-gray-500">件</span>
                    </p>
                </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/billings/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    新規請求書作成
                </button>
                <button
                    onClick={() => router.push('/billings?showContractModal=true')}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium shadow-sm"
                >
                    <FileText className="w-5 h-5" />
                    契約書から請求書を作成
                </button>
            </div>

            {/* Sales Analytics Modal */}
            <SalesAnalyticsModal
                isOpen={showSalesModal}
                onClose={() => setShowSalesModal(false)}
            />
        </div>
    );
}

