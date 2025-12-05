export interface QuickAccessItem {
    id: string;
    label: string;
    path: string;
    description: string;
    colorFrom: string;
    colorTo: string;
    icon: React.ReactNode; // We'll store the SVG path or component here, but for simplicity in data file, maybe just a string identifier or simple object if we want to keep it pure TS without JSX imports if possible, but JSX is fine in .tsx or if we rename to .tsx. Let's stick to .ts and use string for icon or just put the SVG in the component map.
    // Actually, to keep data clean, let's just store metadata and have a component map in the renderer.
    // OR, we can just export the array from a .tsx file.
}

// Let's use a simpler approach: ID and metadata. The component will handle the icon.
export const QUICK_ACCESS_ITEMS = [
    {
        id: 'ai-generation',
        label: 'AI契約書作成',
        path: '/ai-generation',
        description: 'AIを活用して、新しい契約書を簡単に作成します。',
        colorFrom: 'blue-500',
        colorTo: 'blue-600',
    },
    {
        id: 'template',
        label: 'テンプレート',
        path: '/template',
        description: '既存のテンプレートから契約書を作成します。',
        colorFrom: 'green-500',
        colorTo: 'green-600',
    },
    {
        id: 'companies',
        label: '企業一覧',
        path: '/companies',
        description: '登録されている企業情報を管理します。',
        colorFrom: 'yellow-500',
        colorTo: 'orange-500',
    },
    {
        id: 'contracts',
        label: '契約一覧',
        path: '/contracts',
        description: '作成済みの契約書を確認・管理します。',
        colorFrom: 'purple-500',
        colorTo: 'pink-500',
    },
    {
        id: 'settings',
        label: '設定',
        path: '/settings',
        description: 'アプリケーションの設定を変更します。',
        colorFrom: 'gray-500',
        colorTo: 'gray-600',
    },
];
