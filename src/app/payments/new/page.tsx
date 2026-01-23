'use client';

import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';
import InvoiceForm from '@/components/invoice/InvoiceForm';

export default function NewBillingPage() {
    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8 pb-32">
                    <BackButton />
                    <Suspense fallback={<div>読み込み中...</div>}>
                        <InvoiceForm type="payable" />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
