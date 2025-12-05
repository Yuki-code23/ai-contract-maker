'use client';

export default function InputArea() {
    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="relative flex items-center w-full bg-[#f0f4f9] dark:bg-[#1e1f20] rounded-full px-4 py-3 transition-colors focus-within:bg-white dark:focus-within:bg-[#2d2e2f] shadow-sm ring-1 ring-transparent focus-within:ring-gray-200 dark:focus-within:ring-gray-600">

                {/* Image Upload Button */}
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                </button>

                {/* Text Input */}
                <input
                    type="text"
                    placeholder="メッセージを入力"
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4"
                />

                {/* Microphone Button */}
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                </button>

                {/* Send Button (only appears when typing usually, but we'll show it for now or maybe just the mic) */}
                {/* Gemini usually shows mic if empty, send if typed. I'll just add a send button for completeness but maybe hide it or keep it visible. 
            Actually Gemini shows the send arrow on the right. */}
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ml-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                </button>

            </div>
            <div className="text-center mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Gemini は不正確な情報を表示する場合があります。
                    <a href="#" className="underline ml-1">プライバシーと Gemini アプリのアクティビティを確認</a>
                </p>
            </div>
        </div>
    );
}
