'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { generateContractResponse } from '@/lib/gemini';
import { getUserSettings } from '@/app/actions/settings';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
}

// Add types for global google and gapi objects
declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

const PROMPT_TEMPLATES = [
    {
        title: '秘密保持契約書(NDA)',
        description: '取引先との秘密保持契約',
        prompt: '秘密保持契約書(NDA)を作成してください。\n\n【当事者】\n・甲（開示者）：\n・乙（受領者）：\n\n【取引内容】\n・開示目的：\n・有効期間：\n・管轄裁判所：'
    },
    {
        title: '業務委託契約書',
        description: '業務を外部に委託する際',
        prompt: '業務委託契約書を作成してください。\n\n【当事者】\n・甲（委託者）：\n・乙（受託者）：\n\n【委託内容】\n・業務内容：\n・報酬：\n・納期：\n・支払条件：'
    },
    {
        title: '雇用契約書',
        description: '従業員を雇用する際',
        prompt: '雇用契約書を作成してください。\n\n【当事者】\n・甲（使用者）：\n・乙（労働者）：\n\n【雇用条件】\n・業務内容：\n・就業場所：\n・賃金：\n・雇用期間：'
    },
    {
        title: '売買契約書',
        description: '物品の売買を行う際',
        prompt: '売買契約書を作成してください。\n\n【当事者】\n・甲（売主）：\n・乙（買主）：\n\n【取引条件】\n・商品名：\n・数量：\n・単価：\n・受渡場所：'
    }
];

export default function AIGenerationPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            role: 'assistant',
            content: 'こんにちは!契約書作成のお手伝いをします。どのような契約書を作成したいですか?',
        },
    ]);
    const [input, setInput] = useState('');
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [googleClientId, setGoogleClientId] = useState<string | null>(null);
    const [googleApiKey, setGoogleApiKey] = useState<string | null>(null);
    const [googleDriveFolderId, setGoogleDriveFolderId] = useState<string | null>(null);

    // Google Auth State
    const [gapiInited, setGapiInited] = useState(false);
    const [gisInited, setGisInited] = useState(false);
    const [tokenClient, setTokenClient] = useState<any>(null);

    // Script Load State
    const [gapiScriptLoaded, setGapiScriptLoaded] = useState(false);
    const [gisScriptLoaded, setGisScriptLoaded] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fileName, setFileName] = useState('contract');
    const [showFolderSettings, setShowFolderSettings] = useState(false); // UI toggle for folder settings
    const [contractContent, setContractContent] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gapiInitializingRef = useRef(false);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set new height
        }
    }, [input]);

    // Load API keys from user settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await getUserSettings();
                if (settings) {
                    setApiKey(settings.gemini_api_key || null);
                    setGoogleClientId(settings.google_client_id || null);
                    setGoogleApiKey(settings.google_api_key || null);
                    setGoogleDriveFolderId(settings.google_drive_folder_id || null);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };
        loadSettings();
    }, []);

    // Check if scripts are already loaded (e.g. from cache or previous navigation)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.gapi) {
                console.log('window.gapi already exists');
                setGapiScriptLoaded(true);
            }
            if (window.google) {
                console.log('window.google already exists');
                setGisScriptLoaded(true);
            }
        }
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize Google API Client (GAPI)
    useEffect(() => {
        if (gapiScriptLoaded && googleApiKey && window.gapi && !gapiInited) {
            if (gapiInitializingRef.current) {
                console.log('GAPI init already in progress, skipping...');
                return;
            }

            gapiInitializingRef.current = true;
            console.log('Initializing GAPI...');

            window.gapi.load('client', async () => {
                try {
                    console.log('GAPI client loaded, initializing with key...');
                    await window.gapi.client.init({
                        apiKey: googleApiKey,
                        discoveryDocs: ['https://docs.googleapis.com/$discovery/rest?version=v1'],
                    });

                    // Explicitly load Drive API v3 to avoid discovery errors in init
                    try {
                        await window.gapi.client.load('drive', 'v3');
                        console.log('Drive API loaded successfully');
                    } catch (driveError) {
                        console.warn('Failed to load Drive API:', driveError);
                        // Continue anyway, as Docs API might still work
                    }

                    setGapiInited(true);
                    console.log('GAPI initialized successfully');
                } catch (error: any) {
                    const errorBody = error.result || error;

                    // Check for 403 SERVICE_DISABLED
                    if (errorBody?.error?.code === 403 && errorBody?.error?.status === 'PERMISSION_DENIED') {
                        const message = errorBody.error.message || '';
                        if (message.includes('has not been used') || message.includes('disabled')) {
                            console.warn('Google API is disabled. Alerting user.');
                            alert('Google API (Docs/Drive) が有効になっていません。\nGoogle Cloud Consoleで「Google Docs API」と「Google Drive API」を有効にしてください。\n\nhttps://console.developers.google.com/apis/dashboard');
                            gapiInitializingRef.current = false;
                            return; // Suppress further error logging
                        }
                    }

                    console.error('GAPI initialization failed:', error);
                    console.error('GAPI error details:', JSON.stringify(error, null, 2));
                    if (error?.result) console.error('GAPI error result:', error.result);

                    // Reset init flag on error to allow retry if needed (though infinite loop risk if not careful)
                    gapiInitializingRef.current = false;
                }
            });
        } else {
            // console.log('GAPI Init skipped:', { loaded: gapiScriptLoaded, hasKey: !!googleApiKey, hasWinGapi: !!window.gapi, inited: gapiInited });
        }
    }, [gapiScriptLoaded, googleApiKey, gapiInited]);

    // Initialize Google Identity Services (GIS)
    useEffect(() => {
        if (gisScriptLoaded && googleClientId && window.google && !gisInited) {
            console.log('Initializing GIS...');
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: googleClientId,
                    scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file', // Add Drive scope
                    callback: '', // defined at request time
                });
                setTokenClient(client);
                setGisInited(true);
                console.log('GIS initialized successfully');
            } catch (error) {
                console.error('GIS initialization failed:', error);
            }
        } else {
            console.log('GIS Init skipped:', { loaded: gisScriptLoaded, hasClientId: !!googleClientId, hasWinGoogle: !!window.google, inited: gisInited });
        }
    }, [gisScriptLoaded, googleClientId, gisInited]);


    const handleSend = async () => {
        if (!input.trim()) return;

        // Check if API key exists
        if (!apiKey) {
            alert('Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。');
            return;
        }

        const newMessage: Message = {
            id: messages.length + 1,
            role: 'user',
            content: input,
        };

        setMessages([...messages, newMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build conversation history for Gemini
            const history = messages.slice(1).map(msg => ({
                role: msg.role === 'user' ? 'user' as const : 'model' as const,
                parts: msg.content
            }));

            // Get AI response
            const aiResponseText = await generateContractResponse(input, history, apiKey);

            // Parse response
            const contractMatch = aiResponseText.match(/<CONTRACT>([\s\S]*?)<\/CONTRACT>/);
            const commentMatch = aiResponseText.match(/<COMMENT>([\s\S]*?)<\/COMMENT>/);

            const contractPart = contractMatch ? contractMatch[1].trim() : '';
            const commentPart = commentMatch ? commentMatch[1].trim() : aiResponseText; // Fallback to full text if no tags

            // Update chat messages with comment part
            if (commentPart) {
                const aiResponse: Message = {
                    id: messages.length + 2,
                    role: 'assistant',
                    content: commentPart,
                };
                setMessages((prev) => [...prev, aiResponse]);
            }

            // Update contract content with contract part (overwrite/update)
            if (contractPart) {
                setContractContent(contractPart);
            }

        } catch (error: any) {
            console.error('Error getting AI response:', error);
            const errorMessage: Message = {
                id: messages.length + 2,
                role: 'assistant',
                content: error.message || 'エラーが発生しました。APIキーが正しいか確認してください。',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Export as text file
    const handleExportTxt = () => {
        if (!contractContent.trim()) {
            alert('エクスポートする契約書の内容がありません。');
            return;
        }
        const blob = new Blob([contractContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export as docx file
    const handleExportDocx = async () => {
        if (!contractContent.trim()) {
            alert('エクスポートする契約書の内容がありません。');
            return;
        }
        try {
            const { Document, Packer, Paragraph, TextRun } = await import('docx');

            const lines = contractContent.split('\n');
            const children = lines.map(line => new Paragraph({
                children: [new TextRun(line)],
            }));

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: children,
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating docx:', error);
            alert('docxファイルの生成に失敗しました。');
        }
    };

    // Export to Google Docs
    const handleExportGoogleDocs = async () => {
        if (!contractContent.trim()) {
            alert('エクスポートする契約書の内容がありません。');
            return;
        }

        if (!googleClientId || !googleApiKey) {
            alert('Google Client IDとGoogle API Keyが設定されていません。設定画面で入力してください。');
            return;
        }

        if (!gapiInited || !gisInited) {
            // Try to force reload/check if not init
            // But realistically, if it's not init yet, alerting is fine
            alert('Google APIの初期化中です。しばらく待ってから再度お試しください。(ページをリロードすると改善する場合があります)');
            return;
        }

        setIsSaving(true);

        try {
            // Request access token
            tokenClient.callback = async (resp: any) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }

                try {
                    let documentId: string;

                    if (googleDriveFolderId) {
                        // Create file in specific folder using Drive API
                        const createResponse = await window.gapi.client.drive.files.create({
                            resource: {
                                name: fileName,
                                mimeType: 'application/vnd.google-apps.document',
                                parents: [googleDriveFolderId]
                            },
                            fields: 'id'
                        });
                        documentId = createResponse.result.id;
                    } else {
                        // Default behavior: Create in root using Docs API
                        const createResponse = await window.gapi.client.docs.documents.create({
                            title: fileName,
                        });
                        documentId = createResponse.result.documentId;
                    }

                    // 2. Insert content
                    // We split content by newline and insert it
                    // For simplicity, we just insert the whole text at index 1
                    const requests = [
                        {
                            insertText: {
                                text: contractContent,
                                location: {
                                    index: 1,
                                },
                            },
                        },
                    ];

                    await window.gapi.client.docs.documents.batchUpdate({
                        documentId: documentId,
                        resource: {
                            requests: requests,
                        },
                    });

                    alert(`Googleドキュメントを作成しました: ${fileName}`);
                    // Optionally open the document
                    window.open(`https://docs.google.com/document/d/${documentId}/edit`, '_blank');

                } catch (apiError: any) {
                    console.error('API Error:', apiError);

                    const errorBody = apiError.result || apiError;
                    if (errorBody?.error?.code === 403) {
                        alert('権限エラーが発生しました。\n1. Google Cloud Consoleで「Google Drive API」が有効か確認してください。\n2. 指定したフォルダIDが正しいか確認してください。\n3. アプリの再認証が必要な場合があります（ページをリロードしてください）。');
                    } else if (errorBody?.error?.code === 404) {
                        alert('指定されたフォルダが見つかりません。フォルダIDを確認してください。');
                    } else {
                        alert(`ドキュメントの作成に失敗しました。\nError: ${apiError.message || JSON.stringify(apiError)}`);
                    }
                } finally {
                    setIsSaving(false);
                }
            };

            // Trigger OAuth flow
            tokenClient.requestAccessToken({ prompt: '' });

        } catch (error) {
            console.error('Google Auth Error:', error);
            setIsSaving(false);
            alert('Google認証に失敗しました。');
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            {/* Load Google Scripts */}
            <Script
                src="https://apis.google.com/js/api.js"
                strategy="afterInteractive"
                onLoad={() => {
                    setGapiScriptLoaded(true);
                    console.log('GAPI Script Loaded');
                }}
            />
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={() => {
                    setGisScriptLoaded(true);
                    console.log('GIS Script Loaded');
                }}
            />

            <Sidebar />
            <div className="flex-1 flex flex-col h-full">
                {/* Header */}
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 shrink-0">
                    <div className="mb-[-16px]">
                        <BackButton />
                    </div>
                    <h1 className="text-2xl font-bold flex-1">AI契約書作成</h1>
                </header>

                {/* API Key Warning */}
                {!apiKey && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-4 shrink-0">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            <span className="text-sm">
                                Gemini APIキーが設定されていません。
                                <Link href="/settings" className="underline ml-1 font-medium">設定画面</Link>
                                でAPIキーを入力してください。
                            </span>
                        </div>
                    </div>
                )}

                {/* Main Content - Split View */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Pane: Chat */}
                    <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[90%] rounded-lg p-4 ${message.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[90%] rounded-lg p-4 bg-gray-100 dark:bg-gray-800">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">AIが考えています...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131314]">
                            {/* Prompt Templates */}
                            <div className="flex gap-3 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                                {PROMPT_TEMPLATES.map((template, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setInput(template.prompt)}
                                        className="flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left w-48 shadow-sm group"
                                    >
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                            {template.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                            {template.description}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            <div className="relative flex items-end w-full bg-[#f0f4f9] dark:bg-[#1e1f20] rounded-3xl px-4 py-3 transition-colors focus-within:bg-white dark:focus-within:bg-[#2d2e2f] shadow-sm ring-1 ring-transparent focus-within:ring-gray-200 dark:focus-within:ring-gray-600">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="契約書について質問してください"
                                    rows={1}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4 py-2 resize-none max-h-48 overflow-y-auto"
                                />
                                <button
                                    onClick={handleSend}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ml-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Pane: Preview */}
                    <div className="w-1/2 flex flex-col bg-gray-50 dark:bg-gray-900">
                        {/* Preview Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-[#131314]">
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">プレビュー</h2>
                            <div className="flex items-center gap-2">
                                {/* Folder Settings Toggle */}
                                <div className="relative flex items-center">
                                    {showFolderSettings && (
                                        <div className="text-xs text-gray-500 mr-2">
                                            フォルダ保存先変更は設定画面で行ってください
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowFolderSettings(!showFolderSettings)}
                                        className={`p-1.5 rounded-md transition-colors ${showFolderSettings ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                                        title="保存先フォルダ設定"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                        </svg>
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder="ファイル名"
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    onClick={handleExportTxt}
                                    className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center gap-1"
                                    title="テキストファイルとしてエクスポート"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    .txt
                                </button>
                                <button
                                    onClick={handleExportDocx}
                                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1"
                                    title="Wordファイルとしてエクスポート"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    .docx
                                </button>
                                <button
                                    onClick={handleExportGoogleDocs}
                                    disabled={isSaving || !googleClientId || !googleApiKey}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 text-white ${!googleClientId || !googleApiKey ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4285F4] hover:bg-[#3367D6]'
                                        }`}
                                    title="Googleドキュメントに保存"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.033 16.01c.564-1.789 1.632-3.932 1.821-4.474.273-.787-.211-1.136-1.74.209l-.34-.64c1.744-1.897 5.335-2.326 4.113.613-.763 1.835-1.309 3.074-1.621 4.03-.378 1.163.521 1.013 1.833.47l.335.589c-2.903 3.202-6.631 2.158-4.401-4.828zm10.033-6.01h-2v2h2v-2zm-2 4h-2v2h2v-2z" />
                                        <path d="M7 19h10V5H7v14z" fill="none" />
                                        <path d="M14 15h3v-2h-3v2zm0-4h3V9h-3v2zm0-4h3V5h-3v2z" opacity=".3" />
                                        <path d="M7 5v14h10V5H7zm10 10h-3v-2h3v2zm0-4h-3V9h3v2zm0-4h-3V5h3v2z" />
                                    </svg>
                                    {isSaving ? '保存中...' : 'Docs'}
                                </button>
                            </div>
                        </div>

                        {/* Editable Content */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg min-h-full p-8 max-w-[210mm] mx-auto">
                                <textarea
                                    value={contractContent}
                                    onChange={(e) => setContractContent(e.target.value)}
                                    placeholder="ここに契約書の内容が表示されます。直接編集も可能です。"
                                    className="w-full h-full min-h-[500px] bg-transparent border-none outline-none resize-none text-gray-900 dark:text-gray-100 font-serif leading-relaxed"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
