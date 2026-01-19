'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { Contract } from '@/data/contracts';
import { createContract, getContracts } from '@/app/actions/contracts';
import { getCompanies } from '@/app/actions/companies';
import { getUserSettings } from '@/app/actions/settings';

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

function NewContractForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paramPartyA = searchParams.get('partyA');
    const paramPartyB = searchParams.get('partyB');
    const paramTitle = searchParams.get('title');

    const [formData, setFormData] = useState<Omit<Contract, 'id'>>({
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        partyA: '',
        partyB: '',
        status: '提案中',
        storagePath: '',
        autoRenewal: false,
        deadline: '',
        title: '',
    });

    const [companies, setCompanies] = useState<Company[]>([]);
    const [showPartyASuggestions, setShowPartyASuggestions] = useState(false);
    const [showPartyBSuggestions, setShowPartyBSuggestions] = useState(false);
    const [savedPartyBInfo, setSavedPartyBInfo] = useState('');
    const partyAInputRef = useRef<HTMLInputElement>(null);
    const partyBInputRef = useRef<HTMLInputElement>(null);

    // Load companies and saved Party B info from localStorage
    // Load companies from existing contracts and saved Party B info from settings
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load companies from official Company List
                const companyData = await getCompanies();
                if (companyData && companyData.length > 0) {
                    setCompanies(companyData);
                } else {
                    // Fallback to building list from existing contracts if no official companies registered
                    const contracts = await getContracts();
                    if (contracts) {
                        const uniqueCompanies = new Set<string>();
                        contracts.forEach((c: any) => {
                            if (c.partyA) uniqueCompanies.add(c.partyA);
                            if (c.partyB) uniqueCompanies.add(c.partyB);
                        });

                        const companyList: Company[] = Array.from(uniqueCompanies).map((name, index) => ({
                            id: index,
                            name: name,
                            postalCode: '',
                            address: '',
                            building: null,
                            presidentTitle: '',
                            presidentName: '',
                            contactPerson: '',
                            email: '',
                            phone: '',
                            position: null,
                            contractCount: 0
                        }));
                        companyList.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
                        setCompanies(companyList);
                    }
                }

                // Load user settings
                const settings = await getUserSettings();
                if (settings) {
                    // Pre-fill fields from Query Params OR settings
                    const profile = settings.company_profile;
                    setFormData(prev => ({
                        ...prev,
                        partyA: paramPartyA || profile?.name || prev.partyA,
                        partyB: paramPartyB || prev.partyB,
                        title: paramTitle || prev.title
                    }));

                    // Keep Party B default for suggestions
                    if (settings.party_b_info?.companyName) {
                        setSavedPartyBInfo(settings.party_b_info.companyName);
                    }
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        };

        loadInitialData();
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (partyAInputRef.current && !partyAInputRef.current.contains(event.target as Node)) {
                setShowPartyASuggestions(false);
            }
            if (partyBInputRef.current && !partyBInputRef.current.contains(event.target as Node)) {
                setShowPartyBSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({
                ...prev,
                [name]: checked,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await createContract(formData);
            alert('契約を追加しました');
            router.push('/contracts');
        } catch (error) {
            console.error('Failed to create contract:', error);
            alert('契約の追加中にエラーが発生しました。');
        }
    };

    const handleCancel = () => {
        router.push('/contracts');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <BackButton />
            <h1 className="text-2xl font-bold mb-6">新規契約追加</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        契約内容（タイトル） <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="例：システム開発委託契約書"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            タイムスタンプ <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="timestamp"
                            value={formData.timestamp}
                            onChange={handleChange}
                            required
                            placeholder="2024-01-15 10:30"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ステータス <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="提案中">提案中</option>
                            <option value="締結済み">締結済み</option>
                            <option value="終了">終了</option>
                        </select>
                    </div>

                    <div className="relative" ref={partyAInputRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            甲（契約者A） <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="partyA"
                            value={formData.partyA}
                            onChange={handleChange}
                            onFocus={() => setShowPartyASuggestions(true)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {showPartyASuggestions && companies.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {companies.filter(c => c.name.toLowerCase().includes(formData.partyA.toLowerCase())).map((company) => (
                                    <button
                                        key={company.id}
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, partyA: company.name }));
                                            setShowPartyASuggestions(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                                    >
                                        {company.name}
                                    </button>
                                ))}
                                {companies.filter(c => c.name.toLowerCase().includes(formData.partyA.toLowerCase())).length === 0 && (
                                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        一致する企業がありません
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={partyBInputRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            乙（契約者B） <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="partyB"
                            value={formData.partyB}
                            onChange={handleChange}
                            onFocus={() => setShowPartyBSuggestions(true)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {showPartyBSuggestions && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {[
                                    ...companies,
                                    ...(savedPartyBInfo && !companies.some(c => c.name === savedPartyBInfo) ? [{ id: -1, name: savedPartyBInfo }] : [])
                                ]
                                    .filter(c => c.name.toLowerCase().includes(formData.partyB.toLowerCase()))
                                    .map((company) => (
                                        <button
                                            key={company.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, partyB: company.name }));
                                                setShowPartyBSuggestions(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                                        >
                                            {company.name}
                                            {company.id === -1 && <span className="ml-2 text-xs text-blue-500">(設定済み)</span>}
                                        </button>
                                    ))}
                                {[
                                    ...companies,
                                    ...(savedPartyBInfo && !companies.some(c => c.name === savedPartyBInfo) ? [{ id: -1, name: savedPartyBInfo }] : [])
                                ].filter(c => c.name.toLowerCase().includes(formData.partyB.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                            一致する企業がありません
                                        </div>
                                    )}
                            </div>
                        )}
                        {savedPartyBInfo && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, partyB: savedPartyBInfo }))}
                                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline text-left block"
                            >
                                設定済みの乙: {savedPartyBInfo}
                            </button>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            契約書保存先（Google Drive URL） <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            name="storagePath"
                            value={formData.storagePath}
                            onChange={handleChange}
                            required
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            期限 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="autoRenewal"
                            checked={formData.autoRenewal}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            契約自動更新
                        </label>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                    >
                        追加
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md transition-colors font-medium"
                    >
                        キャンセル
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function NewContractPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        }>
            <NewContractForm />
        </Suspense>
    );
}
