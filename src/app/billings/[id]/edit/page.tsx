'use client';

import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import { Suspense } from 'react';

export default function BillingEditPage({ params }: { params: { id: string } }) {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-gray-100">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131314] flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-2xl font-bold">請求書を編集 #{params.id}</h1>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    <Suspense fallback={<div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                        <InvoiceForm />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
