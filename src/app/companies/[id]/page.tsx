import { use } from 'react';

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">企業詳細</h1>
            <p>ID: {id} の企業ページです。</p>
        </div>
    );
}
