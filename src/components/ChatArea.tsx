'use client';

export default function ChatArea() {
    const suggestions = [
        {
            title: 'Python の学習計画',
            description: '初心者向けの4週間の学習スケジュールを作成して',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
            ),
        },
        {
            title: 'メールの作成',
            description: 'プロジェクトの進捗報告メールを下書きして',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
            ),
        },
        {
            title: 'アイデア出し',
            description: '新しいスマホアプリのユニークなアイデアを5つ出して',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
            ),
        },
        {
            title: '比較する',
            description: 'React と Vue.js のメリット・デメリットを比較して',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto mt-12 md:mt-24">
                {/* Greeting */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2">
                        <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 bg-clip-text text-transparent">
                            こんにちは、ユーザーさん
                        </span>
                    </h1>
                    <h2 className="text-4xl md:text-6xl font-bold text-gray-300 dark:text-gray-600">
                        今日はどのようなお手伝いができますか？
                    </h2>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {suggestions.map((card, index) => (
                        <button
                            key={index}
                            className="flex flex-col h-48 p-4 bg-gray-100 dark:bg-[#1e1f20] hover:bg-gray-200 dark:hover:bg-[#2d2e2f] rounded-xl text-left transition-colors relative group"
                        >
                            <div className="flex-1">
                                <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">{card.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{card.description}</p>
                            </div>
                            <div className="absolute bottom-4 right-4 p-2 bg-white dark:bg-black rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                                {card.icon}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
