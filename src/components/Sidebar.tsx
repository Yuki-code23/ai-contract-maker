'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarProps {
    activePage?: string;
}

export default function Sidebar({ activePage }: SidebarProps = {}) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isContractMenuOpen, setIsContractMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Determine active page from pathname if not provided
    const currentPage = activePage || pathname;

    // Handle mouse movement for auto-open/close
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Open sidebar when mouse is within 50px of left edge
            if (e.clientX <= 50) {
                setIsCollapsed(false);
            }
            // Close sidebar when mouse moves away from sidebar area (more than 300px from left)
            else if (e.clientX > 300) {
                setIsCollapsed(true);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div
            className={`flex flex-col h-screen transition-all duration-500 ease-in-out ${isCollapsed
                ? 'w-14 p-2'
                : 'w-72 p-4 bg-[#f0f4f9] dark:bg-[#1e1f20] border-r border-gray-200 dark:border-gray-700'
                }`}
        >
            {/* Header / Menu Toggle */}
            <div className={`${isCollapsed ? '' : 'flex items-center justify-between mb-6'}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>
            </div>



            {/* Lists Container */}
            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Home Link */}
                    <div>
                        <button
                            onClick={() => router.push('/')}
                            className={`w-full text-left rounded-md p-2 transition-colors ${currentPage === '/'
                                ? 'bg-blue-100 dark:bg-blue-900'
                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <h3 className={`text-sm ${currentPage === '/'
                                ? 'font-bold text-blue-900 dark:text-blue-100'
                                : 'font-semibold text-gray-700 dark:text-gray-200'
                                }`}>ホーム</h3>
                        </button>
                    </div>

                    {/* Contract Creation Menu */}
                    <div>
                        <button
                            onClick={() => setIsContractMenuOpen(!isContractMenuOpen)}
                            className={`w-full text-left hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md p-2 transition-colors ${isCollapsed ? 'flex justify-center' : 'flex items-center justify-between'}`}
                        >
                            {isCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500 dark:text-gray-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                            ) : (
                                <>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">契約書作成</h3>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isContractMenuOpen ? 'rotate-180' : ''}`}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </>
                            )}
                        </button>
                        {!isCollapsed && isContractMenuOpen && (
                            <div className="ml-4 mt-1 space-y-1">
                                <button
                                    onClick={() => router.push('/ai-generation')}
                                    className={`w-full text-left rounded-md p-2 text-sm transition-colors ${currentPage === '/ai-generation'
                                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold'
                                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    AI契約書作成
                                </button>
                                <button
                                    onClick={() => router.push('/template')}
                                    className={`w-full text-left rounded-md p-2 text-sm transition-colors ${currentPage === '/template'
                                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold'
                                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    テンプレート
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Company List Link */}
                    <div>
                        <button
                            onClick={() => router.push('/companies')}
                            className={`w-full text-left rounded-md p-2 transition-colors ${isCollapsed ? 'flex justify-center' : ''
                                } ${currentPage === '/companies'
                                    ? 'bg-blue-100 dark:bg-blue-900'
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {isCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500 dark:text-gray-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                </svg>
                            ) : (
                                <h3 className={`text-sm ${currentPage === '/companies'
                                    ? 'font-bold text-blue-900 dark:text-blue-100'
                                    : 'font-semibold text-gray-700 dark:text-gray-200'
                                    }`}>企業一覧</h3>
                            )}
                        </button>
                    </div>

                    {/* Contract List Link */}
                    <div>
                        <button
                            onClick={() => router.push('/contracts')}
                            className={`w-full text-left rounded-md p-2 transition-colors ${isCollapsed ? 'flex justify-center' : ''
                                } ${currentPage === '/contracts'
                                    ? 'bg-blue-100 dark:bg-blue-900'
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {isCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500 dark:text-gray-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                            ) : (
                                <h3 className={`text-sm ${currentPage === '/contracts'
                                    ? 'font-bold text-blue-900 dark:text-blue-100'
                                    : 'font-semibold text-gray-700 dark:text-gray-200'
                                    }`}>契約一覧</h3>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Settings Button */}
            {!isCollapsed && (
                <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
                    <button
                        onClick={() => router.push('/settings')}
                        className={`flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {!isCollapsed && <span>設定</span>}
                    </button>
                </div>
            )}

        </div>
    );
}
