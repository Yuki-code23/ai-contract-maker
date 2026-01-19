'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { CONTRACTS, Contract } from '@/data/contracts';
import { getCompanies, deleteCompany, migrateCompanies, createCompany, deleteCompanies } from '../actions/companies';
import { getContracts } from '../actions/contracts';
import { UserMenu } from '@/components/UserMenu';

interface Company {
    id: number;
    name: string;
    postalCode: string;
    address: string;
    building: string | null;
    presidentTitle: string;
    presidentName: string;
    contactPerson: string;
    email: string;
    phone: string;
    position: string | null;
    contractCount: number;
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Load companies from server on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load contracts for count calculation
                const contractsData = await getContracts();
                setContracts(contractsData || []);

                // Load companies
                const companiesData = await getCompanies();
                setCompanies(companiesData || []);
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        };
        loadData();
    }, []);

    // Helper function to count contracts for a company
    // Helper function to count contracts for a company
    const getContractCount = (companyName: string): number => {
        return contracts.filter(contract =>
            contract.partyA === companyName || contract.partyB === companyName
        ).length;
    };


    const handleEdit = (companyId: number) => {
        window.location.href = `/companies/${companyId}/edit`;
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === companies.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(companies.map(c => c.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`選択した ${selectedIds.length} 件の企業を削除しますか？`)) {
            try {
                await deleteCompanies(selectedIds);
                const updatedCompanies = companies.filter(c => !selectedIds.includes(c.id));
                setCompanies(updatedCompanies);
                setSelectedIds([]);
            } catch (error) {
                console.error('Failed to bulk delete companies:', error);
                alert('一括削除に失敗しました');
            }
        }
    };

    const handleDelete = async (companyId: number) => {
        if (confirm('この企業を削除しますか？')) {
            try {
                await deleteCompany(companyId);
                const updatedCompanies = companies.filter(c => c.id !== companyId);
                setCompanies(updatedCompanies);
                setSelectedIds(selectedIds.filter(id => id !== companyId));
            } catch (error) {
                console.error('Failed to delete company:', error);
                alert('削除に失敗しました');
            }
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <BackButton />
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">企業一覧</h1>
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                    一括削除 ({selectedIds.length})
                                </button>
                            )}
                            <button
                                onClick={() => window.location.href = '/companies/new'}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                企業を追加する
                            </button>
                            <UserMenu />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left border-b w-8">
                                        <input
                                            type="checkbox"
                                            checked={companies.length > 0 && selectedIds.length === companies.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">会社名</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">郵便番号</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">住所</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">建物名</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">社長役職名</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">社長氏名</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">役職名</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">担当者氏名</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">メールアドレス</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">電話番号</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">契約履歴</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {companies.map((company) => (
                                    <tr key={company.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedIds.includes(company.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                        <td className="px-4 py-3 border-b">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(company.id)}
                                                onChange={() => toggleSelect(company.id)}
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{company.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.postalCode}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.address}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.building || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.presidentTitle}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.presidentName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.position || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.contactPerson}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.email}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{company.phone}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            <a
                                                href={`/contracts?company=${encodeURIComponent(company.name)}`}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
                                            >
                                                {contracts.filter(c => c.partyA === company.name || c.partyB === company.name).length}件
                                            </a>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(company.id)}
                                                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                >
                                                    編集
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(company.id)}
                                                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                                >
                                                    削除
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
        </div>
    );
}
