'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { QUICK_ACCESS_ITEMS } from '@/data/quickAccess';

export default function SettingsPage() {
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [googleClientId, setGoogleClientId] = useState(''); // Added Client ID
    const [googleDriveFolderId, setGoogleDriveFolderId] = useState(''); // Added Drive Folder ID

    // Party B Information State
    const [companyName, setCompanyName] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [address, setAddress] = useState('');
    const [building, setBuilding] = useState('');
    const [presidentTitle, setPresidentTitle] = useState('');
    const [presidentName, setPresidentName] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [position, setPosition] = useState('');

    // Quick Access State
    const [selectedQuickAccess, setSelectedQuickAccess] = useState<string[]>([]);

    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // Load saved settings from localStorage
        const savedQuickAccess = localStorage.getItem('quickAccess');
        if (savedQuickAccess) {
            setSelectedQuickAccess(JSON.parse(savedQuickAccess));
        } else {
            // Default to all selected
            setSelectedQuickAccess(QUICK_ACCESS_ITEMS.map(item => item.id));
        }

        // Load API keys
        const savedGeminiKey = localStorage.getItem('geminiApiKey');
        const savedGoogleApiKey = localStorage.getItem('googleApiKey'); // Changed key name
        // Fallback for old key name if exists
        const oldGoogleDriveKey = localStorage.getItem('googleDriveApiKey');
        const savedGoogleClientId = localStorage.getItem('googleClientId'); // Load Client ID
        const savedGoogleDriveFolderId = localStorage.getItem('googleDriveFolderId');

        if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
        if (savedGoogleApiKey) {
            setGoogleApiKey(savedGoogleApiKey);
        } else if (oldGoogleDriveKey) {
            setGoogleApiKey(oldGoogleDriveKey);
        }
        if (savedGoogleClientId) setGoogleClientId(savedGoogleClientId);
        if (savedGoogleDriveFolderId) setGoogleDriveFolderId(savedGoogleDriveFolderId);

        // Load Party B information
        const savedPartyB = localStorage.getItem('partyBInfo');
        if (savedPartyB) {
            const partyBData = JSON.parse(savedPartyB);
            setCompanyName(partyBData.companyName || '');
            setPostalCode(partyBData.postalCode || '');
            setAddress(partyBData.address || '');
            setBuilding(partyBData.building || '');
            setPresidentTitle(partyBData.presidentTitle || '');
            setPresidentName(partyBData.presidentName || '');
            setContactName(partyBData.contactName || '');
            setEmail(partyBData.email || '');
            setPhone(partyBData.phone || '');
            setPosition(partyBData.position || '');
        }
    }, []);

    const handleSave = () => {
        try {
            // Save API keys to localStorage
            localStorage.setItem('geminiApiKey', geminiApiKey);
            localStorage.setItem('googleApiKey', googleApiKey);
            localStorage.setItem('googleClientId', googleClientId);
            localStorage.setItem('googleDriveFolderId', googleDriveFolderId);

            // Save Party B information to localStorage
            const partyBInfo = {
                companyName,
                postalCode,
                address,
                building,
                presidentTitle,
                presidentName,
                contactName,
                email,
                phone,
                position,
            };
            localStorage.setItem('partyBInfo', JSON.stringify(partyBInfo));

            // Save Quick Access to localStorage
            localStorage.setItem('quickAccess', JSON.stringify(selectedQuickAccess));

            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Save failed:', error);
            alert('設定の保存中にエラーが発生しました。');
        }
    };

    // Add unhandled rejection handler to debug generic errors
    useEffect(() => {
        const handler = (event: PromiseRejectionEvent) => {
            // Detailed logging for [object Object] errors
            if (Object.prototype.toString.call(event.reason) === '[object Object]') {
                console.error('Unhandled Rejection Details:', JSON.stringify(event.reason, null, 2));
            } else {
                console.error('Unhandled Rejection:', event.reason);
            }
        };
        window.addEventListener('unhandledrejection', handler);
        return () => window.removeEventListener('unhandledrejection', handler);
    }, []);

    const toggleQuickAccessItem = (id: string) => {
        setSelectedQuickAccess(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-4xl mx-auto">
                    <BackButton />
                    <h1 className="text-2xl font-bold mb-6">設定</h1>

                    <div className="space-y-8">
                        {/* API Keys Section */}
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2 dark:border-gray-700">API設定</h2>

                            {/* Gemini API Key */}
                            <div>
                                <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Gemini APIキー
                                </label>
                                <input
                                    id="gemini-api-key"
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="Gemini APIキーを入力してください"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Google Client ID */}
                            <div>
                                <label htmlFor="google-client-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Google Client ID
                                </label>
                                <input
                                    id="google-client-id"
                                    type="text"
                                    value={googleClientId}
                                    onChange={(e) => setGoogleClientId(e.target.value)}
                                    placeholder="Google Cloud ConsoleのOAuth 2.0 クライアントID"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Google Docs作成機能を使用するために必要です。</p>
                            </div>

                            {/* Google API Key */}
                            <div>
                                <label htmlFor="google-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Google API Key
                                </label>
                                <input
                                    id="google-api-key"
                                    type="password"
                                    value={googleApiKey}
                                    onChange={(e) => setGoogleApiKey(e.target.value)}
                                    placeholder="Google APIキーを入力してください"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Google Docs APIへのアクセスに必要です。</p>
                            </div>

                            {/* Google Drive Folder ID */}
                            <div>
                                <label htmlFor="google-drive-folder-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Google Drive Folder ID <span className="text-gray-500 text-xs font-normal">(任意)</span>
                                </label>
                                <input
                                    id="google-drive-folder-id"
                                    type="text"
                                    value={googleDriveFolderId}
                                    onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                                    placeholder="例: 1ABC...XYZ"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    ※指定するとそのフォルダに保存されます。空欄の場合はルートに保存されます。
                                    <br />
                                    (フォルダのURLの `folders/` 以降の文字列です)
                                </p>
                            </div>
                        </section>

                        {/* Party B Information Section */}
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2 dark:border-gray-700">乙の情報設定</h2>

                            {/* Company Name */}
                            <div>
                                <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    会社名
                                </label>
                                <input
                                    id="company-name"
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="会社名を入力"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Address Level 1: Postal Code */}
                            <div>
                                <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    郵便番号
                                </label>
                                <input
                                    id="postal-code"
                                    type="text"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    placeholder="例: 100-0001"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Address Level 2: Pref/City/Street */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    住所 (都道府県+市区町村+番地)
                                </label>
                                <input
                                    id="address"
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="例: 東京都千代田区千代田1-1"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Address Level 3: Building (Nullable) */}
                            <div>
                                <label htmlFor="building" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    建物名 <span className="text-gray-500 text-xs font-normal">(任意)</span>
                                </label>
                                <input
                                    id="building"
                                    type="text"
                                    value={building}
                                    onChange={(e) => setBuilding(e.target.value)}
                                    placeholder="例: 千代田ビル5F"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* President Title */}
                                <div>
                                    <label htmlFor="president-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        社長役職名
                                    </label>
                                    <input
                                        id="president-title"
                                        type="text"
                                        value={presidentTitle}
                                        onChange={(e) => setPresidentTitle(e.target.value)}
                                        placeholder="例: 代表取締役社長"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* President Name */}
                                <div>
                                    <label htmlFor="president-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        社長氏名
                                    </label>
                                    <input
                                        id="president-name"
                                        type="text"
                                        value={presidentName}
                                        onChange={(e) => setPresidentName(e.target.value)}
                                        placeholder="例: 山田太郎"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Contact Person Name */}
                                <div>
                                    <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        担当者氏名
                                    </label>
                                    <input
                                        id="contact-name"
                                        type="text"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="例: 佐藤花子"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Position (Nullable) */}
                                <div>
                                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        役職名 <span className="text-gray-500 text-xs font-normal">(任意)</span>
                                    </label>
                                    <input
                                        id="position"
                                        type="text"
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        placeholder="例: 営業部長"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        メールアドレス
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="例: contact@example.com"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        電話番号
                                    </label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="例: 03-1234-5678"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Quick Access Settings */}
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2 dark:border-gray-700">クイックアクセス設定</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {QUICK_ACCESS_ITEMS.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <input
                                            type="checkbox"
                                            id={`quick-access-${item.id}`}
                                            checked={selectedQuickAccess.includes(item.id)}
                                            onChange={() => toggleQuickAccessItem(item.id)}
                                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor={`quick-access-${item.id}`} className="flex-1 cursor-pointer">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{item.label}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className="pt-4">
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            >
                                保存
                            </button>
                            {isSaved && (
                                <span className="ml-4 text-green-600 dark:text-green-400">
                                    設定を保存しました
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
