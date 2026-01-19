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

interface InvoiceDashboardProps {
    billings: Billing[];
}

export default function InvoiceDashboard({ billings }: InvoiceDashboardProps) {
    const router = useRouter();

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
        .filter(b => b.status === 'Sent')
        .reduce((sum, b) => sum + (b.total || b.amount || 0), 0);

    const overdueCount = billings.filter(b => {
        if (!b.payment_deadline || b.status === 'Paid') return false;
        return new Date(b.payment_deadline) < new Date();
    }).length;

    return (
        <div className="mb-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">今月の売上 (税込)</h3>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ¥{thisMonthSales.toLocaleString()}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">未回収金額</h3>
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-full">
                            <CreditCard className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ¥{unpaidAmount.toLocaleString()}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">期限超過アラート</h3>
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-full">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {overdueCount} <span className="text-sm font-normal text-gray-500">件</span>
                    </p>
                </div>
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
            </div>
        </div>
    );
}
