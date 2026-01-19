'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { getUserSettings, saveUserSettings } from '../actions/settings';
import { UserMenu } from '@/components/UserMenu';
import CompanyProfileForm from '@/components/invoice/CompanyProfileForm';
import { CompanyProfile, BankInfo } from '@/lib/db';
import { QUICK_ACCESS_ITEMS } from '@/data/quickAccess';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'contract' | 'invoice'>('contract');
    const [loading, setLoading] = useState(true);

    // Contract Settings
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [googleDriveFolderId, setGoogleDriveFolderId] = useState('');
    const [partyBInfo, setPartyBInfo] = useState<any>({});
    const [selectedQuickAccess, setSelectedQuickAccess] = useState<string[]>([]);

    // Invoice Settings
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>();
    const [bankInfo, setBankInfo] = useState<BankInfo>();

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await getUserSettings();
                if (settings) {
                    // Contract
                    setGeminiApiKey(settings.gemini_api_key || '');
                    setGoogleApiKey(settings.google_api_key || '');
                    setGoogleClientId(settings.google_client_id || '');
                    setGoogleDriveFolderId(settings.google_drive_folder_id || '');
                    setPartyBInfo(settings.party_b_info || {});
                    setSelectedQuickAccess(settings.quick_access || []);

                    // Invoice
                    setCompanyProfile(settings.company_profile);
                    setBankInfo(settings.bank_info);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSaveContractSettings = async () => {
        try {
            await saveUserSettings({
                gemini_api_key: geminiApiKey,
                google_api_key: googleApiKey,
                google_client_id: googleClientId,
                google_drive_folder_id: googleDriveFolderId,
                party_b_info: partyBInfo,
                quick_access: selectedQuickAccess
            });
            alert('契約・API設定を保存しました');
        } catch (error) {
            console.error(error);
            alert('保存に失敗しました');
        }
    };

    const handleSaveInvoiceSettings = async (profile: CompanyProfile, bank: BankInfo) => {
        try {
            await saveUserSettings({
                company_profile: profile,
                bank_info: bank
            });
            // No alert needed here as the form handles it, but good to have consistent error handling
        } catch (error) {
            throw error;
        }
    };

    // Helper for Party B fields
    const updatePartyB = (field: string, value: string) => {
        setPartyBInfo((prev: any) => ({ ...prev, [field]: value }));
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-4xl mx-auto pb-32">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <BackButton />
                            <h1 className="text-2xl font-bold">設定</h1>
                        </div>
                        <UserMenu />
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-8">
                        <button
                            onClick={() => setActiveTab('contract')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'contract'
                                    ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            契約・API設定
                        </button>
                        <button
                            onClick={() => setActiveTab('invoice')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'invoice'
                                    ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            請求書設定 (自社情報)
                        </button>
                    </div>

                    {activeTab === 'contract' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* API Keys */}
                            <section className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold border-b pb-2 dark:border-gray-700">API設定</h2>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Gemini API Key</label>
                                    <input type="password" value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Google Client ID</label>
                                    <input type="text" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Google API Key</label>
                                    <input type="password" value={googleApiKey} onChange={e => setGoogleApiKey(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Google Drive Folder ID</label>
                                    <input type="text" value={googleDriveFolderId} onChange={e => setGoogleDriveFolderId(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600" />
                                </div>
                            </section>

                            {/* Party B Defaults */}
                            <section className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold border-b pb-2 dark:border-gray-700">デフォルトの乙(相手方)情報</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">会社名</label>
                                        <input type="text" value={partyBInfo.companyName || ''} onChange={e => updatePartyB('companyName', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">代表者名</label>
                                        <input type="text" value={partyBInfo.presidentName || ''} onChange={e => updatePartyB('presidentName', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600" />
                                    </div>
                                </div>
                            </section>

                            <button
                                onClick={handleSaveContractSettings}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors"
                            >
                                設定を保存
                            </button>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <CompanyProfileForm
                                initialProfile={companyProfile}
                                initialBank={bankInfo}
                                onSave={handleSaveInvoiceSettings}
                            />
                        </div>
                    )}

                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                            ログアウト
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
