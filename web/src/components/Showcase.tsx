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
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { PageContainer } from '@/components/PageContainer';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { PlatformFrame } from '@/components/layouts/Platform';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Archive, BriefcaseBusiness, Circle, FileText, FolderKanban, Layers } from 'lucide-react';

type OrganizationRecord = {
    id: string;
    name: string;
    kind: 'Project' | 'Proposal';
    stage: string;
    archived: boolean;
    description: string;
    roadmapStep: number;
};

// Group illustrative workflows while keeping demo navigation separate from sample-only entries.
const organizationTabs: {
    id: string;
    label: string;
    icon: typeof BriefcaseBusiness;
    solutions: (Pick<OrganizationRecord, 'id' | 'name' | 'description'> | OrganizationRecord)[];
}[] = [
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
                kind: 'Project',
                stage: 'Design development',
                roadmapStep: 1,
                archived: false,
            },
            {
                id: 'milan',
                name: '217 Milan',
                description: 'Renovation of a historic commercial building.',
                kind: 'Project',
                stage: 'Technical coordination',
                roadmapStep: 1,
                archived: false,
            },
            {
                id: 'geneva',
                name: '326 Geneva',
                description: 'Modern office headquarters overlooking Lake Geneva.',
                kind: 'Project',
                stage: 'Concept design',
                roadmapStep: 1,
                archived: false,
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
                kind: 'Proposal',
                stage: 'Preparing submission',
                roadmapStep: 2,
                archived: false,
            },
            {
                id: 'copenhagen',
                name: '819 Copenhagen',
                description: 'Architectural competition for a cultural center.',
                kind: 'Proposal',
                stage: 'Competition design',
                roadmapStep: 1,
                archived: false,
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
                kind: 'Project',
                stage: 'Completed',
                roadmapStep: 3,
                archived: true,
            },
            {
                id: 'paris',
                name: '086 Paris',
                description: 'Luxury apartment refurbishment and interior redesign.',
                kind: 'Project',
                stage: 'Completed',
                roadmapStep: 3,
                archived: true,
            },
            {
                id: 'london',
                name: '109 London',
                description: 'Completed mixed-use commercial development.',
                kind: 'Project',
                stage: 'Completed',
                roadmapStep: 3,
                archived: true,
            },
            {
                id: 'vienna',
                name: '128 Vienna',
                description: 'Restoration and conversion of a historic boutique hotel.',
                kind: 'Project',
                stage: 'Completed',
                roadmapStep: 3,
                archived: true,
            },
            {
                id: 'rotterdam',
                name: '603 Rotterdam',
                description: 'Proposal for a waterfront community pavilion.',
                kind: 'Proposal',
                stage: 'Not selected',
                roadmapStep: 3,
                archived: true,
            },
            {
                id: 'oslo',
                name: '714 Oslo',
                description: 'Competition proposal for a neighborhood library.',
                kind: 'Proposal',
                stage: 'Withdrawn',
                roadmapStep: 3,
                archived: true,
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

/** Offers local-only organization workflows with persistent sample interactions. */
export function Showcase() {
    // Retain navigation and local attachments across the organization previews.
    const [view, setView] = useState<'organization' | 'solution' | 'record'>('organization');
    const [recordId, setRecordId] = useState('zurich');
    const [uploads, setUploads] = useState<Record<string, File | File[] | null>>({});
    const [solutionId, setSolutionId] = useState<'materials' | 'suppliers' | 'documents'>('materials');
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [organizationTab, setOrganizationTab] = useState('office');

    // Retain the organization category independently of the selected preview.
    const category = organizationTabs.find((item) => item.id === organizationTab) ?? organizationTabs[1];

    // Resolve the active Office solution without changing the selected document.
    const activeSolution = organizationTabs.flatMap((item) => item.solutions).find((item) => item.id === solutionId);

    if (!activeSolution) return null;

    // Resolve an optional technical document preview without changing the library selection.
    const activeDocument = documents.find((item) => item.id === documentId);

    // Resolve the selected project or proposal directly from its organization row.
    const activeRecord = organizationTabs
        .flatMap((item) => item.solutions)
        .find((item): item is OrganizationRecord => item.id === recordId && 'kind' in item);

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
                                                {view === 'record' ? activeRecord?.name : activeSolution.name}
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
                                                // Keep organization navigation icons decorative and consistently sized.
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
                                                                solution.id === 'materials' ||
                                                                solution.id === 'suppliers' ||
                                                                solution.id === 'documents'
                                                                    ? solution.id
                                                                    : undefined;

                                                            // Project and proposal rows open the same detail layout, including archived entries.
                                                            const record = 'kind' in solution ? solution : undefined;

                                                            return (
                                                                <Stack gap={0}>
                                                                    {demoSolutionId || record ? (
                                                                        <Link
                                                                            isStandalone
                                                                            size="base"
                                                                            href={
                                                                                record
                                                                                    ? '#showcase-record'
                                                                                    : `#showcase-${demoSolutionId}`
                                                                            }
                                                                            onClick={(event) => {
                                                                                // Open the chosen preview without resetting its retained state.
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
                                    {view === 'record' && activeRecord && (
                                        <Stack
                                            id="showcase-record"
                                            role="tabpanel"
                                            aria-label={activeRecord.kind}
                                            tabIndex={0}
                                            gap={3}
                                        >
                                            <Stack gap={1} align="start">
                                                <Heading level={2}>{activeRecord.name}</Heading>
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
                                </PageContainer>
                            </PlatformFrame>
                        </LayoutContent>
                    }
                />
                <Text type="supporting" role="status" className="sr-only">
                    Shortlisted Garden residences for due diligence.
                </Text>
            </Section>
        </Section>
    );
}
