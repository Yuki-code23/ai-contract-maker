'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BackButton from '@/components/BackButton';

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

export default function EditCompanyPage() {
    const router = useRouter();
    const params = useParams();
    const companyId = params.id as string;

    const [formData, setFormData] = useState<Company>({
        id: 0,
        name: '',
        postalCode: '',
        address: '',
        building: null,
        presidentTitle: '',
        presidentName: '',
        contactPerson: '',
        email: '',
        phone: '',
        position: null,
        contractCount: 0,
    });

    useEffect(() => {
        const savedCompanies = localStorage.getItem('companies');
        if (savedCompanies) {
            const companies: Company[] = JSON.parse(savedCompanies);
            const company = companies.find(c => c.id === parseInt(companyId));
            if (company) {
                setFormData(company);
            } else {
                alert('企業が見つかりませんでした');
                router.push('/companies');
            }
        }
    }, [companyId, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value || null,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const savedCompanies = localStorage.getItem('companies');
        if (savedCompanies) {
            const companies: Company[] = JSON.parse(savedCompanies);
            const updatedCompanies = companies.map(c =>
                c.id === formData.id ? formData : c
            );
            localStorage.setItem('companies', JSON.stringify(updatedCompanies));
            alert('企業情報を更新しました');
            router.push('/companies');
        }
    };

    const handleCancel = () => {
        router.push('/companies');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <BackButton />
            <h1 className="text-2xl font-bold mb-6">企業情報編集</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            会社名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            郵便番号 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handleChange}
                            required
                            placeholder="100-0001"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            住所 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            建物名
                        </label>
                        <input
                            type="text"
                            name="building"
                            value={formData.building || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            社長役職名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="presidentTitle"
                            value={formData.presidentTitle}
                            onChange={handleChange}
                            required
                            placeholder="代表取締役社長"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            社長氏名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="presidentName"
                            value={formData.presidentName}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            担当者氏名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            役職名
                        </label>
                        <input
                            type="text"
                            name="position"
                            value={formData.position || ''}
                            onChange={handleChange}
                            placeholder="営業部長"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            メールアドレス <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            電話番号 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="03-1234-5678"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
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
