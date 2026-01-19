'use client';

import { useState, useEffect } from 'react';
import { CompanyProfile, BankInfo } from '@/lib/db';
import { Save } from 'lucide-react';
// We would typically import fetch logic here
// For now, assume this is part of SettingsPage or uses props

interface CompanyProfileFormProps {
    initialProfile?: CompanyProfile;
    initialBank?: BankInfo;
    onSave: (profile: CompanyProfile, bank: BankInfo) => Promise<void>;
}

export default function CompanyProfileForm({ initialProfile, initialBank, onSave }: CompanyProfileFormProps) {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile>(initialProfile || {
        name: '',
        address: '',
        contact_person: '',
        registration_number: '',
        phone: '',
        email: ''
    });
    const [bank, setBank] = useState<BankInfo>(initialBank || {
        bank_name: '',
        branch_name: '',
        account_number: '',
        account_holder: ''
    });

    useEffect(() => {
        if (initialProfile) setProfile(initialProfile);
        if (initialBank) setBank(initialBank);
    }, [initialProfile, initialBank]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(profile, bank);
            alert('設定を保存しました');
        } catch (error) {
            alert('保存に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Company Info */}
            <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">自社情報 (請求書元)</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">会社名 / 屋号</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            placeholder="株式会社Antigravity"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">登録番号 (インボイス)</label>
                        <input
                            type="text"
                            value={profile.registration_number}
                            onChange={e => setProfile({ ...profile, registration_number: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            placeholder="T1234567890123"
                        />
                        <p className="text-xs text-gray-500 mt-1">※ Tから始まる13桁の番号を入力してください</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">住所</label>
                        <input
                            type="text"
                            value={profile.address}
                            onChange={e => setProfile({ ...profile, address: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            placeholder="東京都渋谷区..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">電話番号</label>
                            <input
                                type="text"
                                value={profile.phone}
                                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={e => setProfile({ ...profile, email: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">担当者名 (任意)</label>
                        <input
                            type="text"
                            value={profile.contact_person}
                            onChange={e => setProfile({ ...profile, contact_person: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                        />
                    </div>
                </div>
            </div>

            {/* Bank Info */}
            <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">振込先口座</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">銀行名</label>
                        <input
                            type="text"
                            value={bank.bank_name}
                            onChange={e => setBank({ ...bank, bank_name: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            placeholder="〇〇銀行"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">支店名</label>
                        <input
                            type="text"
                            value={bank.branch_name}
                            onChange={e => setBank({ ...bank, branch_name: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            placeholder="本店営業部"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">口座番号</label>
                        <input
                            type="text"
                            value={bank.account_number}
                            onChange={e => setBank({ ...bank, account_number: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            placeholder="普通 1234567"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">口座名義 (カナ)</label>
                        <input
                            type="text"
                            value={bank.account_holder}
                            onChange={e => setBank({ ...bank, account_holder: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            placeholder="カ) アンチグラビティ"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex justify-center items-center gap-2 transition-colors"
            >
                <Save className="w-5 h-5" />
                {loading ? '保存中...' : '設定を保存'}
            </button>
        </form>
    );
}
