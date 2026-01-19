'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { UserMenu } from '@/components/UserMenu';
import { getBillings, deleteBilling, duplicateBilling, updateBillingStatus } from '@/app/actions/billings';
import { getUserSettings } from '../actions/settings';
import { Billing } from '@/lib/db';
import Link from 'next/link';
import { Search, Filter, Calendar, ChevronDown, Download, Copy, Trash2, Edit, FileText } from 'lucide-react';

import InvoiceDashboard from '@/components/invoice/InvoiceDashboard';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

import { useRouter } from 'next/navigation';

export default function BillingsPage() {
    const router = useRouter();
    const [billings, setBillings] = useState<(Billing & { contractPartyB?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'All' | 'Planned' | 'Unpaid' | 'Paid'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [periodFilter, setPeriodFilter] = useState<'All' | 'ThisMonth' | 'NextMonth'>('All');
    const [overdueOnly, setOverdueOnly] = useState(false);

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

    useEffect(() => {
        loadBillings();
    }, []);

    const handleDashboardFilter = (type: 'Sales' | 'Unpaid' | 'Overdue') => {
        if (type === 'Sales') {
            setActiveTab('All');
            setPeriodFilter('ThisMonth');
            setOverdueOnly(false);
        } else if (type === 'Unpaid') {
            setActiveTab('Unpaid');
            setPeriodFilter('All');
            setOverdueOnly(false);
        } else if (type === 'Overdue') {
            setActiveTab('All');
            setPeriodFilter('All');
            setOverdueOnly(true);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('この請求書を削除してもよろしいですか？')) return;
        try {
            await deleteBilling(id);
            loadBillings();
        } catch (error) {
            alert('削除に失敗しました');
        }
    };

    const handleEdit = (id: number) => {
        router.push(`/billings/${id}/edit?editId=${id}`);
    };

    const handleDuplicate = (id: number) => {
        router.push(`/billings/new?duplicateId=${id}`);
    };

    const handleStatusChange = async (id: number, newStatus: Billing['status']) => {
        try {
            const result = await updateBillingStatus(id, newStatus);
            if (result.success) {
                loadBillings();
            }
        } catch (error) {
            console.error(error);
            alert('ステータスの更新に失敗しました');
        }
    };

    const handleDownloadPDF = async (billing: Billing & { contractPartyB?: string }) => {
        try {
            const settings = await getUserSettings();
            await generateInvoicePDF(
                billing,
                settings?.company_profile,
                settings?.bank_info,
                undefined // TODO: Seal
            );
        } catch (error) {
            console.error(error);
            alert('PDF生成に失敗しました');
        }
    };

    const filteredBillings = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        return billings.filter(b => {
            // 0. Overdue Only Filter (Special Dashboard Case)
            if (overdueOnly) {
                if (b.status === 'Paid') return false;
                if (!b.payment_deadline) return false;
                if (new Date(b.payment_deadline) >= now) return false;
            }

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
    }, [billings, activeTab, searchQuery, periodFilter, overdueOnly]);

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
                    <InvoiceDashboard billings={billings} onSelectFilter={handleDashboardFilter} />

                    {/* Controls Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        {/* Tabs */}
                        <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg w-fit">
                            {['All', 'Planned', 'Unpaid', 'Paid'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab as any);
                                        setOverdueOnly(false);
                                    }}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab && !overdueOnly
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
                                    onChange={(e) => {
                                        setPeriodFilter(e.target.value as any);
                                        setOverdueOnly(false);
                                    }}
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
                                        関連契約
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ステータス
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-right">
                                        アクション
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                <span>データを取得中...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredBillings.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <p>表示する請求書がありません。</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBillings.map((billing) => (
                                        <tr key={billing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link href={`/billings/${billing.id}`} className="block">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {(billing.client_info as any)?.name || billing.contractPartyB || '名無しの請求先'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                        {billing.invoice_number || '-'}
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {billing.payment_deadline || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-bold font-mono">
                                                {billing.total ? `¥${billing.total.toLocaleString()}` : (billing.amount ? `¥${billing.amount.toLocaleString()}` : '-')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs">
                                                {billing.contract_id ? (
                                                    <Link
                                                        href={`/contracts?id=${billing.contract_id}`}
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        {(billing as any).contractNumber || `CNT-${billing.contract_id}`}
                                                    </Link>
                                                ) : (
                                                    <span className="text-gray-400 italic">なし</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="relative inline-block">
                                                    <select
                                                        value={billing.status}
                                                        onChange={(e) => handleStatusChange(billing.id, e.target.value as any)}
                                                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(billing.status)} shadow-sm border border-black/5 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-center pr-2`}
                                                    >
                                                        <option value="Planned">予定</option>
                                                        <option value="Approved">承認済</option>
                                                        <option value="Sent">送付済</option>
                                                        <option value="Paid">支払済</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDownloadPDF(billing)}
                                                        title="PDFをダウンロード"
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicate(billing.id)}
                                                        title="コピーして作成"
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(billing.id)}
                                                        title="詳細を編集"
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <Link
                                                        href={`/billings/${billing.id}`}
                                                        title="詳細を表示"
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"
                                                    >
                                                        <Search className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(billing.id)}
                                                        title="削除"
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
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
