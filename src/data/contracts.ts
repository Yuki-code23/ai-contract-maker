export interface Contract {
    id: number;
    timestamp: string;
    partyA: string; // 甲
    partyB: string; // 乙
    status: '提案中' | '締結済み' | '終了';
    storagePath: string;
    autoRenewal: boolean;
    deadline: string;
    contractNumber?: string;
    title?: string;
    metadata?: any;
}

export const CONTRACTS: Contract[] = [
    {
        id: 1,
        timestamp: '2024-01-15 10:30',
        partyA: '株式会社A',
        partyB: '株式会社XYZ',
        status: '締結済み',
        storagePath: 'https://drive.google.com/file/d/abc123',
        autoRenewal: true,
        deadline: '2025-01-15',
        title: 'システム開発委託契約書',
    },
    {
        id: 2,
        timestamp: '2024-02-20 14:15',
        partyA: '株式会社B',
        partyB: '合同会社DEF',
        status: '提案中',
        storagePath: 'https://drive.google.com/file/d/def456',
        autoRenewal: false,
        deadline: '2025-02-20',
        title: 'コンサルティング業務委託契約書',
    },
    {
        id: 3,
        timestamp: '2023-12-10 09:00',
        partyA: '合同会社C',
        partyB: '株式会社GHI',
        status: '終了',
        storagePath: 'https://drive.google.com/file/d/ghi789',
        autoRenewal: false,
        deadline: '2024-12-10',
        title: '機密保持契約書',
    },
];
