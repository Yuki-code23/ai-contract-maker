'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { Contract } from '@/data/contracts';
import { getContract, updateContract } from '@/app/actions/contracts';

export default function EditContractPage() {
    const router = useRouter();
    const params = useParams();
    const contractId = params.id as string;

    const [formData, setFormData] = useState<Contract>({
        id: 0,
        timestamp: '',
        partyA: '',
        partyB: '',
        status: '提案中',
        storagePath: '',
        autoRenewal: false,
        deadline: '',
        title: '',
    });

    useEffect(() => {
        const loadContract = async () => {
            if (!contractId) return;

            try {
                const contract = await getContract(parseInt(contractId));
                if (contract) {
                    setFormData(contract);
                } else {
                    alert('契約が見つかりませんでした');
                    router.push('/contracts');
                }
            } catch (error) {
                console.error('Failed to load contract:', error);
                alert('契約情報の取得に失敗しました');
                router.push('/contracts');
            }
        };

        loadContract();
    }, [contractId, router]);

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
            await updateContract(formData.id, formData);
            alert('契約情報を更新しました');
            router.push('/contracts');
        } catch (error) {
            console.error('Failed to update contract:', error);
            alert('契約情報の更新中にエラーが発生しました。');
        }
    };

    const handleCancel = () => {
        router.push('/contracts');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <BackButton />
            <h1 className="text-2xl font-bold mb-6">契約情報編集</h1>

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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            甲（契約者A） <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="partyA"
                            value={formData.partyA}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            乙（契約者B） <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="partyB"
                            value={formData.partyB}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
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
                        保存
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
