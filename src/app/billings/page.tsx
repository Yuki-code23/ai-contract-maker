'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { UserMenu } from '@/components/UserMenu';
import { getBillings } from '../actions/billings';
import { Billing } from '@/lib/db';
import Link from 'next/link';
import { Search, Filter, Calendar, ChevronDown } from 'lucide-react';

import InvoiceDashboard from '@/components/invoice/InvoiceDashboard';

export default function BillingsPage() {
    const [billings, setBillings] = useState<(Billing & { contractPartyB?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'All' | 'Planned' | 'Unpaid' | 'Paid'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [periodFilter, setPeriodFilter] = useState<'All' | 'ThisMonth' | 'NextMonth'>('All');

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

    const filteredBillings = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        return billings.filter(b => {
            // 1. Status Filter
            if (activeTab === 'Planned' && b.status !== 'Planned') return false;
            if (activeTab === 'Unpaid' && !(b.status === 'Sent' || b.status === 'Approved')) return false;
            if (activeTab === 'Paid' && b.status !== 'Paid') return false;

            // 2. Search Query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const clientName = ((b.client_info as any)?.name || b.contractPartyB || '').toLowerCase();
                const invNum = (b.invoice_number || '').toLowerCase();
                const itemsText = (b.items || []).map(i => i.description).join(' ').toLowerCase();

                if (!clientName.includes(query) && !invNum.includes(query) && !itemsText.includes(query)) {
                    return false;
                }
            }

            // 3. Period Filter
            if (periodFilter !== 'All' && b.payment_deadline) {
                const deadline = new Date(b.payment_deadline);
                const dMonth = deadline.getMonth();
                const dYear = deadline.getFullYear();

                if (periodFilter === 'ThisMonth') {
                    if (dMonth !== thisMonth || dYear !== thisYear) return false;
                } else if (periodFilter === 'NextMonth') {
                    const nextMonth = (thisMonth + 1) % 12;
                    const nextYear = thisMonth === 11 ? thisYear + 1 : thisYear;
                    if (dMonth !== nextMonth || dYear !== nextYear) return false;
                }
            }

            return true;
        });
    }, [billings, activeTab, searchQuery, periodFilter]);

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
                <header className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131314] flex justify-between items-center shadow-sm z-10">
                    <h1 className="text-2xl font-bold">請求管理</h1>
                    <UserMenu />
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    {/* Dashboard Summary */}
                    <InvoiceDashboard billings={billings} />

                    {/* Controls Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        {/* Tabs */}
                        <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg w-fit">
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

                        {/* Search and Period Filters */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="取引先・番号で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="relative">
                                <select
                                    value={periodFilter}
                                    onChange={(e) => setPeriodFilter(e.target.value as any)}
                                    className="appearance-none pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    <option value="All">すべての期間</option>
                                    <option value="ThisMonth">今月の期限</option>
                                    <option value="NextMonth">来月の期限</option>
                                </select>
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        取引先 / 請求番号
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        支払期限
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        金額 (税込)
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ステータス
                                    </th>
                                    <th scope="col" className="relative px-6 py-4">
                                        <span className="sr-only">各種操作</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                <span>データを取得中...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredBillings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center gap-1">
                                                <Filter className="w-8 h-8 opacity-20 mb-2" />
                                                <p className="font-medium">該当する請求書が見つかりません</p>
                                                <p className="text-xs">フィルター条件を変えてみてください</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBillings.map((billing) => (
                                        <tr key={billing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {(billing.client_info as any)?.name || billing.contractPartyB || '名無しの請求先'}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                    {billing.invoice_number || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {billing.payment_deadline || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-bold font-mono">
                                                {billing.total ? `¥${billing.total.toLocaleString()}` : (billing.amount ? `¥${billing.amount.toLocaleString()}` : '-')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(billing.status)} shadow-sm border border-black/5`}>
                                                    {getStatusText(billing.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link href={`/billings/${billing.id}`} className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all">
                                                    詳細を見る
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
