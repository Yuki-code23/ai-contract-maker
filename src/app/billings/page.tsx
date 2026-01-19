'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { UserMenu } from '@/components/UserMenu';
import { getBillings } from '../actions/billings';
import { Billing } from '@/lib/db';
import Link from 'next/link';

import InvoiceDashboard from '@/components/invoice/InvoiceDashboard';

export default function BillingsPage() {
    const [billings, setBillings] = useState<(Billing & { contractPartyB?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'All' | 'Planned' | 'Unpaid' | 'Paid'>('All');

    useEffect(() => {
        const loadBillings = async () => {
            try {
                setLoading(true);
                const data = await getBillings();
                setBillings(data);
            } catch (error) {
                console.error('Failed to load billings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBillings();
    }, []);

    const filteredBillings = billings.filter(b => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Planned') return b.status === 'Planned';
        if (activeTab === 'Unpaid') return b.status === 'Sent' || b.status === 'Approved';
        if (activeTab === 'Paid') return b.status === 'Paid';
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'Sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Approved': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Paid': return '支払済';
            case 'Sent': return '送信済';
            case 'Approved': return '承認済';
            case 'Planned': return '予定';
            default: return status;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-gray-100">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131314] flex justify-between items-center">
                    <h1 className="text-2xl font-bold">請求管理</h1>
                    <UserMenu />
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    {/* Dashboard Summary */}
                    <InvoiceDashboard billings={billings} />

                    {/* Tabs */}
                    <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg w-fit mb-6">
                        {['All', 'Planned', 'Unpaid', 'Paid'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab === 'All' ? 'すべて'
                                    : tab === 'Planned' ? '請求予定'
                                        : tab === 'Unpaid' ? '未入金'
                                            : '入金済み'}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        取引先 / 請求番号
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        支払期限
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        金額 (税込)
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ステータス
                                    </th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">各種操作</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            読み込み中...
                                        </td>
                                    </tr>
                                ) : filteredBillings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            請求データがありません
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBillings.map((billing) => (
                                        <tr key={billing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {(billing.client_info as any)?.name || billing.contractPartyB || '名無しの請求先'}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {billing.invoice_number || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {billing.payment_deadline || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono">
                                                {billing.total ? `¥${billing.total.toLocaleString()}` : (billing.amount ? `¥${billing.amount.toLocaleString()}` : '-')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(billing.status)}`}>
                                                    {getStatusText(billing.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link href={`/billings/${billing.id}`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                                    詳細
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}
