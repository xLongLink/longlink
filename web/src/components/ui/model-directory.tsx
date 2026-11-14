import { Button } from '@/components/shadcn/button';
import { Bookmark, Download, Star } from 'lucide-react';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { Subscribe, useTable, type Row, type ColumnDef } from '@tanstack/react-table';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { Frame, FrameHeader, FrameTitle, FramePanel, FrameFooter } from '@/components/reui/frame';
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '@/components/reui/data-grid/data-grid';

type Model = {
    id: string;
    name: string;
    provider: keyof typeof providerLogos;
    url: string;
    rating: number;
    reviews: number;
    context: number;
    input: number;
    output: number;
    image: boolean;
};

// Brand marks from Simple Icons (CC0).
const providerLogos = {
    OpenAI: {
        color: 'currentColor',
        path: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z'
    },
    Anthropic: {
        color: 'currentColor',
        path: 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z'
    },
    Google: {
        color: '#4285F4',
        path: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
    },
    Mistral: {
        color: '#FA520F',
        path: 'M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z'
    }
};

// Keep the showcase local and deterministic; prices and reviews are illustrative.
const models: Model[] = [
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        url: 'https://openai.com/index/hello-gpt-4o/',
        rating: 4.8,
        reviews: 284,
        context: 128000,
        input: 2.5,
        output: 10,
        image: true
    },
    {
        id: 'claude-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        url: 'https://www.anthropic.com/news/claude-3-5-sonnet',
        rating: 4.9,
        reviews: 216,
        context: 200000,
        input: 3,
        output: 15,
        image: true
    },
    {
        id: 'gemini-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'Google',
        url: 'https://ai.google.dev/gemini-api/docs/models',
        rating: 4.7,
        reviews: 178,
        context: 2000000,
        input: 1.25,
        output: 5,
        image: true
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        provider: 'OpenAI',
        url: 'https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/',
        rating: 4.6,
        reviews: 193,
        context: 128000,
        input: 0.15,
        output: 0.6,
        image: true
    },
    {
        id: 'claude-haiku',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        url: 'https://www.anthropic.com/news/claude-3-haiku',
        rating: 4.5,
        reviews: 147,
        context: 200000,
        input: 0.25,
        output: 1.25,
        image: true
    },
    {
        id: 'gemini-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'Google',
        url: 'https://ai.google.dev/gemini-api/docs/models',
        rating: 4.6,
        reviews: 162,
        context: 1000000,
        input: 0.075,
        output: 0.3,
        image: true
    },
    {
        id: 'claude-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        url: 'https://www.anthropic.com/news/claude-3-family',
        rating: 4.8,
        reviews: 204,
        context: 200000,
        input: 15,
        output: 75,
        image: true
    },
    {
        id: 'o1-mini',
        name: 'o1-mini',
        provider: 'OpenAI',
        url: 'https://openai.com/index/openai-o1-mini-advancing-cost-efficient-reasoning/',
        rating: 4.7,
        reviews: 126,
        context: 128000,
        input: 3,
        output: 12,
        image: false
    },
    {
        id: 'mistral-large',
        name: 'Mistral Large',
        provider: 'Mistral',
        url: 'https://mistral.ai/news/mistral-large-2407',
        rating: 4.6,
        reviews: 98,
        context: 128000,
        input: 2,
        output: 6,
        image: false
    },
    {
        id: 'ministral',
        name: 'Ministral 8B',
        provider: 'Mistral',
        url: 'https://mistral.ai/news/ministraux',
        rating: 4.4,
        reviews: 73,
        context: 128000,
        input: 0.1,
        output: 0.1,
        image: false
    },
    {
        id: 'pixtral',
        name: 'Pixtral 12B',
        provider: 'Mistral',
        url: 'https://mistral.ai/news/pixtral-12b',
        rating: 4.5,
        reviews: 86,
        context: 128000,
        input: 0.15,
        output: 0.15,
        image: true
    },
    {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        url: 'https://platform.openai.com/docs/models',
        rating: 4.7,
        reviews: 251,
        context: 128000,
        input: 10,
        output: 30,
        image: true
    }
];

/** Uses stable model identities to retain bookmarks when rows leave the page. */
function ModelBookmark({ row }: { row: Row<DataGridFeatures, Model> }) {
    return (
        <Subscribe source={row.table.atoms.rowSelection}>
            {() => (
                <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Save ${row.original.name}`}
                    aria-pressed={row.getIsSelected()}
                    onClick={(event) => {
                        event.stopPropagation();
                        row.toggleSelected();
                    }}
                >
                    <Bookmark aria-hidden="true" className={row.getIsSelected() ? 'fill-current' : undefined} />
                </Button>
            )}
        </Subscribe>
    );
}

const columns: ColumnDef<DataGridFeatures, Model>[] = [
    {
        accessorKey: 'name',
        header: 'Model',
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0">
                    <path
                        fill={providerLogos[row.original.provider].color}
                        d={providerLogos[row.original.provider].path}
                    />
                </svg>
                <div className="flex min-w-0 flex-col gap-0.5">
                    <a
                        href={row.original.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {row.original.name}
                    </a>
                    <span className="text-xs text-muted-foreground">{row.original.provider}</span>
                </div>
            </div>
        )
    },
    {
        accessorKey: 'rating',
        header: 'Reviews',
        cell: ({ row }) => (
            <span className="flex items-center gap-1 tabular-nums">
                <Star aria-hidden="true" className="size-3.5 fill-current" />
                {row.original.rating.toFixed(1)}
                <span className="text-xs text-muted-foreground">({row.original.reviews})</span>
            </span>
        )
    },
    {
        accessorKey: 'context',
        header: 'Context',
        cell: ({ row }) => (
            <span className="tabular-nums">
                {row.original.context >= 1000000
                    ? `${row.original.context / 1000000}M`
                    : `${row.original.context / 1000}K`}
            </span>
        )
    },
    { id: 'save', header: 'Save', cell: ModelBookmark }
];

/** Showcases a native TanStack Table and ReUI DataGrid composition. */
export function ModelDirectory() {
    // Let TanStack own bookmarks and the current page.
    const table = useTable({
        features: dataGridFeatures,
        data: models,
        columns,
        getRowId: (row) => row.id,
        initialState: { pagination: { pageIndex: 0, pageSize: 5 } }
    });

    /** Export all models, not just the currently visible page. */
    function exportModels() {
        const csv = [
            ['Model', 'Provider', 'Rating', 'Reviews', 'Context', 'Input / 1M', 'Output / 1M', 'Modalities'],
            ...models.map((model) => [
                model.name,
                model.provider,
                model.rating,
                model.reviews,
                model.context,
                model.input,
                model.output,
                model.image ? 'Text and image' : 'Text'
            ])
        ]
            .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
            .join('\r\n');

        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'models.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    // Let the compact columns fit the available preview width.
    return (
        <DataGrid
            table={table}
            recordCount={models.length}
            className="min-w-0"
            tableLayout={{ dense: true, width: 'auto' }}
            onRowClick={(model) => window.open(model.url, '_blank', 'noopener,noreferrer')}
            emptyMessage="No models found"
        >
            <Frame variant="ghost" stacked dense spacing="sm" className="w-[95%] min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2">
                    <FrameTitle>
                        Models <span className="text-xs font-normal text-muted-foreground">({models.length})</span>
                    </FrameTitle>
                    <Button type="button" variant="outline" size="sm" onClick={exportModels}>
                        <Download aria-hidden="true" />
                        Export
                    </Button>
                </FrameHeader>
                <FramePanel className="min-w-0 p-0">
                    <DataGridScrollArea orientation="horizontal">
                        <DataGridTable />
                    </DataGridScrollArea>
                </FramePanel>
                <FrameFooter>
                    <DataGridPagination sizes={[5, 10, 25]} />
                </FrameFooter>
            </Frame>
        </DataGrid>
    );
}
