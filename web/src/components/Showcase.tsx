import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Wordmark } from '@/components/Wordmark';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Token } from '@astryxdesign/core/Token';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { PageContainer } from '@/components/PageContainer';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { PlatformFrame } from '@/platform/layouts/Platform';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Table, pixel, proportional } from '@astryxdesign/core/Table';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import {
    Archive,
    BriefcaseBusiness,
    Circle,
    ClipboardCheck,
    FileText,
    FolderKanban,
    History,
    Layers,
    ListFilter,
} from 'lucide-react';

type Decision = 'In review' | 'Shortlisted' | 'Passed';

interface Property extends Record<string, unknown> {
    id: string;
    name: string;
    city: string;
    price: number;
    rent: number;
    occupancy: number;
    evidence: string;
    status: Decision;
}

// Keep the illustrative portfolio and its audit trail local to this preview.
const sample = {
    properties: [
        {
            id: 'p1',
            name: 'Riverside apartments',
            city: 'Basel · 12 units',
            price: 4200000,
            rent: 252000,
            occupancy: 100,
            evidence: 'Rent roll and inspection received. No major repairs identified.',
            status: 'In review',
        },
        {
            id: 'p2',
            name: 'Station courtyard',
            city: 'Winterthur · 8 units',
            price: 3100000,
            rent: 155000,
            occupancy: 88,
            evidence: 'Rent roll received. Roof replacement estimate still outstanding.',
            status: 'In review',
        },
        {
            id: 'p3',
            name: 'Garden residences',
            city: 'Bern · 10 units',
            price: 3800000,
            rent: 228000,
            occupancy: 100,
            evidence: 'Financial and technical documents complete. Ready for due diligence.',
            status: 'Shortlisted',
        },
        {
            id: 'p4',
            name: 'Old town studios',
            city: 'Lucerne · 6 units',
            price: 2900000,
            rent: 116000,
            occupancy: 83,
            evidence: 'Yield below target. Two leases expire within the next six months.',
            status: 'Passed',
        },
    ] satisfies Property[],
    events: [
        {
            id: 'e1',
            actor: 'Anna · Investment analyst',
            action: 'Shortlisted Garden residences for due diligence.',
            time: '10:42',
        },
        {
            id: 'e2',
            actor: 'Screening workflow · Automated',
            action: 'Calculated yields and checked occupancy for all four properties.',
            time: '10:38',
        },
        {
            id: 'e3',
            actor: 'Screening workflow · Automated',
            action: 'Imported rent rolls and property details.',
            time: '10:36',
        },
    ],
};

// Format Swiss property values consistently during server and client rendering.
const currency = new Intl.NumberFormat('en-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 });

// Use the same status colors in the portfolio and the selected record.
const statusColors = { 'In review': 'blue', Shortlisted: 'green', Passed: 'gray' } as const;

// Keep the embedded pipeline compact while exposing every sample property across two pages.
const pageSize = 2;

// Group illustrative workflows while keeping demo navigation separate from sample-only entries.
const organizationTabs = [
    {
        id: 'office',
        label: 'Office',
        icon: BriefcaseBusiness,
        solutions: [
            {
                id: 'materials',
                name: 'Material Samples',
                description: 'Catalog materials, suppliers, sample locations, and availability.',
            },
            {
                id: 'suppliers',
                name: 'Supplier Directory',
                description: 'Organize preferred suppliers, products, and contact information.',
            },
            {
                id: 'documents',
                name: 'Technical Library',
                description:
                    'Organize construction standards, technical specifications, and reusable reference documents.',
            },
        ],
    },
    {
        id: 'project',
        label: 'Projects',
        icon: FolderKanban,
        solutions: [
            {
                id: 'zurich',
                name: '134 Zürich',
                description: 'Contemporary residential development in the city center.',
            },
            {
                id: 'milan',
                name: '217 Milan',
                description: 'Renovation of a historic commercial building.',
            },
            {
                id: 'geneva',
                name: '326 Geneva',
                description: 'Modern office headquarters overlooking Lake Geneva.',
            },
        ],
    },
    {
        id: 'proposal',
        label: 'Proposals',
        icon: FileText,
        solutions: [
            {
                id: 'amsterdam',
                name: '752 Amsterdam',
                description: 'Proposal for a new waterfront residential complex.',
            },
            {
                id: 'copenhagen',
                name: '819 Copenhagen',
                description: 'Architectural competition for a cultural center.',
            },
        ],
    },
    {
        id: 'archive',
        label: 'Archive',
        icon: Archive,
        solutions: [
            {
                id: 'basel',
                name: '042 Basel',
                description: 'Completed renovation of a historic residential building.',
            },
            {
                id: 'paris',
                name: '086 Paris',
                description: 'Luxury apartment refurbishment and interior redesign.',
            },
            {
                id: 'london',
                name: '109 London',
                description: 'Completed mixed-use commercial development.',
            },
            {
                id: 'vienna',
                name: '128 Vienna',
                description: 'Restoration and conversion of a historic boutique hotel.',
            },
            {
                id: 'rotterdam',
                name: '603 Rotterdam',
                description: 'Proposal for a waterfront community pavilion.',
            },
            {
                id: 'oslo',
                name: '714 Oslo',
                description: 'Competition proposal for a neighborhood library.',
            },
        ],
    },
];

// Keep product-category badges consistent using restrained categorical theme colors.
const productColors = {
    'Timber flooring': 'orange',
    'Interior finishes': 'purple',
    'Natural stone': 'neutral',
    Ceramics: 'teal',
    Lighting: 'yellow',
    Controls: 'blue',
} as const;

// Use local catalog and document records; no sample action sends an order or reads account data.
const suppliers = [
    {
        id: 'holz',
        name: 'Holzwerk Zürich',
        city: 'Zürich',
        products: ['Timber flooring', 'Interior finishes'] as const,
        contact: 'Mara Weber',
        email: 'samples@holzwerk.example',
    },
    {
        id: 'stein',
        name: 'Stein & Form',
        city: 'Bern',
        products: ['Natural stone', 'Ceramics'] as const,
        contact: 'Luca Meier',
        email: 'studio@steinform.example',
    },
    {
        id: 'licht',
        name: 'Lichtatelier Basel',
        city: 'Basel',
        products: ['Lighting', 'Controls'] as const,
        contact: 'Nina Keller',
        email: 'projects@lichtatelier.example',
    },
];

const materials = [
    {
        id: 'oak',
        name: 'Natural oak',
        supplier: 'Holzwerk Zürich',
        detail: 'Brushed flooring · 200 × 200 mm',
        location: 'Library A · Shelf 2',
        available: true,
    },
    {
        id: 'limestone',
        name: 'Jura limestone',
        supplier: 'Stein & Form',
        detail: 'Honed stone · 150 × 150 mm',
        location: 'Library B · Shelf 1',
        available: true,
    },
    {
        id: 'ceramic',
        name: 'Warm-white ceramic',
        supplier: 'Stein & Form',
        detail: 'Matt wall tile · 100 × 100 mm',
        location: 'On loan · Basel project',
        available: false,
    },
];

const documents = [
    {
        id: 'standards',
        name: 'Construction standards index',
        description: 'Reference · Updated 8 October',
        paragraphs: [
            'Maintain the project register of applicable construction standards and their current editions.',
            'Group references by structural design, building envelope, fire protection, and accessibility.',
            'Confirm applicable requirements with the responsible specialists before issuing specifications.',
        ],
    },
    {
        id: 'finishes',
        name: 'Interior finishes specification',
        description: 'Specification · Updated 2 October',
        paragraphs: [
            'Record the material, finish, supplier reference, and approved sample for each room.',
            'Include manufacturer installation guidance, maintenance instructions, and required performance documentation.',
            'Review substitutions against the approved specification before procurement.',
        ],
    },
    {
        id: 'checklist',
        name: 'Building envelope review checklist',
        description: 'Checklist · Updated 30 September',
        paragraphs: [
            'Review wall, roof, and window junction details against the project specification.',
            'Record unresolved waterproofing, insulation, and airtightness coordination questions.',
            'Assign review actions to the design team and retain approved details as reusable references.',
        ],
    },
];

// Project and proposal previews share a small detail model; archived records remain read-only.
const records = [
    {
        id: 'zurich',
        kind: 'Project',
        stage: 'Design development',
        roadmapStep: 1,
        archived: false,
    },
    {
        id: 'milan',
        kind: 'Project',
        stage: 'Technical coordination',
        roadmapStep: 1,
        archived: false,
    },
    {
        id: 'geneva',
        kind: 'Project',
        stage: 'Concept design',
        roadmapStep: 1,
        archived: false,
    },
    {
        id: 'amsterdam',
        kind: 'Proposal',
        stage: 'Preparing submission',
        roadmapStep: 2,
        archived: false,
    },
    {
        id: 'copenhagen',
        kind: 'Proposal',
        stage: 'Competition design',
        roadmapStep: 1,
        archived: false,
    },
    {
        id: 'basel',
        kind: 'Project',
        stage: 'Completed',
        roadmapStep: 3,
        archived: true,
    },
    {
        id: 'paris',
        kind: 'Project',
        stage: 'Completed',
        roadmapStep: 3,
        archived: true,
    },
    {
        id: 'london',
        kind: 'Project',
        stage: 'Completed',
        roadmapStep: 3,
        archived: true,
    },
    {
        id: 'vienna',
        kind: 'Project',
        stage: 'Completed',
        roadmapStep: 3,
        archived: true,
    },
    {
        id: 'rotterdam',
        kind: 'Proposal',
        stage: 'Not selected',
        roadmapStep: 3,
        archived: true,
    },
    {
        id: 'oslo',
        kind: 'Proposal',
        stage: 'Withdrawn',
        roadmapStep: 3,
        archived: true,
    },
];

/** Offers local-only organization workflows with persistent sample interactions. */
export function Showcase() {
    // Store decisions and their audit entries together while retaining navigation state.
    const [dashboard, setDashboard] = useState(sample);
    const [view, setView] = useState<'organization' | 'solution' | 'record'>('organization');
    const [recordId, setRecordId] = useState('zurich');
    const [uploads, setUploads] = useState<Record<string, File | File[] | null>>({});
    const [solutionId, setSolutionId] = useState<'screening' | 'materials' | 'suppliers' | 'documents'>('screening');
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [organizationTab, setOrganizationTab] = useState('office');
    const [tab, setTab] = useState('pipeline');
    const [selectedId, setSelectedId] = useState('p1');
    const [page, setPage] = useState(1);

    // Retain the organization category independently of the screening tabs.
    const category = organizationTabs.find((item) => item.id === organizationTab) ?? organizationTabs[1];

    // Resolve the active solution and document independently of retained screening navigation.
    const activeSolution =
        solutionId === 'screening'
            ? { name: 'Acquisition Screening' }
            : organizationTabs.flatMap((item) => item.solutions).find((item) => item.id === solutionId);

    // Resolve an optional technical document preview without changing the library selection.
    const activeDocument = documents.find((item) => item.id === documentId);

    // Resolve the selected project or proposal without affecting Office or screening state.
    const activeRecord = records.find((item) => item.id === recordId);
    const activeRecordEntry = organizationTabs.flatMap((item) => item.solutions).find((item) => item.id === recordId);

    // Use the same one-based page and page size for both the rendered rows and pagination controls.
    const pageStart = (page - 1) * pageSize;
    const properties = dashboard.properties.slice(pageStart, pageStart + pageSize);

    // Resolve the selected property before rendering its screening details.
    const selected = dashboard.properties.find((property) => property.id === selectedId);

    if (!selected || !activeSolution) return null;

    // Show actual calculations against explicit sample investment criteria.
    const yieldPercent = (selected.rent / selected.price) * 100;

    const criteria = [
        {
            id: 'yield',
            criterion: 'Gross rental yield',
            target: 'At least 5.5%',
            actual: `${yieldPercent.toFixed(1)}%`,
            passes: yieldPercent >= 5.5,
        },
        {
            id: 'occupancy',
            criterion: 'Occupancy',
            target: 'At least 95%',
            actual: `${selected.occupancy}%`,
            passes: selected.occupancy >= 95,
        },
        {
            id: 'price',
            criterion: 'Acquisition price',
            target: 'Up to CHF 5m',
            actual: currency.format(selected.price),
            passes: selected.price <= 5000000,
        },
    ];

    /** Records a human decision and its corresponding sample audit entry atomically. */
    function recordDecision(status: Exclude<Decision, 'In review'>) {
        // Ignore repeat decisions; update only this property and retain earlier activity.
        setDashboard((current) => {
            const property = current.properties.find((item) => item.id === selectedId);

            if (!property || property.status !== 'In review') return current;

            // Keep the portfolio and the audit trail in sync without a server request.
            return {
                properties: current.properties.map((item) => (item.id === selectedId ? { ...item, status } : item)),
                events: [
                    {
                        id: `e${current.events.length + 1}`,
                        actor: 'You · Investment analyst',
                        action: `${status === 'Shortlisted' ? 'Shortlisted' : 'Passed on'} ${property.name}.`,
                        time: 'Just now',
                    },
                    ...current.events,
                ],
            };
        });
    }

    // Match the capability grids' 1000px width with a proportional desktop window and a 420px mobile minimum.
    return (
        <Section
            className="relative z-20 -mt-32 sm:-mt-48"
            padding={6}
            paddingBlock={10}
            paddingBlockStart={6}
            variant="transparent"
            aria-label="Acquisition screening preview"
        >
            {/* Introduce the interactive preview with a single concise line. */}
            <Stack hAlign="center" className="mb-4">
                <Heading level={2} className="font-(family-name:--font-family-handwritten)">
                    Create the tools your business needs
                </Heading>
            </Stack>
            {/* Isolate container padding so Layout cannot bleed into the clipped window frame. */}
            <Section
                padding={0}
                width="100%"
                maxWidth={1000}
                height="clamp(420px, 62.5vw, 625px)"
                className="mx-auto my-0 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-lg"
            >
                <Layout
                    height="fill"
                    padding={0}
                    header={
                        <>
                            {/* Window controls are decorative, not extra demo actions or keyboard stops. */}
                            <Stack
                                direction="horizontal"
                                gap={1.5}
                                align="center"
                                paddingInline={3}
                                aria-hidden="true"
                                className="h-6 shrink-0 border-b border-border bg-muted"
                            >
                                <Icon
                                    icon={Circle}
                                    size="xsm"
                                    className="fill-(--color-window-close) stroke-(--color-window-close)"
                                />
                                <Icon
                                    icon={Circle}
                                    size="xsm"
                                    className="fill-(--color-window-minimize) stroke-(--color-window-minimize)"
                                />
                                <Icon
                                    icon={Circle}
                                    size="xsm"
                                    className="fill-(--color-window-maximize) stroke-(--color-window-maximize)"
                                />
                            </Stack>
                        </>
                    }
                    content={
                        <LayoutContent
                            padding={0}
                            isScrollable={false}
                            role="region"
                            label="Interactive screening dashboard"
                        >
                            <PlatformFrame
                                height="fill"
                                className="h-full"
                                breadcrumb={
                                    <Breadcrumbs separator=">" variant="supporting">
                                        <BreadcrumbItem
                                            href="#showcase-organization"
                                            onClick={(event) => {
                                                // Keep sample breadcrumbs inside the preview rather than navigating to account pages.
                                                event.preventDefault();
                                                setView('organization');
                                            }}
                                        >
                                            <Wordmark />
                                        </BreadcrumbItem>
                                        <BreadcrumbItem
                                            href={view !== 'organization' ? '#showcase-organization' : undefined}
                                            isCurrent={view === 'organization'}
                                            onClick={(event) => {
                                                // Open the organization without discarding the solution's state.
                                                event.preventDefault();
                                                setView('organization');
                                            }}
                                        >
                                            Swiss Arch
                                        </BreadcrumbItem>
                                        {view !== 'organization' && (
                                            <BreadcrumbItem isCurrent>
                                                {view === 'record' ? activeRecordEntry?.name : activeSolution.name}
                                            </BreadcrumbItem>
                                        )}
                                    </Breadcrumbs>
                                }
                                action={<Avatar name="Anna Keller" />}
                                navigation={
                                    view === 'organization' ? (
                                        <TabList
                                            value={organizationTab}
                                            onChange={setOrganizationTab}
                                            role="tablist"
                                            aria-label="Sample organization views"
                                            size="sm"
                                        >
                                            {organizationTabs.map((item) => {
                                                // Match the screening navigation's decorative 16px icons.
                                                const TabIcon = item.icon;

                                                return (
                                                    <Tab
                                                        key={item.id}
                                                        value={item.id}
                                                        label={item.label}
                                                        panelId="showcase-organization"
                                                        icon={<TabIcon aria-hidden="true" size={16} />}
                                                    />
                                                );
                                            })}
                                        </TabList>
                                    ) : view === 'record' ? (
                                        <TabList
                                            value="overview"
                                            onChange={() => undefined}
                                            role="tablist"
                                            aria-label="Project and proposal views"
                                            size="sm"
                                        >
                                            <Tab
                                                value="overview"
                                                label="Overview"
                                                panelId="showcase-record"
                                                icon={
                                                    activeRecord?.kind === 'Proposal' ? (
                                                        <FileText aria-hidden="true" size={16} />
                                                    ) : (
                                                        <FolderKanban aria-hidden="true" size={16} />
                                                    )
                                                }
                                            />
                                        </TabList>
                                    ) : solutionId === 'screening' ? (
                                        <TabList
                                            value={tab}
                                            onChange={setTab}
                                            role="tablist"
                                            aria-label="Sample application views"
                                            size="sm"
                                        >
                                            <Tab
                                                value="pipeline"
                                                label="Pipeline"
                                                panelId="showcase-pipeline"
                                                icon={<ListFilter aria-hidden="true" size={16} />}
                                            />
                                            <Tab
                                                value="review"
                                                label="Review"
                                                panelId="showcase-review"
                                                icon={<ClipboardCheck aria-hidden="true" size={16} />}
                                            />
                                            <Tab
                                                value="activity"
                                                label="Activity"
                                                panelId="showcase-activity"
                                                icon={<History aria-hidden="true" size={16} />}
                                            />
                                        </TabList>
                                    ) : solutionId === 'materials' ? (
                                        <TabList
                                            value="catalog"
                                            onChange={() => undefined}
                                            role="tablist"
                                            aria-label="Material sample views"
                                            size="sm"
                                        >
                                            <Tab
                                                value="catalog"
                                                label="Catalog"
                                                panelId="showcase-materials"
                                                icon={<Layers aria-hidden="true" size={16} />}
                                            />
                                        </TabList>
                                    ) : (
                                        <TabList
                                            value={solutionId}
                                            onChange={() => setDocumentId(null)}
                                            role="tablist"
                                            aria-label="Office solution views"
                                            size="sm"
                                        >
                                            <Tab
                                                value={solutionId}
                                                label={solutionId === 'documents' ? 'Library' : 'Suppliers'}
                                                panelId={`showcase-${solutionId}`}
                                                icon={<FileText aria-hidden="true" size={16} />}
                                            />
                                        </TabList>
                                    )
                                }
                            >
                                <PageContainer
                                    minHeight="100%"
                                    paddingBlock={view === 'organization' ? 1 : 2}
                                    className="px-8 md:px-16"
                                >
                                    {view === 'organization' && (
                                        <Stack
                                            id="showcase-organization"
                                            role="tabpanel"
                                            aria-label={category.label}
                                            tabIndex={0}
                                            gap={2}
                                        >
                                            <Stack gap={0} className="min-h-8">
                                                <Heading level={2}>{category.label}</Heading>
                                            </Stack>
                                            <Table
                                                data={category.solutions}
                                                idKey="id"
                                                hasHover
                                                density="compact"
                                                columns={[
                                                    {
                                                        key: 'name',
                                                        header: category.id === 'office' ? 'Solution' : 'Name',
                                                        width: proportional(1),
                                                        renderCell: (solution) => {
                                                            // Use the same supported ID for link visibility, navigation, and preview selection.
                                                            const demoSolutionId =
                                                                solution.id === 'screening' ||
                                                                solution.id === 'materials' ||
                                                                solution.id === 'suppliers' ||
                                                                solution.id === 'documents'
                                                                    ? solution.id
                                                                    : undefined;

                                                            // Project and proposal rows open the same detail layout, including archived entries.
                                                            const record = records.find(
                                                                (item) => item.id === solution.id
                                                            );

                                                            return (
                                                                <Stack gap={0}>
                                                                    {demoSolutionId || record ? (
                                                                        <Link
                                                                            isStandalone
                                                                            size="base"
                                                                            href={
                                                                                record
                                                                                    ? '#showcase-record'
                                                                                    : `#showcase-${demoSolutionId === 'screening' ? tab : demoSolutionId}`
                                                                            }
                                                                            onClick={(event) => {
                                                                                // Open the chosen preview without resetting its state or the screening workflow.
                                                                                event.preventDefault();

                                                                                if (record) {
                                                                                    setRecordId(record.id);
                                                                                    setView('record');
                                                                                } else if (demoSolutionId) {
                                                                                    setSolutionId(demoSolutionId);
                                                                                    setView('solution');
                                                                                }
                                                                            }}
                                                                        >
                                                                            {solution.name}
                                                                        </Link>
                                                                    ) : (
                                                                        <Text size="base">{solution.name}</Text>
                                                                    )}
                                                                    <Text type="supporting">
                                                                        {solution.description}
                                                                    </Text>
                                                                </Stack>
                                                            );
                                                        },
                                                    },
                                                ]}
                                            />
                                        </Stack>
                                    )}
                                    {view === 'record' && activeRecord && activeRecordEntry && (
                                        <Stack
                                            id="showcase-record"
                                            role="tabpanel"
                                            aria-label={activeRecord.kind}
                                            tabIndex={0}
                                            gap={3}
                                        >
                                            <Stack gap={1} align="start">
                                                <Heading level={2}>{activeRecordEntry.name}</Heading>
                                                {activeRecord.stage !== 'Preparing submission' && (
                                                    <Stack direction="horizontal" align="center" gap={2}>
                                                        <Badge
                                                            label={activeRecord.stage}
                                                            variant={activeRecord.archived ? 'neutral' : 'blue'}
                                                        />
                                                        {activeRecord.archived && (
                                                            <Text type="supporting">Archived</Text>
                                                        )}
                                                    </Stack>
                                                )}
                                            </Stack>
                                            <Stepper
                                                activeStep={activeRecord.roadmapStep}
                                                orientation="vertical"
                                                indicatorPosition="on-track"
                                                density="compact"
                                                label={`${activeRecord.kind} timeline`}
                                            >
                                                {[
                                                    'Brief approved',
                                                    activeRecord.kind === 'Proposal' ? 'Concept prepared' : 'Design',
                                                    activeRecord.kind === 'Proposal'
                                                        ? activeRecord.archived
                                                            ? 'Decision recorded'
                                                            : 'Submission'
                                                        : 'Handover',
                                                ].map((label, step) => {
                                                    // Keep attachments local and isolated by record and timeline step.
                                                    const uploadKey = `${activeRecord.id}:${step}`;

                                                    return (
                                                        <Step
                                                            key={label}
                                                            step={step}
                                                            label={label}
                                                            description={
                                                                step === 0
                                                                    ? activeRecord.kind === 'Proposal'
                                                                        ? 'competition-brief.pdf'
                                                                        : 'project-brief.pdf'
                                                                    : undefined
                                                            }
                                                        >
                                                            {step !== 0 && (
                                                                <FileInput
                                                                    label={`Attach file to ${label}`}
                                                                    isLabelHidden
                                                                    placeholder="Attach file"
                                                                    mode="input"
                                                                    accept=".pdf,.docx,.xlsx,image/*"
                                                                    maxSize={10 * 1024 * 1024}
                                                                    width="100%"
                                                                    value={uploads[uploadKey] ?? null}
                                                                    isDisabled={activeRecord.archived}
                                                                    disabledMessage={
                                                                        activeRecord.archived
                                                                            ? 'Archived records are read-only.'
                                                                            : undefined
                                                                    }
                                                                    onChange={(files) => {
                                                                        // No upload request is made, and archived records cannot change.
                                                                        if (activeRecord.archived) return;

                                                                        setUploads((current) => ({
                                                                            ...current,
                                                                            [uploadKey]: files,
                                                                        }));
                                                                    }}
                                                                />
                                                            )}
                                                        </Step>
                                                    );
                                                })}
                                            </Stepper>
                                        </Stack>
                                    )}
                                    {view === 'solution' && solutionId === 'materials' && (
                                        <Stack
                                            id="showcase-materials"
                                            role="tabpanel"
                                            aria-label="Catalog"
                                            tabIndex={0}
                                            gap={3}
                                        >
                                            <Heading level={2}>Material Samples</Heading>
                                            <Grid columns={{ minWidth: 200, max: 3 }} gap={3}>
                                                {materials.map((material) => (
                                                    <Card key={material.id}>
                                                        <Stack gap={3}>
                                                            <Stack
                                                                direction="horizontal"
                                                                justify="between"
                                                                align="center"
                                                                wrap="wrap"
                                                                gap={2}
                                                            >
                                                                <Text weight="semibold">{material.name}</Text>
                                                                <Badge
                                                                    label={material.available ? 'Available' : 'On loan'}
                                                                    variant={material.available ? 'green' : 'orange'}
                                                                />
                                                            </Stack>
                                                            <Text type="supporting">{material.detail}</Text>
                                                            <Stack gap={1}>
                                                                <Text size="base" weight="medium">
                                                                    {material.supplier}
                                                                </Text>
                                                                <Text type="supporting">{material.location}</Text>
                                                            </Stack>
                                                        </Stack>
                                                    </Card>
                                                ))}
                                            </Grid>
                                        </Stack>
                                    )}
                                    {view === 'solution' && solutionId === 'suppliers' && (
                                        <Stack
                                            id="showcase-suppliers"
                                            role="tabpanel"
                                            aria-label="Suppliers"
                                            tabIndex={0}
                                            gap={3}
                                        >
                                            <Heading level={2}>Supplier Directory</Heading>
                                            <Table
                                                data={suppliers}
                                                idKey="id"
                                                density="compact"
                                                hasHover
                                                columns={[
                                                    {
                                                        key: 'name',
                                                        header: 'Supplier',
                                                        width: proportional(2),
                                                        renderCell: (supplier) => (
                                                            <Stack gap={0}>
                                                                <Text weight="medium">{supplier.name}</Text>
                                                                <Text type="supporting">{supplier.city}</Text>
                                                            </Stack>
                                                        ),
                                                    },
                                                    {
                                                        key: 'products',
                                                        header: 'Product range',
                                                        width: proportional(2),
                                                        renderCell: (supplier) => (
                                                            <Stack direction="horizontal" wrap="wrap" gap={1}>
                                                                {supplier.products.map((product) => (
                                                                    <Badge
                                                                        key={product}
                                                                        label={product}
                                                                        variant={productColors[product]}
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        ),
                                                    },
                                                    {
                                                        key: 'contact',
                                                        header: 'Contact',
                                                        width: proportional(2),
                                                        renderCell: (supplier) => (
                                                            <Stack gap={0}>
                                                                <Text>{supplier.contact}</Text>
                                                                <Text type="supporting">{supplier.email}</Text>
                                                            </Stack>
                                                        ),
                                                    },
                                                ]}
                                            />
                                        </Stack>
                                    )}
                                    {view === 'solution' && solutionId === 'documents' && (
                                        <Stack
                                            id="showcase-documents"
                                            role="tabpanel"
                                            aria-label="Documents"
                                            tabIndex={0}
                                            gap={3}
                                        >
                                            <Heading level={2}>{activeDocument?.name ?? 'Technical Library'}</Heading>
                                            {activeDocument ? (
                                                <Stack gap={3}>
                                                    <Button
                                                        label="Back to library"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDocumentId(null)}
                                                    />
                                                    <Text type="supporting">{activeDocument.description}</Text>
                                                    {activeDocument.paragraphs.map((paragraph) => (
                                                        <Text as="p" key={paragraph}>
                                                            {paragraph}
                                                        </Text>
                                                    ))}
                                                </Stack>
                                            ) : (
                                                <Grid columns={{ minWidth: 200, max: 3 }} gap={3}>
                                                    {documents.map((document) => (
                                                        <Card key={document.id} padding={3}>
                                                            <Stack gap={3} height="100%" justify="between">
                                                                <Stack gap={1}>
                                                                    <Icon icon={FileText} size="sm" color="secondary" />
                                                                    <Text weight="medium">{document.name}</Text>
                                                                    <Text type="supporting">
                                                                        {document.description}
                                                                    </Text>
                                                                </Stack>
                                                                <Button
                                                                    label={`Open ${document.name}`}
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => setDocumentId(document.id)}
                                                                >
                                                                    Open document
                                                                </Button>
                                                            </Stack>
                                                        </Card>
                                                    ))}
                                                </Grid>
                                            )}
                                        </Stack>
                                    )}
                                    {view === 'solution' && solutionId === 'screening' && tab === 'pipeline' && (
                                        <Stack
                                            id="showcase-pipeline"
                                            role="tabpanel"
                                            aria-label="Pipeline"
                                            tabIndex={0}
                                            gap={4}
                                        >
                                            <Table
                                                data={properties}
                                                idKey="id"
                                                rowIndexStart={pageStart + 1}
                                                rowCount={dashboard.properties.length}
                                                density="compact"
                                                hasHover
                                                columns={[
                                                    {
                                                        key: 'name',
                                                        header: 'Property',
                                                        width: proportional(2),
                                                        renderCell: (property) => (
                                                            <Stack gap={1}>
                                                                <Text weight="medium">{property.name}</Text>
                                                                <Text type="supporting">{property.city}</Text>
                                                            </Stack>
                                                        ),
                                                    },
                                                    {
                                                        key: 'price',
                                                        header: 'Price',
                                                        width: proportional(1),
                                                        renderCell: (property) => currency.format(property.price),
                                                    },
                                                    {
                                                        key: 'rent',
                                                        header: 'Gross yield',
                                                        width: proportional(1),
                                                        renderCell: (property) =>
                                                            `${((property.rent / property.price) * 100).toFixed(1)}%`,
                                                    },
                                                    {
                                                        key: 'status',
                                                        header: 'Status',
                                                        width: proportional(1),
                                                        renderCell: (property) => (
                                                            <Token
                                                                label={property.status}
                                                                color={statusColors[property.status]}
                                                                size="sm"
                                                            />
                                                        ),
                                                    },
                                                    {
                                                        key: 'review',
                                                        header: '',
                                                        width: pixel(80),
                                                        renderCell: (property) => (
                                                            <Button
                                                                label={`Review ${property.name}`}
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    // Open this record without changing the pipeline's current page.
                                                                    setSelectedId(property.id);
                                                                    setTab('review');
                                                                }}
                                                            >
                                                                Review
                                                            </Button>
                                                        ),
                                                    },
                                                ]}
                                            />
                                            <Stack direction="horizontal" justify="end">
                                                <Pagination
                                                    page={page}
                                                    onChange={setPage}
                                                    pageSize={pageSize}
                                                    totalItems={dashboard.properties.length}
                                                    size="sm"
                                                    variant="count"
                                                    label="Property pipeline pages"
                                                />
                                            </Stack>
                                        </Stack>
                                    )}
                                    {view === 'solution' && solutionId === 'screening' && tab === 'review' && (
                                        <Stack
                                            id="showcase-review"
                                            role="tabpanel"
                                            aria-label="Review"
                                            tabIndex={0}
                                            gap={4}
                                        >
                                            <Stack
                                                direction="horizontal"
                                                gap={3}
                                                justify="between"
                                                align="center"
                                                wrap="wrap"
                                            >
                                                <Stack gap={1}>
                                                    <Heading level={3}>{selected.name}</Heading>
                                                    <Text type="supporting">
                                                        {selected.city} · {currency.format(selected.price)}
                                                    </Text>
                                                </Stack>
                                                <Token
                                                    label={selected.status}
                                                    color={statusColors[selected.status]}
                                                    size="sm"
                                                />
                                            </Stack>
                                            <Table
                                                data={criteria}
                                                idKey="id"
                                                density="compact"
                                                columns={[
                                                    {
                                                        key: 'criterion',
                                                        header: 'Criterion',
                                                        width: proportional(2),
                                                        renderCell: (criterion) => (
                                                            <Stack gap={1}>
                                                                <Text>{criterion.criterion}</Text>
                                                                <Text type="supporting">{criterion.target}</Text>
                                                            </Stack>
                                                        ),
                                                    },
                                                    { key: 'actual', header: 'Actual', width: proportional(1) },
                                                    {
                                                        key: 'passes',
                                                        header: 'Result',
                                                        width: proportional(1),
                                                        renderCell: (criterion) => (
                                                            <Token
                                                                label={
                                                                    criterion.passes ? 'Meets target' : 'Needs review'
                                                                }
                                                                color={criterion.passes ? 'green' : 'orange'}
                                                                size="sm"
                                                            />
                                                        ),
                                                    },
                                                ]}
                                            />
                                            <Stack gap={2}>
                                                <Text as="p" color="secondary">
                                                    {selected.evidence}
                                                </Text>
                                                <Text type="supporting">
                                                    Annual gross rent: {currency.format(selected.rent)}. Yield excludes
                                                    costs and financing.
                                                </Text>
                                            </Stack>
                                            {selected.status === 'In review' && (
                                                <Stack direction="horizontal" gap={2} wrap="wrap">
                                                    <Button
                                                        label="Shortlist property"
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => recordDecision('Shortlisted')}
                                                    />
                                                    <Button
                                                        label="Pass on property"
                                                        size="sm"
                                                        onClick={() => recordDecision('Passed')}
                                                    />
                                                </Stack>
                                            )}
                                        </Stack>
                                    )}
                                    {view === 'solution' && solutionId === 'screening' && tab === 'activity' && (
                                        <Stack
                                            id="showcase-activity"
                                            role="tabpanel"
                                            aria-label="Activity"
                                            tabIndex={0}
                                            gap={3}
                                        >
                                            <Table
                                                data={dashboard.events}
                                                idKey="id"
                                                density="compact"
                                                columns={[
                                                    {
                                                        key: 'action',
                                                        header: 'Activity',
                                                        width: proportional(3),
                                                        renderCell: (event) => (
                                                            <Stack gap={1}>
                                                                <Text>{event.action}</Text>
                                                                <Text type="supporting">{event.actor}</Text>
                                                            </Stack>
                                                        ),
                                                    },
                                                    { key: 'time', header: 'Time', width: proportional(1) },
                                                ]}
                                            />
                                        </Stack>
                                    )}
                                </PageContainer>
                            </PlatformFrame>
                        </LayoutContent>
                    }
                />
                <Text type="supporting" role="status" className="sr-only">
                    {dashboard.events[0]?.action}
                </Text>
            </Section>
        </Section>
    );
}
