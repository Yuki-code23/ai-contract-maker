import { use } from 'react';

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">契約詳細</h1>
            <p>ID: {id} の契約ページです。</p>
        </div>
    );
}
