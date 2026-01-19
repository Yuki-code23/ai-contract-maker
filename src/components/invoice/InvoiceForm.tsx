'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { InvoiceItem, Billing } from '@/lib/db';
import { createBilling } from '@/app/actions/billings';
import { getContracts } from '@/app/actions/contracts';
import { getUserSettings } from '@/app/actions/settings';
import { getCompanies } from '@/app/actions/companies';

// Default item structure
const DEFAULT_ITEM: InvoiceItem = {
    description: '',
    quantity: 1,
    unit: '式',
    unitPrice: 0,
    taxRate: 10
};

export default function InvoiceForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [clientName, setClientName] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ ...DEFAULT_ITEM }]);

    // Suggestion State
    const [companies, setCompanies] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [savedPartyBName, setSavedPartyBName] = useState('');
    const clientInputRef = useRef<HTMLDivElement>(null);

    // Totals
    const [subtotal, setSubtotal] = useState(0);
    const [taxTotal, setTaxTotal] = useState({ tax8: 0, tax10: 0 });
    const [total, setTotal] = useState(0);

    // Initial Setup: Generate Invoice Number and load suggestions
    useEffect(() => {
        // Simple auto-gen for now
        setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);

        // Default Due Date: End of next month
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Last day of next month
        setDueDate(nextMonth.toISOString().split('T')[0]);

        // Load data for suggestion
        const loadInitialData = async () => {
            try {
                // Load companies from Company List (as requested)
                const companyData = await getCompanies();
                if (companyData && companyData.length > 0) {
                    setCompanies(companyData.map(c => c.name));
                } else {
                    // Fallback to contracts if no companies in list
                    const contracts = await getContracts();
                    if (contracts) {
                        const uniqueCompanies = new Set<string>();
                        contracts.forEach((c: any) => {
                            if (c.partyB) uniqueCompanies.add(c.partyB);
                            if (c.partyA) uniqueCompanies.add(c.partyA);
                        });
                        setCompanies(Array.from(uniqueCompanies).sort());
                    }
                }

                // Load settings for blue link suggestion (default)
                const settings = await getUserSettings();
                if (settings?.party_b_info?.companyName) {
                    setSavedPartyBName(settings.party_b_info.companyName);
                }
            } catch (err) {
                console.error('Failed to load companies for suggestion', err);
            }
        };
        loadInitialData();
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate Totals whenever items change
    useEffect(() => {
        let newSubtotal = 0;
        let newTax10 = 0;
        let newTax8 = 0;

        items.forEach(item => {
            const amount = item.quantity * item.unitPrice;
            newSubtotal += amount;

            if (item.taxRate === 10) {
                newTax10 += Math.floor(amount * 0.1);
            } else if (item.taxRate === 8) {
                newTax8 += Math.floor(amount * 0.08);
            }
        });

        setSubtotal(newSubtotal);
        setTaxTotal({ tax8: newTax8, tax10: newTax10 });
        setTotal(newSubtotal + newTax8 + newTax10);
    }, [items]);

    // Handlers
    const handleAddItem = () => {
        setItems([...items, { ...DEFAULT_ITEM }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!clientName) {
            alert('取引先名を入力してください');
            return;
        }

        setLoading(true);
        try {
            const billingData: Partial<Billing> = {
                contract_id: null, // Standalone invoice
                payment_deadline: dueDate,
                issue_date: issueDate,
                invoice_number: invoiceNumber,
                amount: subtotal, // For backward compatibility
                status: 'Planned',
                // New Fields
                items: items,
                client_info: { name: clientName }, // Simplified client info
                subtotal: subtotal,
                tax_total: taxTotal,
                total: total
            };

            const result = await createBilling(billingData);

            if (result.success) {
                alert('請求書を作成しました');
                router.push('/billings');
            }
        } catch (error) {
            console.error(error);
            alert('作成エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const filteredCompanies = companies.filter(c =>
        c.toLowerCase().includes(clientName.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    新規請求書作成
                </h2>
                <div className="text-sm text-gray-500">
                    ステータス: <span className="font-medium text-gray-900 dark:text-gray-100">下書き</span>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="relative" ref={clientInputRef}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">取引先名 (乙)</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                placeholder="株式会社サンプル"
                            />
                            {showSuggestions && filteredCompanies.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredCompanies.map((company, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setClientName(company);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                                        >
                                            {company}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                {savedPartyBName && (
                                    <button
                                        type="button"
                                        onClick={() => setClientName(savedPartyBName)}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                        <FileText className="w-3 h-3" />
                                        設定済みの乙: {savedPartyBName}
                                    </button>
                                )}

                                {companies.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowSuggestions(!showSuggestions)}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        企業一覧から選択
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">請求番号</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-500"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">請求日</label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">お支払期限</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">明細</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
                            <div className="col-span-5">品目・摘要</div>
                            <div className="col-span-1 text-center">数量</div>
                            <div className="col-span-1 text-center">単位</div>
                            <div className="col-span-2 text-right">単価</div>
                            <div className="col-span-2 text-center">税率</div>
                            <div className="col-span-1"></div>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded hover:bg-gray-100 transition-colors group">
                                <div className="col-span-5">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                                        placeholder="品目を入力"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-center text-sm"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <input
                                        type="text"
                                        value={item.unit}
                                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-center text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-right text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <select
                                        value={item.taxRate}
                                        onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                                    >
                                        <option value={10}>10%</option>
                                        <option value={8}>8% (軽減)</option>
                                        <option value={0}>0%</option>
                                    </select>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddItem}
                        className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        <Plus className="w-4 h-4" /> 行を追加
                    </button>
                </div>

                {/* Summary */}
                <div className="flex justify-end pt-8 border-t border-gray-200 dark:border-gray-700">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>小計 (税抜)</span>
                            <span>¥{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>消費税 (10%)</span>
                            <span>¥{taxTotal.tax10.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>消費税 (8%)</span>
                            <span>¥{taxTotal.tax8.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-3 border-t">
                            <span>合計 (税込)</span>
                            <span>¥{total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-4">
                    <button
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium hover:bg-gray-50"
                        onClick={() => router.back()}
                    >
                        キャンセル
                    </button>
                    <button
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        <Save className="w-4 h-4" />
                        {loading ? '保存中...' : '請求書を保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}
