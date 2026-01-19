'use client';

import { useState, useEffect } from 'react';
import { CompanyProfile, BankInfo } from '@/lib/db';
import { Save } from 'lucide-react';
// We would typically import fetch logic here
// For now, assume this is part of SettingsPage or uses props

interface CompanyProfileFormProps {
    initialProfile?: CompanyProfile;
    initialBank?: BankInfo;
    initialSealUrl?: string;
    onSave: (profile: CompanyProfile, bank: BankInfo, sealUrl?: string) => Promise<void>;
}

export default function CompanyProfileForm({ initialProfile, initialBank, initialSealUrl, onSave }: CompanyProfileFormProps) {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile>(initialProfile || {
        name: '',
        address: '',
        contact_person: '',
        president_title: '',
        president_name: '',
        staff_title: '',
        staff_name: '',
        registration_number: '',
        phone: '',
        email: '',
        default_due_date: 'end_of_next_month'
    });
    const [bank, setBank] = useState<BankInfo>(initialBank || {
        bank_name: '',
        branch_name: '',
        account_number: '',
        account_holder: ''
    });
    const [sealUrl, setSealUrl] = useState<string>(initialSealUrl || '');

    useEffect(() => {
        if (initialProfile) setProfile(initialProfile);
        if (initialBank) setBank(initialBank);
        if (initialSealUrl) setSealUrl(initialSealUrl);
    }, [initialProfile, initialBank, initialSealUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSealUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(profile, bank, sealUrl);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">登録番号 (インボイス)</label>
                            <input
                                type="text"
                                value={profile.registration_number}
                                onChange={e => setProfile({ ...profile, registration_number: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                                placeholder="T1234567890123"
                            />
                            <p className="text-xs text-gray-500 mt-1">※ Tから始まる13桁の番号</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">デフォルト支払期限</label>
                            <select
                                value={profile.default_due_date}
                                onChange={e => setProfile({ ...profile, default_due_date: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            >
                                <option value="end_of_month">当月末</option>
                                <option value="end_of_next_month">翌月末</option>
                                <option value="30_days">30日後</option>
                                <option value="60_days">60日後</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">社長役職名</label>
                            <input
                                type="text"
                                value={profile.president_title}
                                onChange={e => setProfile({ ...profile, president_title: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                                placeholder="代表取締役"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">社長氏名</label>
                            <input
                                type="text"
                                value={profile.president_name}
                                onChange={e => setProfile({ ...profile, president_name: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                                placeholder="田中 太郎"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">担当者 役職名</label>
                            <input
                                type="text"
                                value={profile.staff_title}
                                onChange={e => setProfile({ ...profile, staff_title: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                                placeholder="営業部長"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">担当者 氏名</label>
                            <input
                                type="text"
                                value={profile.staff_name}
                                onChange={e => setProfile({ ...profile, staff_name: e.target.value, contact_person: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                                placeholder="山田 花子"
                            />
                        </div>
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
                                placeholder="03-1234-5678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">メールアドレス</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={e => setProfile({ ...profile, email: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                                placeholder="info@example.com"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Seal Upload */}
            <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">印影設定</h3>
                <div className="flex items-start gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">社印・担当者印 (PNG/JPG)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                        />
                        <p className="text-xs text-gray-500 mt-2">※ 背景が透明なPNG画像を推奨します。PDFの右上に表示されます。</p>
                    </div>
                    {sealUrl && (
                        <div className="relative group">
                            <div className="w-24 h-24 border border-gray-200 dark:border-gray-600 rounded-md bg-white p-1 flex items-center justify-center overflow-hidden">
                                <img src={sealUrl} alt="Seal Preview" className="max-w-full max-h-full object-contain" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setSealUrl('')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
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
