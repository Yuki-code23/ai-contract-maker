'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { CONTRACTS, Contract } from '@/data/contracts';
import { getContracts, deleteContract, createContract } from '../actions/contracts';
import { UserMenu } from '@/components/UserMenu';
import NotificationToast, { useToast } from '@/components/NotificationToast';

function ContractsContent() {
    const searchParams = useSearchParams();
    const companyFilter = searchParams.get('company');
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
    const { toasts, addToast, removeToast } = useToast();

    // Check for alerts on mount
    useEffect(() => {
        const checkAlerts = async () => {
            try {
                const res = await fetch('/api/cron/alerts');
                if (res.ok) {
                    const data = await res.json();
                    if (data.alerts && data.alerts.length > 0) {
                        data.alerts.forEach((alert: any) => {
                            addToast({
                                title: '契約期限アラート',
                                message: `「${alert.partyB}」との契約が${alert.daysRemaining}日後に切れます (${alert.endDate})。更新を確認してください。`,
                                type: 'warning',
                                duration: 10000
                            });
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to check alerts:', error);
            }
        };

        checkAlerts();
    }, []);

    // Load contracts from server on mount
    useEffect(() => {
        const loadContracts = async () => {
            try {
                const data = await getContracts();
                if (data && data.length > 0) {
                    setContracts(data);
                } else {
                    setContracts([]);
                }
            } catch (error) {
                console.error('Failed to load contracts:', error);
            }
        };
        loadContracts();
    }, []);

    useEffect(() => {
        if (companyFilter) {
            const filtered = contracts.filter(c =>
                c.partyA === companyFilter || c.partyB === companyFilter
            );
            setFilteredContracts(filtered);
        } else {
            setFilteredContracts(contracts);
        }
    }, [companyFilter, contracts]);

    const handleEdit = (contractId: number) => {
        window.location.href = `/contracts/${contractId}/edit`;
    };

    const handleDelete = async (contractId: number) => {
        if (confirm('この契約を削除しますか？')) {
            try {
                await deleteContract(contractId);

                // Update local state
                const updatedContracts = contracts.filter(c => c.id !== contractId);
                setContracts(updatedContracts);
            } catch (error) {
                console.error('Failed to delete contract:', error);
                alert('契約の削除中にエラーが発生しました。');
            }
        }
    };

    const handleRenew = async (contract: Contract) => {
        if (!confirm(`「${contract.partyB}」との契約を更新（コピー作成）しますか？\n期限を1年延長した新しい契約データを作成します。`)) return;

        try {
            const oldDeadline = contract.deadline ? new Date(contract.deadline) : new Date();
            const newDeadline = new Date(oldDeadline);
            newDeadline.setFullYear(newDeadline.getFullYear() + 1);

            const newContractData = {
                partyA: contract.partyA,
                partyB: contract.partyB,
                status: '提案中',
                storagePath: contract.storagePath || '',
                autoRenewal: contract.autoRenewal,
                deadline: newDeadline.toISOString().split('T')[0], // +1 Year
                metadata: contract.metadata // Copy metadata
            };

            const result = await createContract(newContractData);
            if (result.success) {
                // Refresh list
                const refreshedContracts = await getContracts();
                setContracts(refreshedContracts as any);
                addToast({
                    title: '契約更新',
                    message: '新しい契約データを作成しました',
                    type: 'success'
                });
            }
        } catch (error) {
            console.error('Renew error:', error);
            alert('更新処理に失敗しました');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case '提案中':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case '締結済み':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case '終了':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <BackButton />
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold">契約一覧</h1>
                            {companyFilter && (
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                                    <span className="text-sm text-blue-800 dark:text-blue-200">
                                        フィルター: {companyFilter}
                                    </span>
                                    <button
                                        onClick={() => window.location.href = '/contracts'}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => window.location.href = '/contracts/new'}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                契約を追加
                            </button>
                            <UserMenu />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">タイムスタンプ</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">甲</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">乙</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">ステータス</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">契約書保存先</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">契約自動更新</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">期限</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredContracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{contract.timestamp}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{contract.partyA}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{contract.partyB}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                                                {contract.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <a
                                                href={contract.storagePath}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                            >
                                                Google Drive
                                            </a>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {contract.autoRenewal ? '有効' : '無効'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{contract.deadline}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(contract.id)}
                                                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                >
                                                    編集
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(contract.id)}
                                                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                                >
                                                    削除
                                                </button>
                                                <button
                                                    onClick={() => handleRenew(contract)}
                                                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                                    title="期限を1年延長してコピー"
                                                >
                                                    更新
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <NotificationToast toasts={toasts} removeToast={removeToast} />
        </div>
    );
}

export default function ContractsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ContractsContent />
        </Suspense>
    );
}
