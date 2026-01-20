'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { InvoiceItem, Billing } from '@/lib/db';
import { getBilling, createBilling, updateBilling } from '@/app/actions/billings';
import { getContracts } from '@/app/actions/contracts';
import { getUserSettings } from '@/app/actions/settings';
import { getCompanies } from '@/app/actions/companies';
import { analyzeContractForInvoice } from '@/app/actions/analyze-contract';
import { CompanyProfile, BankInfo, UserSettings } from '@/lib/db';
import { Eye } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

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
    const searchParams = useSearchParams();
    const duplicateId = searchParams.get('duplicateId');
    const editId = searchParams.get('editId');
    const fromContract = searchParams.get('fromContract');
    const contractId = searchParams.get('contractId');
    const [loading, setLoading] = useState(false);

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [clientName, setClientName] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ ...DEFAULT_ITEM }]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringInterval, setRecurringInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

    // Suggestion State
    const [companies, setCompanies] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [savedPartyBName, setSavedPartyBName] = useState('');
    const [contracts, setContracts] = useState<any[]>([]);
    const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
    const clientInputRef = useRef<HTMLDivElement>(null);

    // Totals
    const [subtotal, setSubtotal] = useState(0);
    const [taxTotal, setTaxTotal] = useState({ tax8: 0, tax10: 0 });
    const [total, setTotal] = useState(0);

    // Settings & Preview state
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Load data for suggestion and settings
    useEffect(() => {
        // Only auto-generate if NOT editing
        if (!editId) {
            setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
        }

        const loadInitialData = async () => {
            try {
                const settings = await getUserSettings();
                setUserSettings(settings);

                if (settings?.party_b_info?.companyName) {
                    setSavedPartyBName(settings.party_b_info.companyName);
                }

                // Default Due Date from settings
                const today = new Date();
                const offset = settings?.company_profile?.default_due_date || 'end_of_next_month';
                const calculatedDueDate = () => {
                    const d = new Date(today);
                    if (offset === 'end_of_month') return new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    if (offset === '30_days') { d.setDate(d.getDate() + 30); return d; }
                    if (offset === '60_days') { d.setDate(d.getDate() + 60); return d; }
                    return new Date(d.getFullYear(), d.getMonth() + 2, 0); // end_of_next_month
                };
                setDueDate(calculatedDueDate().toISOString().split('T')[0]);

                // If duplicateId or editId is present, load original billing data
                const targetId = editId || duplicateId;
                if (targetId) {
                    const billingId = parseInt(targetId);
                    const original = await getBilling(billingId);
                    if (original) {
                        setClientName((original.client_info as any)?.name || original.contractPartyB || '');
                        setSelectedContractId(original.contract_id || null);
                        if (original.items && original.items.length > 0) {
                            setItems(original.items);
                        }
                        setIsRecurring(!!original.is_recurring);
                        if (original.recurring_interval) {
                            setRecurringInterval(original.recurring_interval as any);
                        }

                        // If editing, also restore dates and number
                        if (editId) {
                            setInvoiceNumber(original.invoice_number || '');
                            if (original.issue_date) setIssueDate(original.issue_date);
                            if (original.payment_deadline) setDueDate(original.payment_deadline);
                        }
                    }
                }

                // Load companies from Company List
                const companyData = await getCompanies();
                if (companyData && companyData.length > 0) {
                    setCompanies(companyData.map(c => c.name));
                }

                // Always load contracts for the link selector
                const contractsData = await getContracts();
                if (contractsData && contractsData.length > 0) {
                    setContracts(contractsData);

                    // If companies list empty, use contract parties
                    if (!companyData || companyData.length === 0) {
                        const uniqueCompanies = new Set<string>();
                        contractsData.forEach((c: any) => {
                            if (c.partyB) uniqueCompanies.add(c.partyB);
                            if (c.partyA) uniqueCompanies.add(c.partyA);
                        });
                        setCompanies(Array.from(uniqueCompanies).sort());
                    }
                }

                // Handle contract analysis auto-fill
                if (fromContract && contractId) {
                    try {
                        const result = await analyzeContractForInvoice(fromContract);
                        if (result.success && result.data) {
                            // Auto-fill client info
                            setClientName(result.data.client_info?.name || result.data.party_b);
                            setSelectedContractId(result.data.contract_id);

                            // Auto-fill items if available
                            if (result.data.items && result.data.items.length > 0) {
                                setItems(result.data.items);
                            }

                            // Auto-fill payment deadline if available
                            if (result.data.payment_deadline) {
                                // Try to parse payment_deadline (e.g., "翌月末") into actual date
                                // For now, just use the default due date
                                // TODO: Implement smart date parsing
                            }

                            // Auto-fill recurring settings
                            if (result.data.is_recurring) {
                                setIsRecurring(true);
                                if (result.data.recurring_interval) {
                                    setRecurringInterval(result.data.recurring_interval);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Failed to auto-fill from contract:', error);
                        // Continue with empty form
                    }
                }
            } catch (err) {
                console.error('Failed to load initial data', err);
            }
        };
        loadInitialData();
    }, [duplicateId, editId, fromContract, contractId]);

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
                contract_id: selectedContractId,
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
                total: total,
                is_recurring: isRecurring,
                recurring_interval: isRecurring ? recurringInterval : null
            };

            if (editId) {
                const result = await updateBilling(Number(editId), billingData);
                if (result.success) {
                    alert('請求書を更新しました');
                    router.push('/billings');
                }
            } else {
                const result = await createBilling(billingData);
                if (result.success) {
                    alert('請求書を作成しました');
                    router.push('/billings');
                }
            }
        } catch (error: any) {
            console.error(error);
            alert(`作成エラーが発生しました: ${error.message || '不明なエラー'}`);
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
                    {editId ? '請求書を編集' : '新規請求書作成'}
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">関連する契約書 (任意)</label>
                            <select
                                value={selectedContractId || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const id = val ? parseInt(val) : null;
                                    setSelectedContractId(id);
                                    if (id) {
                                        const c = contracts.find(x => x.id === id);
                                        if (c && c.partyB) {
                                            setClientName(c.partyB);
                                        }
                                    }
                                }}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                            >
                                <option value="">紐づけなし</option>
                                {contracts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.contractNumber || `CNT-${c.id}`} : {c.partyB}
                                    </option>
                                ))}
                            </select>
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
                        <div className="pt-2 border-t dark:border-gray-700">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">定期的な請求にする (リカーリング)</span>
                            </label>
                            {isRecurring && (
                                <div className="mt-2 ml-6">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">請求頻度</label>
                                    <select
                                        value={recurringInterval}
                                        onChange={(e) => setRecurringInterval(e.target.value as any)}
                                        className="w-full p-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                    >
                                        <option value="monthly">毎月</option>
                                        <option value="quarterly">3ヶ月毎 (四半期)</option>
                                        <option value="yearly">毎年 (年次)</option>
                                    </select>
                                    <p className="mt-1 text-[10px] text-gray-400">※入金済みステータスに変更時、自動的に次の期間分が生成されます</p>
                                </div>
                            )}
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
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => setShowPreview(true)}
                    >
                        <Eye className="w-4 h-4" />
                        プレビュー
                    </button>
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

            {/* Real-time Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-white text-black w-full max-w-[800px] h-[90vh] flex flex-col rounded-lg shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold">請求書プレビュー</h3>
                            <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-gray-200 rounded">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 bg-white font-sans text-sm">
                            {/* PDF Mimic UI */}
                            <div className="flex justify-between items-start mb-8">
                                <h1 className="text-3xl font-bold tracking-widest text-gray-800">請求書</h1>
                                <div className="text-right">
                                    <p className="text-sm">請求書番号: {invoiceNumber}</p>
                                    <p className="text-sm">発行日: {issueDate}</p>
                                </div>
                            </div>

                            <div className="flex justify-between mb-12">
                                <div className="space-y-4">
                                    <div className="border-b-2 border-black pb-1 w-64">
                                        <p className="text-xl font-bold">{clientName} 御中</p>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-lg">ご請求金額: <span className="text-2xl font-bold border-b border-gray-400">¥{total.toLocaleString()}-</span></p>
                                        <p className="text-xs text-gray-500 mt-1">（税込 / 支払期限: {dueDate}）</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-start gap-4">
                                    <div className="space-y-1">
                                        <p className="font-bold">{userSettings?.company_profile?.name || '自社名未設定'}</p>
                                        <p className="text-xs">{userSettings?.company_profile?.address}</p>
                                        <p className="text-xs">TEL: {userSettings?.company_profile?.phone}</p>
                                        <p className="text-xs font-mono mt-2">登録番号: {userSettings?.company_profile?.registration_number || '未設定'}</p>
                                    </div>
                                    {userSettings?.seal_url && (
                                        <div className="w-16 h-16 opacity-80 mt-1">
                                            <img src={userSettings.seal_url} alt="Seal" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <table className="w-full border-collapse mb-8 text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-y border-gray-300">
                                        <th className="py-2 px-3 text-left w-1/2">品名・備考</th>
                                        <th className="py-2 px-3 text-right">数量</th>
                                        <th className="py-2 px-3 text-center">単位</th>
                                        <th className="py-2 px-3 text-right">単価</th>
                                        <th className="py-2 px-3 text-right">金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i} className="border-b border-gray-200">
                                            <td className="py-3 px-3">{item.description}</td>
                                            <td className="py-3 px-3 text-right">{item.quantity}</td>
                                            <td className="py-3 px-3 text-center">{item.unit}</td>
                                            <td className="py-3 px-3 text-right">{item.unitPrice.toLocaleString()}</td>
                                            <td className="py-3 px-3 text-right">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between border-b pb-1">
                                        <span>小計 (税抜)</span>
                                        <span>¥{subtotal.toLocaleString()}</span>
                                    </div>
                                    {taxTotal.tax10 > 0 && (
                                        <div className="flex justify-between text-xs text-gray-600">
                                            <span>消費税 (10%)</span>
                                            <span>¥{taxTotal.tax10.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {taxTotal.tax8 > 0 && (
                                        <div className="flex justify-between text-xs text-gray-600">
                                            <span>消費税 (8%)</span>
                                            <span>¥{taxTotal.tax8.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-lg pt-2">
                                        <span>合計</span>
                                        <span>¥{total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {userSettings?.bank_info && (
                                <div className="mt-12 p-4 border border-gray-100 bg-gray-50 rounded">
                                    <p className="text-xs font-bold mb-2">【お振込先】</p>
                                    <p className="text-sm">{userSettings.bank_info.bank_name} {userSettings.bank_info.branch_name}</p>
                                    <p className="text-sm">{userSettings.bank_info.account_number}  {userSettings.bank_info.account_holder}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-center">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-8 py-2 bg-gray-800 text-white rounded font-bold hover:bg-black transition-colors"
                            >
                                編集に戻る
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
