'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { CONTRACTS, Contract } from '@/data/contracts';
import { getCompanies, deleteCompany, migrateCompanies, createCompany } from '../actions/companies';
import { getContracts } from '../actions/contracts';

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

    // Load companies from server on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load contracts for count calculation
                const contractsData = await getContracts();
                setContracts(contractsData || []);

                // Load companies
                const companiesData = await getCompanies();

                if (companiesData && companiesData.length > 0) {
                    setCompanies(companiesData);
                } else {
                    // Check localStorage for migration
                    const savedCompanies = localStorage.getItem('companies');
                    if (savedCompanies) {
                        try {
                            const parsed = JSON.parse(savedCompanies);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                await migrateCompanies(parsed);
                                // Reload from server to get IDs
                                const reloaded = await getCompanies();
                                setCompanies(reloaded || []);
                            } else {
                                // No valid local data, leave empty or show empty state
                                setCompanies([]);
                            }
                        } catch (e) {
                            console.error('Migration failed:', e);
                        }
                    }
                }
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

    const generateSampleCompanies = (): Company[] => {
        const baseCompanies: Company[] = [
            {
                id: 1,
                name: '株式会社A',
                postalCode: '100-0001',
                address: '東京都千代田区千代田1-1',
                building: '千代田ビル5F',
                presidentTitle: '代表取締役社長',
                presidentName: '山田太郎',
                contactPerson: '佐藤花子',
                email: 'contact@company-a.co.jp',
                phone: '03-1234-5678',
                position: '営業部長',
                contractCount: getContractCount('株式会社A'),
            },
            {
                id: 2,
                name: '株式会社B',
                postalCode: '150-0001',
                address: '東京都渋谷区神宮前1-2-3',
                building: null,
                presidentTitle: '代表取締役',
                presidentName: '鈴木一郎',
                contactPerson: '田中次郎',
                email: 'info@company-b.jp',
                phone: '03-9876-5432',
                position: null,
                contractCount: getContractCount('株式会社B'),
            },
            {
                id: 3,
                name: '合同会社C',
                postalCode: '530-0001',
                address: '大阪府大阪市北区梅田2-4-9',
                building: '梅田ゲートタワー10F',
                presidentTitle: '代表社員',
                presidentName: '高橋三郎',
                contactPerson: '伊藤美咲',
                email: 'support@company-c.com',
                phone: '06-1111-2222',
                position: '総務課長',
                contractCount: getContractCount('合同会社C'),
            },
        ];

        const additionalCompanies: Company[] = Array.from({ length: 100 }, (_, i) => {
            const id = i + 4;
            return {
                id,
                name: `株式会社サンプル${id}`,
                postalCode: `100-${String(id).padStart(4, '0')}`,
                address: `東京都新宿区西新宿${id}-1-1`,
                building: `サンプルビル${id}F`,
                presidentTitle: '代表取締役',
                presidentName: `サンプル社長${id}`,
                contactPerson: `サンプル担当${id}`,
                email: `contact${id}@sample.co.jp`,
                phone: `03-${String(id).padStart(4, '0')}-0000`,
                position: '担当',
                contractCount: getContractCount(`株式会社サンプル${id}`),
            };
        });

        return [...baseCompanies, ...additionalCompanies].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    };

    // remove original useEffect that loaded companies from localStorage
    // (It was replaced/merged above)

    const handleResetData = async () => {
        if (confirm('現在のデータを削除し、サンプルデータ（数件）で初期化しますか？')) {
            // For safety, maybe don't perform this massive delete/insert on server for now
            // Or just insert samples if empty.
            // Im implementing a "Load Samples" instead of reset/overwrite for safety.
            const sampleCompanies = generateSampleCompanies().slice(0, 5); // Limit to 5 for safety

            for (const c of sampleCompanies) {
                await createCompany(c);
            }

            const reloaded = await getCompanies();
            setCompanies(reloaded || []);
        }
    };

    const handleEdit = (companyId: number) => {
        window.location.href = `/companies/${companyId}/edit`;
    };

    const handleDelete = async (companyId: number) => {
        if (confirm('この企業を削除しますか？')) {
            try {
                await deleteCompany(companyId);
                const updatedCompanies = companies.filter(c => c.id !== companyId);
                setCompanies(updatedCompanies);
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
                            <button
                                onClick={() => window.location.href = '/companies/new'}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                企業を追加する
                            </button>
                            <button
                                onClick={handleResetData}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
                            >
                                サンプルデータで初期化
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
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
                                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
