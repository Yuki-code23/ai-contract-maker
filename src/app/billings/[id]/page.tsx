'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';
import { getBilling, updateBillingStatus } from '@/app/actions/billings';
import { FileText } from 'lucide-react';
import { getUserSettings } from '@/app/actions/settings';
import { Billing, CompanyProfile, BankInfo } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

export default function BillingDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [billing, setBilling] = useState<Billing & { contractPartyB?: string } | null>(null);
    const [senderProfile, setSenderProfile] = useState<CompanyProfile>();
    const [bankInfo, setBankInfo] = useState<BankInfo>();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const billingId = parseInt(params.id);
                if (isNaN(billingId)) {
                    throw new Error("Invalid billing ID: " + params.id);
                }

                const billingData = await getBilling(billingId);
                if (!billingData) {
                    throw new Error("請求データが見つかりませんでした (ID: " + billingId + ")");
                }

                setBilling(billingData);

                // Load settings for PDF generation
                const settings = await getUserSettings();
                if (settings) {
                    setSenderProfile(settings.company_profile);
                    setBankInfo(settings.bank_info);
                }
            } catch (error: any) {
                console.error('Failed to load data:', error);
                alert('データ読み込みに失敗しました: ' + (error.message || 'Unknown error'));
                router.push('/billings');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [params.id, router]);

    const handleStatusChange = async (newStatus: Billing['status']) => {
        if (!billing) return;
        try {
            await updateBillingStatus(billing.id, newStatus);
            setBilling({ ...billing, status: newStatus });
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('ステータスの更新に失敗しました');
        }
    };

    const handleDownloadPDF = async () => {
        if (!billing) return;
        setGeneratingPdf(true);
        try {
            let sealBytes: ArrayBuffer | undefined = undefined;

            // Re-fetch settings or use from state to get seal_url
            const settings = await getUserSettings();
            if (settings?.seal_url) {
                try {
                    const res = await fetch(settings.seal_url);
                    if (res.ok) {
                        sealBytes = await res.arrayBuffer();
                    }
                } catch (e) {
                    console.error('Failed to fetch seal image:', e);
                }
            }

            await generateInvoicePDF(billing, senderProfile, bankInfo, sealBytes);
        } catch (error: any) {
            console.error('CRITICAL: PDF Generation Error:', error);
            const detail = error instanceof Error ? error.message : String(error);
            alert(`PDF生成エラーが発生しました。\n詳細: ${detail}\n\n※ブラウザの開発者ツール(F12)のコンソールに詳細なログが出力されています。内容を教えていただければ修正可能です。`);
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-[#131314] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!billing) return null;

    // Calculations for display
    const items = billing.items || [];
    const subtotal = billing.subtotal || billing.amount || 0;
    const taxTotal = billing.tax_total || { tax8: 0, tax10: Math.floor(subtotal * 0.1) };
    const total = billing.total || (subtotal + taxTotal.tax10 + taxTotal.tax8);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-gray-100">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131314] flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-2xl font-bold">請求詳細 #{billing.id}</h1>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Status Explanations */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-sm">
                            <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">請求ステータスの定義</h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-blue-700 dark:text-blue-400">
                                <li><strong>Planned (予定)</strong>: 請求の準備段階です。</li>
                                <li><strong>Approved (承認済)</strong>: 内容が確定し、送付可能な状態です。</li>
                                <li><strong>Sent (送付済)</strong>: 顧客へ請求書を送付した状態です。</li>
                                <li><strong>Paid (入金済)</strong>: 入金が確認され、完了した状態です。</li>
                            </ul>
                        </div>

                        {/* Status Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">現在のステータス</h2>
                                <div className="mt-1 flex items-center gap-3">
                                    <span className="text-2xl font-bold">{billing.status}</span>
                                    {billing.invoice_number && (
                                        <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            {billing.invoice_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {billing.contract_id && (
                                <div className="text-right">
                                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">関連契約</h2>
                                    <div className="mt-1">
                                        <Link
                                            href={`/contracts?id=${billing.contract_id}`}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:underline text-sm font-medium"
                                        >
                                            <FileText className="w-4 h-4" />
                                            {(billing as any).contractNumber || `CNT-${billing.contract_id}`}
                                        </Link>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">ステータスを変更:</label>
                                <select
                                    value={billing.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value as Billing['status'];
                                        if (confirm(`${newStatus} に変更しますか？`)) {
                                            handleStatusChange(newStatus);
                                        }
                                    }}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="Planned">Planned (予定)</option>
                                    <option value="Approved">Approved (承認済)</option>
                                    <option value="Sent">Sent (送付済)</option>
                                    <option value="Paid">Paid (入金済)</option>
                                </select>
                            </div>
                        </div>

                        {/* Invoice Preview Card */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-xl font-bold mb-4">請求書</h2>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <p>請求日: {billing.issue_date || '-'}</p>
                                        <p>支払期限: {billing.payment_deadline || '-'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-lg font-bold">{(billing.client_info as any)?.name || billing.contractPartyB || '顧客名未設定'} 御中</h3>
                                    {senderProfile && (
                                        <div className="mt-2 text-sm text-gray-500">
                                            <p>{senderProfile.name}</p>
                                            <p>{senderProfile.registration_number}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <table className="w-full mb-8">
                                <thead>
                                    <tr className="border-b border-gray-300 dark:border-gray-600 text-sm text-gray-500">
                                        <th className="py-2 text-left">品目</th>
                                        <th className="py-2 text-center">数量</th>
                                        <th className="py-2 text-center">単位</th>
                                        <th className="py-2 text-right">単価</th>
                                        <th className="py-2 text-center">税</th>
                                        <th className="py-2 text-right">金額</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {items.length > 0 ? items.map((item, i) => (
                                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-3">{item.description}</td>
                                            <td className="py-3 text-center">{item.quantity}</td>
                                            <td className="py-3 text-center">{item.unit}</td>
                                            <td className="py-3 text-right">¥{item.unitPrice.toLocaleString()}</td>
                                            <td className="py-3 text-center">{item.taxRate}%</td>
                                            <td className="py-3 text-right">¥{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-3">システム開発費用 (旧データ)</td>
                                            <td className="py-3 text-center">1</td>
                                            <td className="py-3 text-center">式</td>
                                            <td className="py-3 text-right">¥{subtotal.toLocaleString()}</td>
                                            <td className="py-3 text-center">10%</td>
                                            <td className="py-3 text-right">¥{subtotal.toLocaleString()}</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} className="py-2 text-right font-medium text-sm text-gray-500">小計</td>
                                        <td className="py-2 text-right text-sm">¥{subtotal.toLocaleString()}</td>
                                    </tr>
                                    {taxTotal.tax10 > 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-1 text-right font-medium text-sm text-gray-500">消費税 (10%)</td>
                                            <td className="py-1 text-right text-sm">¥{taxTotal.tax10.toLocaleString()}</td>
                                        </tr>
                                    )}
                                    {taxTotal.tax8 > 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-1 text-right font-medium text-sm text-gray-500">消費税 (8%)</td>
                                            <td className="py-1 text-right text-sm">¥{taxTotal.tax8.toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr className="text-lg font-bold border-t border-gray-300 dark:border-gray-600 mt-2">
                                        <td colSpan={5} className="py-4 text-right">合計</td>
                                        <td className="py-4 text-right">¥{total.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generatingPdf}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                >
                                    {generatingPdf ? '生成中...' : '請求書PDFダウンロード'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
