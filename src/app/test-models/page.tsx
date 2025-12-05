'use client';

import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function TestModelsPage() {
    const [apiKey, setApiKey] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const listModels = async () => {
        if (!apiKey) {
            setError('APIキーを入力してください');
            return;
        }

        setLoading(true);
        setError('');
        setModels([]);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);

            // Try to list models using the API
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.models) {
                const modelNames = data.models.map((model: any) => model.name);
                setModels(modelNames);
            } else {
                setError('モデルが見つかりませんでした');
            }
        } catch (err: any) {
            setError(`エラー: ${err.message}`);
            console.error('Error listing models:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">利用可能なGeminiモデルを確認</h1>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Gemini APIキー
                    </label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="APIキーを入力"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <button
                    onClick={listModels}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                >
                    {loading ? 'モデルを取得中...' : 'モデルを確認'}
                </button>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {models.length > 0 && (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-4">利用可能なモデル:</h2>
                        <div className="space-y-2">
                            {models.map((model, index) => (
                                <div
                                    key={index}
                                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm"
                                >
                                    {model}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>使い方:</strong> 上記のモデル名から "models/" を除いた部分を使用してください。
                                <br />
                                例: "models/gemini-pro" → "gemini-pro"
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
