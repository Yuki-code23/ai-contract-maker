'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
    getMonthlySalesData,
    getMonthlySalesDataByCompany,
    getCompanyList,
    getInvoicesByMonthAndCompany,
    MonthlySalesData,
    InvoiceDetail,
} from '@/app/actions/monthly-sales';
import { useRouter } from 'next/navigation';
import { Billing } from '@/lib/db';

const COMPANY_COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#84cc16', // lime-500
    '#14b8a6', // teal-500
];

interface SalesAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SalesAnalyticsModal({ isOpen, onClose }: SalesAnalyticsModalProps) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'overall' | 'company'>('overall');
    const [companies, setCompanies] = useState<string[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [salesData, setSalesData] = useState<MonthlySalesData[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
    const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [invoicesLoading, setInvoicesLoading] = useState(false);

    // Date range state - default to past 12 months
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const [startYear, setStartYear] = useState(defaultStartDate.getFullYear());
    const [startMonth, setStartMonth] = useState(defaultStartDate.getMonth() + 1);
    const [endYear, setEndYear] = useState(now.getFullYear());
    const [endMonth, setEndMonth] = useState(now.getMonth() + 1);

    // Load company list on mount
    useEffect(() => {
        if (isOpen) {
            loadCompanyList();
        }
    }, [isOpen]);

    // Load sales data when view mode, selected company, or date range changes
    useEffect(() => {
        console.log('[DEBUG Modal] useEffect triggered - isOpen:', isOpen, 'viewMode:', viewMode, 'selectedCompany:', selectedCompany);
        if (isOpen) {
            loadSalesData();
        }
    }, [isOpen, viewMode, selectedCompany, startYear, startMonth, endYear, endMonth]);

    const loadCompanyList = async () => {
        console.log('[DEBUG Modal] Loading company list...');
        const result = await getCompanyList();
        if (result.success && result.data) {
            console.log('[DEBUG Modal] Company list loaded:', result.data);
            setCompanies(result.data);

            // Auto-select first company if none is selected
            if (result.data.length > 0 && !selectedCompany) {
                console.log('[DEBUG Modal] Auto-selecting first company:', result.data[0]);
                setSelectedCompany(result.data[0]);
            }
        } else {
            console.error('[DEBUG Modal] Failed to load company list:', result?.error);
        }
    };

    const loadSalesData = async () => {
        setLoading(true);
        setSelectedMonth(null);
        setInvoiceDetails([]);

        try {
            if (viewMode === 'overall') {
                console.log('[DEBUG Modal] Loading overall sales data with range:', { startYear, startMonth, endYear, endMonth });
                const result = await getMonthlySalesData(startYear, startMonth, endYear, endMonth);
                console.log('[DEBUG Modal] Overall sales result:', result);
                if (result.success && result.data) {
                    // Flatten data for Recharts (put company sales at top level with prefix to be safe)
                    const flattenedData = result.data.map(item => {
                        const flattened: any = { ...item };
                        Object.entries(item.companySales).forEach(([name, sales]) => {
                            // Use a prefix to avoid collision with standard properties and handle dots in names
                            flattened[`comp_${name}`] = sales;
                        });
                        return flattened;
                    });
                    setSalesData(flattenedData);
                    console.log('[DEBUG Modal] salesData set to (flattened):', flattenedData);
                    if (result.data.length === 0 || result.data.every(d => d.totalSales === 0)) {
                        console.warn('[DEBUG Modal] Warning: All sales data is 0');
                    }
                } else {
                    console.error('[DEBUG Modal] Failed to load data:', result.error);
                }
            } else {
                if (selectedCompany) {
                    console.log('[DEBUG Modal] Loading company sales data for:', selectedCompany, 'with range:', { startYear, startMonth, endYear, endMonth });
                    const result = await getMonthlySalesDataByCompany(selectedCompany, startYear, startMonth, endYear, endMonth);
                    console.log('[DEBUG Modal] Company sales result:', result);
                    if (result.success && result.data) {
                        // Even for single company, flatten for consistency
                        const flattenedData = result.data.map(item => {
                            const flattened: any = { ...item };
                            Object.entries(item.companySales).forEach(([name, sales]) => {
                                flattened[`comp_${name}`] = sales;
                            });
                            return flattened;
                        });
                        setSalesData(flattenedData);
                    } else {
                        console.error('[DEBUG Modal] Failed to load company data:', result.error);
                    }
                }
            }
        } finally {
            setLoading(false);
            console.log('[DEBUG Modal] Loading complete');
        }
    };

    const handleBarClick = async (data: MonthlySalesData) => {
        setSelectedMonth({ year: data.year, month: data.month });
        setInvoicesLoading(true);

        try {
            const result = await getInvoicesByMonthAndCompany(
                data.year,
                data.month,
                viewMode === 'company' ? selectedCompany : undefined
            );

            if (result.success && result.data) {
                setInvoiceDetails(result.data);
            }
        } finally {
            setInvoicesLoading(false);
        }
    };

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

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as MonthlySalesData;
            return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs">
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{data.monthLabel}</p>
                    <div className="space-y-1 mb-2">
                        {Object.entries(data.companySales || {})
                            .filter(([_, sales]) => sales > 0)
                            .sort(([_, a], [__, b]) => b - a)
                            .map(([name, sales], idx) => (
                                <div key={name} className="flex justify-between gap-4 text-xs">
                                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={name}>
                                        {name}:
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        ¥{sales.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                            <span>合計売上:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">¥{data.totalSales.toLocaleString()}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                            <span>請求書:</span>
                            <span>{data.invoiceCount}件</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">売上分析</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* View Mode Toggle and Company Selector */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                        {/* View Mode Toggle */}
                        <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => setViewMode('overall')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'overall'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                全体
                            </button>
                            <button
                                onClick={() => setViewMode('company')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'company'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                各社ごと
                            </button>
                        </div>

                        {/* Company Selector */}
                        {viewMode === 'company' && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">企業:</label>
                                {companies.length > 0 ? (
                                    <select
                                        value={selectedCompany}
                                        onChange={(e) => {
                                            console.log('[DEBUG Modal] Company selected manually:', e.target.value);
                                            setSelectedCompany(e.target.value);
                                        }}
                                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                    >
                                        {companies.map((company) => (
                                            <option key={company} value={company}>
                                                {company}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                        データのある企業が見つかりません
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date Range Selector */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">期間:</label>

                            {/* Start Date */}
                            <div className="flex items-center gap-1">
                                <select
                                    value={startYear}
                                    onChange={(e) => setStartYear(Number(e.target.value))}
                                    className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map(year => (
                                        <option key={year} value={year}>{year}年</option>
                                    ))}
                                </select>
                                <select
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(Number(e.target.value))}
                                    className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>{month}月</option>
                                    ))}
                                </select>
                            </div>

                            <span className="text-sm text-gray-500 dark:text-gray-400">〜</span>

                            {/* End Date */}
                            <div className="flex items-center gap-1">
                                <select
                                    value={endYear}
                                    onChange={(e) => setEndYear(Number(e.target.value))}
                                    className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map(year => (
                                        <option key={year} value={year}>{year}年</option>
                                    ))}
                                </select>
                                <select
                                    value={endMonth}
                                    onChange={(e) => setEndMonth(Number(e.target.value))}
                                    className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>{month}月</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-96">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                    <XAxis
                                        dataKey="monthLabel"
                                        stroke="#9CA3AF"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        style={{ fontSize: '10px' }}
                                        tickFormatter={(value) => {
                                            if (value >= 1e12) return `¥${(value / 1e12).toFixed(1)}T`;
                                            if (value >= 1e9) return `¥${(value / 1e9).toFixed(1)}B`;
                                            if (value >= 1e6) return `¥${(value / 1e6).toFixed(1)}M`;
                                            if (value >= 1e3) return `¥${(value / 1e3).toFixed(0)}K`;
                                            return `¥${value}`;
                                        }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    {viewMode === 'overall' ? (
                                        companies.map((company, index) => (
                                            <Bar
                                                key={company}
                                                dataKey={`comp_${company}`}
                                                name={company}
                                                stackId="a"
                                                fill={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                                                radius={[0, 0, 0, 0]}
                                                cursor="pointer"
                                                minPointSize={2}
                                                onClick={(data: any) => {
                                                    if (data && data.payload) {
                                                        handleBarClick(data.payload as MonthlySalesData);
                                                    }
                                                }}
                                            />
                                        ))
                                    ) : (
                                        <Bar
                                            dataKey="totalSales"
                                            fill="#3b82f6"
                                            radius={[8, 8, 0, 0]}
                                            cursor="pointer"
                                            minPointSize={5}
                                            onClick={(data: any) => {
                                                if (data && data.payload) {
                                                    handleBarClick(data.payload as MonthlySalesData);
                                                }
                                            }}
                                        >
                                            {salesData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                        selectedMonth?.year === entry.year && selectedMonth?.month === entry.month
                                                            ? '#2563eb'
                                                            : '#60a5fa'
                                                    }
                                                />
                                            ))}
                                        </Bar>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Invoice Details Table */}
                    {selectedMonth && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {selectedMonth.year}年{selectedMonth.month}月の請求書一覧
                                    {viewMode === 'company' && selectedCompany && (
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                                            ({selectedCompany})
                                        </span>
                                    )}
                                </h3>
                            </div>

                            {invoicesLoading ? (
                                <div className="flex items-center justify-center p-12">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                            ) : invoiceDetails.length === 0 ? (
                                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                                    <p>この期間の請求書はありません。</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    請求番号
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    取引先
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    発行日
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    支払期限
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    金額
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    ステータス
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {invoiceDetails.map((invoice) => (
                                                <tr
                                                    key={invoice.id}
                                                    onClick={() => router.push(`/billings/${invoice.id}`)}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                                                        {invoice.invoice_number}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                        {invoice.client_name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {invoice.issue_date}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {invoice.payment_deadline}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
                                                        ¥{invoice.total.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                            {getStatusText(invoice.status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
