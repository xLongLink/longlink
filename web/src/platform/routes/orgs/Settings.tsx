import { z } from 'zod';
import { api } from '@/lib/api';
import Registries from './Registries';
import { OpenAI } from '@/components/OpenAI';
import { useApi } from '@/lib/hooks/use-api';
import CreateSolution from './CreateSolution';
import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, proportional } from '@astryxdesign/core/Table';
import { DeletionDialog } from '@/platform/components/Deletion';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useState, useTransition, type MouseEvent } from 'react';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useLocation, useNavigate, useOutletContext } from 'react-router';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Layout, LayoutPanel, LayoutHeader, LayoutContent } from '@astryxdesign/core/Layout';
import {
    ArrowRight,
    ArrowUp,
    Boxes,
    Building2,
    CheckCheck,
    EyeOff,
    Logs,
    Plug,
    RefreshCw,
    Trash,
    Users,
    Wrench,
} from 'lucide-react';

type Solution = z.output<typeof schemas.zOrganizationSolutionSummary>;

type Update = {
    // Remount drafts for every fresh check, including checks of the same revision.
    key: string;
    item: { id: string; name: string };
    candidate: z.output<typeof schemas.zSolutionUpdateCheck>;
};

type DeploymentReviewProps = {
    update: Update;
    invalidate: () => Promise<void>;
    onClose: () => void;
};

/** Abbreviates digest references for release comparison while preserving tag-only images. */
function imageDigest(image: string) {
    // Keep the first twelve digest characters without changing authoritative image values.
    return image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/)?.[1] ?? image;
}

/** Owns the deployment draft and submission for a freshly checked candidate. */
function DeploymentReview({ update, invalidate, onClose }: DeploymentReviewProps) {
    const [step, setStep] = useState<0 | 1>(0);
    const [envs, setEnvs] = useState<Record<string, { value?: string; removed?: boolean }>>({});

    // Preserve configured required secrets, and require values for new required environments.
    const missingRequired = (update.candidate.metadata.environments ?? []).some(
        (environment) =>
            environment.required &&
            (envs[environment.name]?.removed === true ||
                (!update.candidate.configured_envs.includes(environment.name) &&
                    !envs[environment.name]?.value?.trim()))
    );

    const hasChanges =
        update.candidate.metadata.image !== update.candidate.current_image ||
        Object.values(envs).some((environment) => environment.value !== undefined || environment.removed === true);

    /** Submits the reviewed deployment while preserving untouched secrets. */
    async function updateSolution() {
        if (step !== 1 || missingRequired || !hasChanges) return;

        // Send edited secrets and explicit removals, preserving omitted values.
        const patchEnvs: Record<string, string | null> = {};

        // Removal takes precedence without discarding the edit retained for untoggling.
        for (const [name, environment] of Object.entries(envs)) {
            if (environment.removed === true) patchEnvs[name] = null;
            else if (environment.value !== undefined) patchEnvs[name] = environment.value;
        }

        await api.post(`/api/v1/solutions/${update.item.id}/update`, {
            json: schemas.zSolutionPatch.parse({
                envs: patchEnvs,
                expected_revision_id: update.candidate.revision_id,
            }),
        });
        await invalidate();
        onClose();
    }

    // Keep update progress above the centered, scrollable form.
    return (
        <Dialog
            aria-label={`Update ${update.item.name}`}
            isOpen
            purpose="form"
            width={960}
            maxHeight="calc(100dvh - var(--spacing-10) * 4)"
            padding={0}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                <Layout
                    padding={0}
                    header={
                        <LayoutHeader hasDivider={false}>
                            <Stack paddingInline={8} paddingBlock={4}>
                                <Stepper
                                    activeStep={step}
                                    indicatorPosition="separated"
                                    label="Solution update"
                                    orientation="horizontal"
                                    density="balanced"
                                >
                                    <Step
                                        step={0}
                                        label="Image"
                                        status={step > 0 ? 'success' : undefined}
                                        indicator="auto"
                                    />
                                    <Step step={1} label="Environment" indicator="auto" />
                                </Stepper>
                            </Stack>
                        </LayoutHeader>
                    }
                    content={
                        <LayoutContent padding={8}>
                            <Stack
                                minHeight="100%"
                                justify="center"
                                gap={8}
                                width="100%"
                                maxWidth={640}
                                className="mx-auto"
                            >
                                <Stack gap={3} align="center">
                                    <RefreshCw className="size-20 text-secondary" aria-hidden="true" />
                                    <Heading level={2} justify="center">
                                        {step === 0 ? `Update ${update.item.name}` : 'Configure your environment'}
                                    </Heading>
                                </Stack>
                                {step === 0 && (
                                    <Stack gap={4}>
                                        <Stack direction="horizontal" gap={4} align="center">
                                            <StackItem size="fill">
                                                <Stack padding={3} className="rounded-lg bg-muted">
                                                    <Text
                                                        type="code"
                                                        color="secondary"
                                                        justify="center"
                                                        display="block"
                                                        className="break-all"
                                                    >
                                                        {update.candidate.current_version ||
                                                            imageDigest(update.candidate.current_image)}
                                                    </Text>
                                                </Stack>
                                            </StackItem>
                                            <ArrowRight className="size-5 shrink-0 text-secondary" aria-hidden="true" />
                                            <StackItem size="fill">
                                                <Stack padding={3} className="rounded-lg bg-muted">
                                                    <Text
                                                        type="code"
                                                        justify="center"
                                                        display="block"
                                                        className="break-all"
                                                    >
                                                        {update.candidate.metadata.version ||
                                                            imageDigest(update.candidate.metadata.image)}
                                                    </Text>
                                                </Stack>
                                            </StackItem>
                                        </Stack>
                                        <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                            <Button label="Cancel" variant="ghost" onClick={onClose} />
                                            <Button label="Next" variant="primary" onClick={() => setStep(1)} />
                                        </Stack>
                                    </Stack>
                                )}
                                {step === 1 && (
                                    <form action={updateSolution}>
                                        <Stack gap={4}>
                                            {!update.candidate.metadata.environments?.length && (
                                                <Text color="secondary">
                                                    This solution does not require environment variables.
                                                </Text>
                                            )}
                                            {(update.candidate.metadata.environments ?? []).map((environment) => {
                                                // Resolve the configured secret and its local draft without exposing its value.
                                                const configured = update.candidate.configured_envs.includes(
                                                    environment.name
                                                );

                                                const draft = envs[environment.name];
                                                const isRemoved = draft?.removed === true;

                                                // Configured secrets remain hidden; blank untouched inputs preserve them.
                                                return (
                                                    <Stack key={environment.name} gap={2}>
                                                        <TextInput
                                                            label={environment.name}
                                                            labelTooltip={environment.description ?? undefined}
                                                            type="password"
                                                            value={draft?.value ?? ''}
                                                            isDisabled={isRemoved}
                                                            isOptional={!environment.required}
                                                            isRequired={
                                                                environment.required && (!configured || isRemoved)
                                                            }
                                                            placeholder={
                                                                isRemoved
                                                                    ? 'Will be removed'
                                                                    : configured
                                                                      ? 'Configured: preserve existing value'
                                                                      : environment.description || 'Enter value'
                                                            }
                                                            onChange={(value) =>
                                                                setEnvs((current) => ({
                                                                    ...current,
                                                                    [environment.name]: {
                                                                        ...current[environment.name],
                                                                        value,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                        {configured && !environment.required && (
                                                            <CheckboxInput
                                                                label={`Remove ${environment.name}`}
                                                                value={isRemoved}
                                                                onChange={(removed) =>
                                                                    setEnvs((current) => ({
                                                                        ...current,
                                                                        [environment.name]: {
                                                                            ...current[environment.name],
                                                                            removed,
                                                                        },
                                                                    }))
                                                                }
                                                            />
                                                        )}
                                                    </Stack>
                                                );
                                            })}
                                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                                <Stack direction="horizontal" gap={2}>
                                                    <Button label="Cancel" variant="ghost" onClick={onClose} />
                                                    <Button label="Back" variant="ghost" onClick={() => setStep(0)} />
                                                </Stack>
                                                <Button
                                                    label="Update solution"
                                                    variant="primary"
                                                    type="submit"
                                                    isDisabled={missingRequired || !hasChanges}
                                                />
                                            </Stack>
                                        </Stack>
                                    </form>
                                )}
                            </Stack>
                        </LayoutContent>
                    }
                />
            </Stack>
        </Dialog>
    );
}

const organizationSections = [
    { id: 'general', label: 'General' },
    { id: 'usage', label: 'Usage' },
    { id: 'private-registries', label: 'Private registries' },
];

const peopleSections = [
    { id: 'members', label: 'Members' },
    { id: 'invitations', label: 'Invitations' },
];

/** Shares organization identity and permissions while sections own resource lifetimes. */
export default function OrganizationSettings() {
    const membership = useOutletContext<z.output<typeof schemas.zUserOrganizationMembership>>();
    const base = `/api/v1/organizations/${membership.organization.id}`;
    const location = useLocation();
    const navigate = useNavigate();

    // Unknown fragments select General; inactive sections never mount their queries or drafts.
    const section =
        [...organizationSections, ...peopleSections, { id: 'solutions', label: 'Solutions' }].find(
            (item) => `#${item.id}` === location.hash
        )?.id ?? 'general';

    // Share the layout-resolved identity and permissions without loading inactive sections.
    const canMaintain = ['maintain', 'admin', 'owner'].includes(membership.role);
    const canAdminister = ['admin', 'owner'].includes(membership.role);

    /** Preserves ordinary-click history pushes while leaving modified clicks to the native link. */
    function selectSection(event: MouseEvent, id: string) {
        // Leave prevented and modified activations to the native link.
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
        )
            return;

        // Push even when the selected fragment is already current, matching the existing Menu behavior.
        event.preventDefault();
        void navigate({ pathname: location.pathname, search: location.search, hash: `#${id}` });
    }

    return (
        <Stack gap={8}>
            <NoIndex title="Organization Settings | LongLink" />
            <Stack direction="horizontal" gap={3} align="center">
                <Avatar kind="organization" name={membership.organization.name} />
                <Stack gap={0}>
                    <Heading level={4} accessibilityLevel={1}>
                        {membership.organization.name}
                    </Heading>
                    <Text type="supporting">Organization</Text>
                </Stack>
            </Stack>
            <Layout
                height="auto"
                start={
                    <LayoutPanel
                        isScrollable={false}
                        label="Settings navigation"
                        padding={0}
                        role="navigation"
                        width={260}
                    >
                        <SideNav className="h-auto w-full pr-4 [&>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pl-0">
                            <SideNavSection title="Settings" isHeaderHidden className="pt-0">
                                <SideNavItem
                                    collapsible={{ defaultIsCollapsed: true }}
                                    icon={<Building2 className="size-4" aria-hidden="true" />}
                                    label="Organization"
                                >
                                    {organizationSections.map((item) => (
                                        <SideNavItem
                                            as="a"
                                            href={`${location.pathname}${location.search}#${item.id}`}
                                            isSelected={section === item.id}
                                            key={item.id}
                                            label={item.label}
                                            onClick={(event) => selectSection(event, item.id)}
                                        />
                                    ))}
                                </SideNavItem>
                                <SideNavItem
                                    collapsible={{ defaultIsCollapsed: true }}
                                    icon={<Users className="size-4" aria-hidden="true" />}
                                    label="People"
                                >
                                    {peopleSections.map((item) => (
                                        <SideNavItem
                                            as="a"
                                            href={`${location.pathname}${location.search}#${item.id}`}
                                            isSelected={section === item.id}
                                            key={item.id}
                                            label={item.label}
                                            onClick={(event) => selectSection(event, item.id)}
                                        />
                                    ))}
                                </SideNavItem>
                                <SideNavItem
                                    as="a"
                                    href={`${location.pathname}${location.search}#solutions`}
                                    icon={<Boxes className="size-4" aria-hidden="true" />}
                                    isSelected={section === 'solutions'}
                                    label="Solutions"
                                    onClick={(event) => selectSection(event, 'solutions')}
                                />
                            </SideNavSection>
                        </SideNav>
                    </LayoutPanel>
                }
            >
                <Stack gap={3}>
                    {section === 'usage' ? (
                        <ApiBoundary key="storage">
                            <StorageSection base={base} />
                        </ApiBoundary>
                    ) : section === 'private-registries' ? (
                        <ApiBoundary key="registries">
                            <Registries base={base} canMaintain={canMaintain} />
                        </ApiBoundary>
                    ) : section === 'members' ? (
                        <ApiBoundary key="members">
                            <MembersSection base={base} canAdminister={canAdminister} />
                        </ApiBoundary>
                    ) : section === 'invitations' ? (
                        <ApiBoundary key="invitations">
                            <InvitationsSection base={base} canMaintain={canMaintain} />
                        </ApiBoundary>
                    ) : section === 'solutions' ? (
                        <ApiBoundary key="solutions">
                            <SolutionsSection organization={membership.organization} canMaintain={canMaintain} />
                        </ApiBoundary>
                    ) : (
                        <ApiBoundary>
                            <GeneralSection
                                base={base}
                                name={membership.organization.name}
                                canDelete={membership.role === 'owner'}
                            />
                        </ApiBoundary>
                    )}
                </Stack>
            </Layout>
        </Stack>
    );
}

/** Shows owner-only organization deletion with explicit confirmation. */
function GeneralSection({ base, name, canDelete }: { base: string; name: string; canDelete: boolean }) {
    const [isConfirming, setIsConfirming] = useState(false);

    return (
        <Stack gap={4}>
            <Stack justify="end" minHeight="var(--size-element-md)">
                <Heading level={2} hasCapsize>
                    General
                </Heading>
            </Stack>
            <Divider />
            {canDelete && (
                <Stack gap={3}>
                    <Stack className="text-red-600 dark:text-red-400">
                        <Heading level={3} color="inherit">
                            Danger zone
                        </Heading>
                    </Stack>
                    <Stack
                        direction="horizontal"
                        justify="between"
                        align="center"
                        wrap="wrap"
                        gap={4}
                        padding={4}
                        className="rounded-lg border border-red-600 dark:border-red-400"
                    >
                        <Stack gap={0}>
                            <Text weight="bold">Delete this organization</Text>
                            <Text color="secondary">Once deleted, it will be gone forever. Please be certain.</Text>
                        </Stack>
                        <Button label="Delete" variant="destructive" onClick={() => setIsConfirming(true)} />
                    </Stack>
                </Stack>
            )}
            <DeletionDialog
                confirmation={
                    isConfirming
                        ? {
                              title: 'Delete organization',
                              description: `Delete ${name}? Once deleted, it will be gone forever. Please be certain.`,
                              onDelete: async () => {
                                  // Leave the deleted organization only after the server accepts deletion.
                                  await api.delete(base);
                                  window.location.assign('/user/organizations');
                              },
                          }
                        : null
                }
                onClose={() => setIsConfirming(false)}
            />
        </Stack>
    );
}

/** Owns role-change confirmation only while the members section is active. */
function MembersSection({ base, canAdminister }: { base: string; canAdminister: boolean }) {
    const [member, setMember] = useState<{
        id: string;
        name: string;
        role: string;
    } | null>(null);

    // Load and invalidate People data only while the members section is active.
    const [{ members }, invalidateDetails] = useApi(base, schemas.zOrganizationDetails);

    return (
        <>
            <Stack gap={4}>
                <Stack justify="end" minHeight="var(--size-element-md)">
                    <Heading level={2} hasCapsize>
                        Members
                    </Heading>
                </Stack>
                <Divider />
                <Table
                    data={members}
                    idKey={(row) => row.user.id}
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'user',
                            header: 'User',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Avatar name={row.user.name} src={row.user.avatar} seed={row.user.id} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Text>{row.user.name}</Text>
                                            <Badge label={row.role} />
                                        </Stack>
                                        <Text type="supporting">{row.user.email}</Text>
                                    </Stack>
                                </Stack>
                            ),
                        },
                        ...(canAdminister
                            ? [
                                  {
                                      key: 'role',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: z.output<typeof schemas.zOrganizationMemberAccessResponse>) => (
                                          <MoreMenu
                                              alignment="end"
                                              items={['read', 'write', 'maintain', 'admin'].flatMap((role) =>
                                                  role === row.role
                                                      ? []
                                                      : [
                                                            {
                                                                id: role,
                                                                label: `Set as ${role[0].toUpperCase() + role.slice(1)}`,
                                                                onClick: () =>
                                                                    setMember({
                                                                        id: row.user.id,
                                                                        name: row.user.name,
                                                                        role,
                                                                    }),
                                                            },
                                                        ]
                                              )}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            </Stack>
            {member && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open) setMember(null);
                    }}
                >
                    <DialogHeader title="Change role" onOpenChange={() => setMember(null)} />
                    <Stack gap={3}>
                        <Text color="secondary">
                            Change {member.name} to {member.role}?
                        </Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button label="Cancel" variant="ghost" onClick={() => setMember(null)} />
                            <Button
                                label="Confirm"
                                variant="primary"
                                clickAction={async () => {
                                    // Update access on the server before refreshing the member list.
                                    await api.patch(`${base}/members/${member.id}`, {
                                        json: schemas.zOrganizationMemberUpdate.parse({
                                            role: member.role,
                                        }),
                                    });
                                    await invalidateDetails();
                                    setMember(null);
                                }}
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </>
    );
}

/** Owns invitation drafts and actions only while their section is active. */
function InvitationsSection({ base, canMaintain }: { base: string; canMaintain: boolean }) {
    const [invitation, setInvitation] = useState({ email: '', role: 'write' });
    const [inviting, setInviting] = useState(false);

    // Load and invalidate People data only while the invitations section is active.
    const [{ invitations }, invalidateDetails] = useApi(base, schemas.zOrganizationDetails);

    /** Sends the validated invitation and refreshes organization access. */
    async function inviteMember() {
        if (!invitation.email.trim()) return;

        // Refresh organization access only after sending the invitation succeeds.
        await api.post(`${base}/invitations`, {
            json: schemas.zOrganizationInvitationCreate.parse({
                ...invitation,
                email: invitation.email.trim(),
            }),
        });
        await invalidateDetails();
        setInviting(false);
    }

    return (
        <>
            <Stack gap={4}>
                <Stack
                    direction="horizontal"
                    justify="between"
                    align="end"
                    wrap="wrap"
                    minHeight="var(--size-element-md)"
                >
                    <Heading level={2} hasCapsize>
                        Invitations
                    </Heading>
                    {canMaintain && <Button label="Invite" onClick={() => setInviting(true)} />}
                </Stack>
                <Divider />
                <Table
                    data={invitations}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        { key: 'email', header: 'Email', width: proportional(1) },
                        {
                            key: 'role',
                            header: 'Role',
                            width: proportional(1),
                            renderCell: (row) => <Badge label={row.role} />,
                        },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: z.output<typeof schemas.zOrganizationInvitationResponse>) => (
                                          <Button
                                              label="Revoke"
                                              variant="destructive"
                                              clickAction={async () => {
                                                  // Refresh organization access only after revocation succeeds.
                                                  await api.delete(`${base}/invitations/${row.id}`);
                                                  await invalidateDetails();
                                              }}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            </Stack>
            {/* Match organization creation with a centered form and a desktop-only illustration. */}
            <Dialog
                aria-label="Invite user"
                isOpen={inviting}
                purpose="info"
                onOpenChange={setInviting}
                width={960}
                maxHeight="calc(100dvh - var(--spacing-10) * 4)"
                padding={0}
            >
                <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                    <Layout
                        padding={0}
                        end={
                            <LayoutPanel width="50%" padding={0} className="hidden bg-muted md:flex">
                                <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                                    <img
                                        src="/images/invitation.png"
                                        alt="Hand-drawn envelopes."
                                        className="h-full w-full object-contain"
                                        width={1223}
                                        height={1286}
                                        decoding="async"
                                    />
                                </Stack>
                            </LayoutPanel>
                        }
                        content={
                            <LayoutContent padding={8}>
                                <Stack
                                    height="100%"
                                    justify="center"
                                    width="max-content"
                                    maxWidth="100%"
                                    className="mx-auto"
                                >
                                    <form action={inviteMember}>
                                        <Stack gap={10}>
                                            <Stack gap={2} align="center">
                                                <img
                                                    src="/images/organization.png"
                                                    alt=""
                                                    className="size-20 object-contain"
                                                    width={1254}
                                                    height={1254}
                                                    decoding="async"
                                                />
                                                <Stack gap={0}>
                                                    <Heading level={2} justify="center">
                                                        Invite user
                                                    </Heading>
                                                    <Text as="p" color="secondary" justify="center">
                                                        Send an invitation to join this organization.
                                                    </Text>
                                                </Stack>
                                            </Stack>
                                            {/* Let the subtitle size the column, then stretch the controls to match. */}
                                            <Stack gap={4} width={0} className="min-w-full">
                                                <TextInput
                                                    label="Email"
                                                    type="email"
                                                    value={invitation.email}
                                                    placeholder="user@example.com"
                                                    isRequired
                                                    onChange={(email) => setInvitation({ ...invitation, email })}
                                                    width="100%"
                                                />
                                                <Selector
                                                    label="Role"
                                                    value={invitation.role}
                                                    options={[
                                                        { value: 'read', label: 'read', icon: EyeOff },
                                                        { value: 'write', label: 'write', icon: ArrowUp },
                                                        { value: 'maintain', label: 'maintain', icon: Wrench },
                                                        { value: 'admin', label: 'admin', icon: CheckCheck },
                                                    ]}
                                                    onChange={(role) => setInvitation({ ...invitation, role })}
                                                    width="100%"
                                                />
                                                <Button
                                                    label="Invite"
                                                    variant="primary"
                                                    type="submit"
                                                    width="100%"
                                                    isDisabled={!invitation.email.trim()}
                                                />
                                            </Stack>
                                        </Stack>
                                    </form>
                                </Stack>
                            </LayoutContent>
                        }
                    />
                </Stack>
            </Dialog>
        </>
    );
}

/** Loads storage usage only while the organization section is active. */
function StorageSection({ base }: { base: string }) {
    const [storage] = useApi(`${base}/storage`, schemas.zOrganizationStorageUsageResponse);

    return (
        <Stack gap={4}>
            <Stack justify="end" minHeight="var(--size-element-md)">
                <Heading level={2} hasCapsize>
                    Usage
                </Heading>
            </Stack>
            <Divider />
            <ProgressBar label="Storage" value={storage.space_used} max={storage.quota_bytes} />
        </Stack>
    );
}

/** Owns solution reads and dialogs for the lifetime of the active section. */
function SolutionsSection({
    organization,
    canMaintain,
}: {
    organization: z.output<typeof schemas.zUserOrganizationMembership>['organization'];
    canMaintain: boolean;
}) {
    const [creating, setCreating] = useState(false);
    const [update, setUpdate] = useState<Update | null>(null);
    const [deletion, setDeletion] = useState<{ id: string; name: string } | null>(null);
    const [logs, setLogs] = useState<string | null>(null);
    const [mcp, setMcp] = useState<{ id: string; name: string } | null>(null);
    const [, startAction] = useTransition();
    const base = `/api/v1/organizations/${organization.id}`;

    // Keep solution refreshes scoped to the section's resource.
    const [solutions, invalidateSolutions] = useApi(`${base}/solutions`, schemas.zOrganizationSolutionSummary.array());

    return (
        <>
            <Stack gap={4}>
                <Stack
                    direction="horizontal"
                    justify="between"
                    align="end"
                    wrap="wrap"
                    minHeight="var(--size-element-md)"
                >
                    <Heading level={2} hasCapsize>
                        Solutions
                    </Heading>
                    {canMaintain && <Button label="New Solution" onClick={() => setCreating(true)} />}
                </Stack>
                <Divider />
                <Table
                    data={solutions}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Solution',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack>
                                    <Link href={`/orgs/${organization.slug}/solutions/${row.slug}`}>{row.name}</Link>
                                    {row.description && <Text type="supporting">{row.description}</Text>}
                                </Stack>
                            ),
                        },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: Solution) => (
                                          <MoreMenu
                                              alignment="end"
                                              size="sm"
                                              items={[
                                                  ...(row.desired_revision_id &&
                                                  !row.deployment_pending &&
                                                  row.status !== 'creating'
                                                      ? [
                                                            {
                                                                id: 'update',
                                                                label: 'Update',
                                                                icon: (
                                                                    <RefreshCw className="size-4" aria-hidden="true" />
                                                                ),
                                                                onClick: () => {
                                                                    // Forward async menu failures to the surrounding boundary without tracking pending state.
                                                                    startAction(async () => {
                                                                        // Fetch a fresh candidate for each review; never reuse a stale revision fence.
                                                                        const checked = await api(
                                                                            `/api/v1/solutions/${row.id}/update`
                                                                        ).json(schemas.zSolutionUpdateCheck);

                                                                        setUpdate({
                                                                            key: crypto.randomUUID(),
                                                                            item: {
                                                                                id: row.id,
                                                                                name: row.name,
                                                                            },
                                                                            candidate: checked,
                                                                        });
                                                                    });
                                                                },
                                                            },
                                                        ]
                                                      : []),
                                                  {
                                                      id: 'logs',
                                                      label: 'Logs',
                                                      icon: <Logs className="size-4" aria-hidden="true" />,
                                                      onClick: () => setLogs(row.id),
                                                  },
                                                  {
                                                      id: 'mcp',
                                                      label: 'MCP',
                                                      icon: <Plug className="size-4" aria-hidden="true" />,
                                                      onClick: () => setMcp({ id: row.id, name: row.name }),
                                                  },
                                                  {
                                                      id: 'delete',
                                                      label: 'Delete',
                                                      icon: <Trash className="size-4" aria-hidden="true" />,
                                                      onClick: () =>
                                                          setDeletion({
                                                              id: row.id,
                                                              name: row.name,
                                                          }),
                                                  },
                                              ]}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            </Stack>
            {creating && (
                <CreateSolution
                    organizationId={organization.id}
                    invalidate={invalidateSolutions}
                    onClose={() => setCreating(false)}
                />
            )}
            {update && (
                <DeploymentReview
                    key={update.key}
                    update={update}
                    invalidate={invalidateSolutions}
                    onClose={() => setUpdate(null)}
                />
            )}
            {logs && (
                <Dialog
                    aria-label="Pod logs"
                    isOpen
                    purpose="info"
                    width={960}
                    maxHeight="calc(100dvh - var(--spacing-10) * 4)"
                    padding={0}
                    onOpenChange={(open) => {
                        if (!open) setLogs(null);
                    }}
                >
                    <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))" paddingInline={8} paddingBlock={4}>
                        <ApiBoundary key={logs}>
                            <SolutionLogs solutionId={logs} onClose={() => setLogs(null)} />
                        </ApiBoundary>
                    </Stack>
                </Dialog>
            )}
            {/* Offer direct MCP connection details and the selected Solution's credential-free package. */}
            {mcp && (
                <Dialog
                    aria-label="Model Context Protocol"
                    isOpen
                    purpose="info"
                    width={960}
                    maxHeight="calc(100dvh - var(--spacing-10) * 4)"
                    padding={0}
                    onOpenChange={(open) => {
                        if (!open) setMcp(null);
                    }}
                >
                    <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                        <Layout
                            padding={0}
                            end={
                                <LayoutPanel width="50%" padding={0} className="hidden bg-muted md:flex">
                                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                                        <img
                                            src="/images/mcp.png"
                                            alt="Hand-drawn globe surrounded by orbiting spheres."
                                            className="h-full w-full object-contain"
                                            width={941}
                                            height={1672}
                                            decoding="async"
                                        />
                                    </Stack>
                                </LayoutPanel>
                            }
                            content={
                                <LayoutContent padding={8} isScrollable>
                                    <Stack
                                        minHeight="100%"
                                        justify="center"
                                        width="max-content"
                                        maxWidth="100%"
                                        gap={6}
                                        className="mx-auto"
                                    >
                                        <Stack gap={2} align="center">
                                            <Plug className="size-20 text-secondary" aria-hidden="true" />
                                            <Stack gap={0}>
                                                <Heading level={2} justify="center">
                                                    Model Context Protocol
                                                </Heading>
                                                <Text as="p" color="secondary" justify="center">
                                                    Connect your solution to AI tools
                                                </Text>
                                            </Stack>
                                        </Stack>
                                        {/* Match the creation dialog's content-sized column and control width. */}
                                        <Stack gap={4} width={0} className="min-w-full">
                                            <ApiBoundary key={mcp.id}>
                                                <SolutionMcpUrl solutionId={mcp.id} onClose={() => setMcp(null)} />
                                            </ApiBoundary>
                                            <Button
                                                as="a"
                                                href={`/api/v1/solutions/${mcp.id}/plugin`}
                                                label="Download plugin ZIP"
                                                variant="primary"
                                                width="100%"
                                                icon={
                                                    <OpenAI
                                                        className="size-5 scale-125"
                                                        aria-hidden="true"
                                                        focusable="false"
                                                    />
                                                }
                                            />
                                        </Stack>
                                    </Stack>
                                </LayoutContent>
                            }
                        />
                    </Stack>
                </Dialog>
            )}
            <DeletionDialog
                confirmation={
                    deletion
                        ? {
                              title: 'Delete solution',
                              description: `Delete solution ${deletion.name}?`,
                              onDelete: async () => {
                                  // Refresh Solutions only after the delete request succeeds.
                                  await api.delete(`/api/v1/solutions/${deletion.id}`);
                                  await invalidateSolutions();
                                  setDeletion(null);
                              },
                          }
                        : null
                }
                onClose={() => setDeletion(null)}
            />
        </>
    );
}

/** Reads the canonical public connection URL without guessing the deployment's origin. */
function SolutionMcpUrl({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const showToast = useToast();

    // Reuse OAuth discovery so the copied URL matches the plugin's configured public address.
    const [{ resource }] = useApi(
        `/.well-known/oauth-protected-resource/api/v1/solutions/${solutionId}/proxy/mcp`,
        schemas.zResourceMetadata
    );

    return (
        <Button
            label="Copy MCP server URL"
            width="100%"
            clickAction={async () => {
                // Copy only the canonical connection URL, without credentials.
                await navigator.clipboard.writeText(resource);

                // Confirm a successful copy and dismiss the MCP dialog.
                showToast({ body: 'Copied' });
                onClose();
            }}
        />
    );
}

/** Loads pod logs only while their dialog is open. */
function SolutionLogs({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const [logs, invalidate] = useApi(`/api/v1/solutions/${solutionId}/logs`, z.array(z.string()));

    // Keep log scrolling inside CodeBlock while dismissal and refresh remain visible.
    return (
        <Stack gap={3} height="100%">
            <StackItem size="fill">
                <CodeBlock
                    code={logs.join('\n')}
                    hasLineNumbers
                    isWrapped
                    size="sm"
                    width="100%"
                    maxHeight="100%"
                    className="h-full"
                />
            </StackItem>
            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                <Button label="Close" variant="ghost" onClick={onClose} />
                <Button
                    label="Refresh logs"
                    variant="secondary"
                    icon={<RefreshCw className="size-4" aria-hidden="true" />}
                    clickAction={invalidate}
                />
            </Stack>
        </Stack>
    );
}
