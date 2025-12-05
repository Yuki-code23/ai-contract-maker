'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { generateContractResponse } from '@/lib/gemini';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
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
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('contract');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    // Load API key from localStorage on mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem('geminiApiKey');
        setApiKey(savedApiKey);
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

            const aiResponse: Message = {
                id: messages.length + 2,
                role: 'assistant',
                content: aiResponseText,
            };

            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage: Message = {
                id: messages.length + 2,
                role: 'assistant',
                content: 'エラーが発生しました。APIキーが正しいか確認してください。',
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

    // Extract contract content from messages
    const getContractContent = (): string => {
        // Get all assistant messages (excluding the first greeting)
        const contractMessages = messages
            .filter(msg => msg.role === 'assistant' && msg.id > 1)
            .map(msg => msg.content)
            .join('\n\n');
        return contractMessages;
    };

    // Export as text file
    const handleExportTxt = () => {
        const content = getContractContent();
        if (!content.trim()) {
            alert('エクスポートする契約書の内容がありません。');
            return;
        }
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export as docx file
    const handleExportDocx = async () => {
        const content = getContractContent();
        if (!content.trim()) {
            alert('エクスポートする契約書の内容がありません。');
            return;
        }
        try {
            const { Document, Packer, Paragraph, TextRun } = await import('docx');

            const lines = content.split('\n');
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

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
                    {/* Header */}
                    <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <div className="mb-[-16px]">
                            <BackButton />
                        </div>
                        <h1 className="text-2xl font-bold flex-1">AI契約書作成</h1>

                        {/* Export Section */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder="ファイル名"
                                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleExportTxt}
                                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                                title="テキストファイルとしてエクスポート"
                            >
                                .txt
                            </button>
                            <button
                                onClick={handleExportDocx}
                                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                title="Wordファイルとしてエクスポート"
                            >
                                .docx
                            </button>
                        </div>
                    </header>

                    {/* API Key Warning */}
                    {!apiKey && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-4">
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

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-2xl rounded-lg p-4 ${message.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        ))}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-2xl rounded-lg p-4 bg-gray-100 dark:bg-gray-800">
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
                    <div className="w-full max-w-4xl mx-auto p-4">
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


                            {/* Text Input */}
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="契約書について質問してください"
                                rows={1}
                                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4 py-2 resize-none max-h-48 overflow-y-auto"
                            />



                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ml-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                </svg>
                            </button>
                        </div>
                        <div className="text-center mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                AIは不正確な情報を表示する場合があります。重要な契約内容は必ず専門家に確認してください。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
