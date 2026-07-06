import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RenderXML } from '@/xml/renderers.tsx';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

const defaultTranslations: Record<string, unknown> = {
    actions: {
        hidden: 'Hidden',
        saveProfile: 'Save profile',
        submit: 'Submit',
    },
    anchors: {
        download: 'Download',
        labelOnly: 'Label only',
        openIssue: 'Open issue',
    },
    avatar: {
        badgeCount: '1',
        initials: 'AL',
    },
    badges: {
        new: 'New',
    },
    core: {
        visible: 'Visible',
    },
    dialogs: {
        actions: 'Actions',
        cannotUndo: 'This cannot be undone.',
        createInventoryItem: 'Create inventory item',
        createItem: 'Create item',
        createOneItem: 'Create one item.',
        deleteIssue: 'Delete issue',
        editQuote: 'Edit quote',
        open: 'Open dialog',
        reviewQuote: 'Review the quote details before saving the next revision.',
    },
    fields: {
        fullName: 'Full name',
        invoiceHelp: 'This appears on invoices and emails.',
        newsletter: 'Subscribe to the newsletter',
        username: 'Username',
    },
    inputGroup: {
        public: 'Public',
        search: 'Search',
        symbolAt: '@',
    },
    labels: {
        newsletter: 'Newsletter',
    },
    longlink: {
        one: 'One',
        two: 'Two',
    },
    menu: {
        billing: 'Billing',
        billingContent: 'Billing content',
        overview: 'Overview',
        overviewContent: 'Overview content',
        profile: 'Profile',
        profileContent: 'Profile content',
        settings: 'Settings',
        settingsContent: 'Settings content',
    },
    radio: {
        high: 'High',
        low: 'Low',
        medium: 'Medium',
    },
    select: {
        active: 'Active',
        archived: 'Archived',
        operations: 'Operations',
        overview: 'Overview',
        settings: 'Settings',
        status: 'Status',
        views: 'Views',
    },
    table: {
        growth: 'Growth',
        onTrack: 'On track',
        projected: 'Projected',
        q1: 'Q1',
        q2: 'Q2',
        quarter: 'Quarter',
        revenue: 'Revenue',
        revenueQ1: '$120k',
        revenueQ2: '$154k',
        status: 'Status',
        total: 'Total',
        totalGrowth: '20%',
        totalRevenue: '$274k',
        twelvePercent: '12%',
        twentyEightPercent: '28%',
    },
    tabs: {
        overview: 'Overview',
        overviewPanel: 'Overview panel',
        settings: 'Settings',
        settingsPanel: 'Settings panel',
    },
};

/** Renders XML AST through the providers required by runtime components. */
export function renderXmlToMarkup(
    ast: ASTNode[],
    ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} },
    baseUrl = ''
): string {
    const queryClient = new QueryClient();
    const runtimeContext = ctx.translations === undefined ? { ...ctx, translations: defaultTranslations } : ctx;

    return renderToStaticMarkup(
        createElement(
            QueryClientProvider,
            { client: queryClient },
            createElement(
                MemoryRouter,
                null,
                createElement('div', null, createElement(RenderXML, { ast, ctx: runtimeContext, baseUrl }))
            )
        )
    );
}
