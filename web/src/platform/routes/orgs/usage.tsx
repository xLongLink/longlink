import { z } from 'zod';
import { useId, useState } from 'react';
import type { FocusEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { ExternalLink } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/components/longlink/action/link';
import { Text } from '@/components/longlink/display/text';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import { Progress } from '@/components/longlink/display/progress';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Card, CardHeader, CardContent } from '@/components/shadcn/card';
import { Field, FieldError, FieldLabel, FieldDescription } from '@/components/shadcn/field';

const resources = [
    { key: 'cpu', label: 'CPU', unit: 'vCPU', units: 4, scale: 1000 },
    { key: 'ram', label: 'RAM', unit: 'MiB', units: 1 / 64, scale: 1024 ** 2 },
    { key: 'storage', label: 'Storage', unit: 'GiB', units: 1, scale: 1024 ** 3 }
] as const;

const sections = {
    compute: {
        title: 'Compute',
        fields: { cpu: 'compute_cpu_millicores', ram: 'compute_ram_bytes' },
        color: 'bg-blue-500/10',
        image: '/images/capacity.png'
    },
    database: {
        title: 'Database',
        fields: { cpu: 'database_cpu_millicores', ram: 'database_ram_bytes', storage: 'database_storage_bytes' },
        color: 'bg-violet-500/10',
        image: '/images/capacity.png'
    },
    storage: {
        title: 'Storage',
        fields: { storage: 'storage_bytes' },
        color: 'bg-emerald-500/10',
        image: '/images/capacity.png'
    }
} as const;

const capacitySchema = z.object({
    cpu: z.number({ error: 'Enter a valid CPU amount.' }),
    ram: z.number({ error: 'Enter a valid RAM amount.' }),
    storage: z.number({ error: 'Enter a valid storage amount.' })
});

type Capacity = z.output<typeof capacitySchema>;
type OrganizationUsage = z.output<typeof schemas.zOrganizationUsage>;
type CapacitySection = keyof typeof sections;
type CapacityField = keyof z.output<typeof schemas.zOrganizationUsageUpdate>;

const capacityFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function capacityMinimum(field: CapacityField, units: number, scale: number) {
    const schema = schemas.zOrganizationUsageUpdate.shape[field];
    return Math.max(1, Math.ceil((schema.minValue ?? 0) / (scale / units))) / units;
}

/** Shows independently purchased compute, database, and file capacity. */
export default function Usage({ base, canManage }: { base: string; canManage: boolean }) {
    const [usage, invalidate] = useApi(`${base}/usage`, schemas.zOrganizationUsage, {
        refetchInterval: (query) => (query.state.data?.status === 'creating' ? 5000 : false)
    });
    return (
        <Stack gap={4}>
            <Stack gap={0} justify="end" className="min-h-8">
                <Heading level={2} trim>
                    Usage
                </Heading>
            </Stack>
            <Separator />
            <CapacityCards base={base} usage={usage} canManage={canManage} onSaved={invalidate} />
        </Stack>
    );
}

/** Edits one pool while preserving the exact capacities of the other pools. */
function CapacityCards({
    base,
    usage,
    canManage,
    onSaved
}: {
    base: string;
    usage: OrganizationUsage;
    canManage: boolean;
    onSaved: () => Promise<void>;
}) {
    const formId = useId();
    const [editor, setEditor] = useState<CapacitySection | null>(null);
    const editing = canManage && (editor === 'database' || usage.has_payment_method) ? editor : null;
    const fields: Partial<Record<keyof Capacity, CapacityField>> = editing ? sections[editing].fields : {};
    const form = useForm({
        resolver: zodResolver(
            capacitySchema.superRefine((values, context) => {
                for (const { key, label, unit, units, scale } of resources) {
                    const field = fields[key];
                    if (!field) continue;
                    const schema = schemas.zOrganizationUsageUpdate.shape[field];
                    const minimum = capacityMinimum(field, units, scale);
                    const value = values[key];
                    if (value < minimum) {
                        context.addIssue({ code: 'custom', path: [key], message: `Minimum ${minimum} ${unit}.` });
                    } else if (!Number.isSafeInteger(value * units)) {
                        context.addIssue({
                            code: 'custom',
                            path: [key],
                            message: `Enter ${label} in increments of ${1 / units} ${unit}.`
                        });
                    } else if (!schema.safeParse(value * units * (scale / units)).success) {
                        context.addIssue({ code: 'custom', path: [key], message: `Enter a smaller ${label} amount.` });
                    }
                }
            })
        ),
        defaultValues: { cpu: 0, ram: 0, storage: 0 }
    });
    const submit = useSubmit(
        async (capacity: Capacity) => {
            if (!editing) return;
            const allocation = {
                compute_cpu_millicores: usage.compute_cpu_millicores,
                compute_ram_bytes: usage.compute_ram_bytes,
                storage_bytes: usage.storage_bytes,
                database_cpu_millicores: usage.database_cpu_millicores,
                database_ram_bytes: usage.database_ram_bytes,
                database_storage_bytes: usage.database_storage_bytes
            };
            for (const { key, units, scale } of resources) {
                const field = fields[key];
                if (field) allocation[field] = capacity[key] * units * (scale / units);
            }
            const json = schemas.zOrganizationUsageUpdate.parse(allocation);
            await api.patch(`${base}/usage`, { json }).json(schemas.zOrganizationUsage);
            await onSaved();
            setEditor(null);
        },
        {
            onError: (error) =>
                form.setError('root', {
                    message: error instanceof ApiError ? error.message : 'Could not save capacity. Please try again.'
                })
        }
    );

    return (
        <Stack gap={4}>
            {(['compute', 'database', 'storage'] as const).map((section) => {
                const { title, color } = sections[section];
                const cardFields: Partial<Record<keyof Capacity, CapacityField>> = sections[section].fields;
                return (
                    <Card key={section} className="pt-0">
                        <CardHeader
                            className={`flex flex-col items-stretch gap-2 border-b py-2 [.border-b]:pb-2 sm:flex-row sm:items-center sm:justify-between ${color}`}
                        >
                            <Heading level={3} size={4}>
                                {title}
                            </Heading>
                            <div className="flex flex-wrap justify-end gap-2 sm:ml-auto">
                                {section === 'compute' && (
                                    <Link variant="outline" size="sm" href="/pricing/" target="_blank">
                                        See prices
                                        <ExternalLink className="size-4" aria-hidden="true" />
                                    </Link>
                                )}
                                {canManage && section !== 'database' && !usage.has_payment_method && (
                                    <Link href="#payment-methods" variant="primary" size="sm">
                                        Add Card
                                    </Link>
                                )}
                                {canManage && (section === 'database' || usage.has_payment_method) && (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        disabled={usage.status === 'creating'}
                                        onClick={() => {
                                            const draft = { cpu: 0, ram: 0, storage: 0 };
                                            for (const { key, scale, units } of resources) {
                                                const field = cardFields[key];
                                                if (!field) continue;
                                                const minimum = capacityMinimum(field, units, scale);
                                                draft[key] = Math.max(
                                                    minimum,
                                                    Math.ceil(usage[field] / (scale / units)) / units
                                                );
                                            }
                                            form.reset(draft);
                                            setEditor(section);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {section === 'compute' && (
                                <Progress
                                    value={usage.solutions}
                                    max={usage.max_solutions}
                                    label="Solutions"
                                    showValue
                                    valueText={`${usage.solutions} / ${usage.max_solutions}`}
                                />
                            )}
                            {resources.map(({ key, label, scale, unit }) => {
                                const field = cardFields[key];
                                if (!field || key === 'storage') return null;
                                return (
                                    <Progress
                                        key={key}
                                        label={label}
                                        value={0}
                                        max={usage[field]}
                                        valueText={`- / ${capacityFormatter.format(usage[field] / scale)} ${unit}`}
                                    />
                                );
                            })}
                            {section !== 'compute' && (
                                <ApiBoundary
                                    fallback={
                                        <Text as="p" size="sm" tone="muted">
                                            Loading {title.toLowerCase()} usage…
                                        </Text>
                                    }
                                    fallbackRender={({ resetErrorBoundary }) => (
                                        <Stack direction="horizontal" gap={3} align="center" wrap="wrap">
                                            <Text size="sm" tone="muted">
                                                {title} usage unavailable.
                                            </Text>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={resetErrorBoundary}
                                            >
                                                Retry {title.toLowerCase()} usage
                                            </Button>
                                        </Stack>
                                    )}
                                >
                                    <StorageUsage base={base} section={section} />
                                </ApiBoundary>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
            {usage.status === 'creating' && (
                <Text as="p" role="status">
                    Applying capacity changes…
                </Text>
            )}
            {usage.status === 'failed' && (
                <Text as="p" role="alert">
                    Capacity update failed.
                </Text>
            )}
            {editing && (
                <Dialog
                    open
                    showHeader={false}
                    bodyPadding={false}
                    dismissible={!form.formState.isSubmitting}
                    title={`Edit ${sections[editing].title.toLowerCase()} capacity`}
                    onOpenChange={(open) => {
                        if (!open) setEditor(null);
                    }}
                >
                    <form
                        id={formId}
                        onSubmit={form.handleSubmit(submit)}
                        noValidate
                        aria-busy={form.formState.isSubmitting}
                        className="grid min-h-full grid-cols-1 items-center sm:grid-cols-2"
                    >
                        <fieldset
                            disabled={form.formState.isSubmitting}
                            className="flex min-w-0 flex-col gap-4 border-0 p-6"
                            aria-label={`${sections[editing].title} capacity`}
                        >
                            <Heading level={2} size={4}>
                                Edit {sections[editing].title.toLowerCase()} capacity
                            </Heading>
                            {resources.map(({ key, label, unit, units, scale }) => {
                                const field = fields[key];
                                if (!field) return null;
                                const minimum = capacityMinimum(field, units, scale);
                                const name = `${editing}_${key}`;
                                return (
                                    <Field key={name} data-invalid={Boolean(form.formState.errors[key])}>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <FieldLabel htmlFor={`capacity-${name}`}>
                                                {label} ({unit})
                                            </FieldLabel>
                                            <FieldDescription>
                                                Minimum {minimum} {unit}
                                            </FieldDescription>
                                        </div>
                                        <Input
                                            {...form.register(key, {
                                                valueAsNumber: true,
                                                onBlur: (event: FocusEvent<HTMLInputElement>) => {
                                                    const value = event.target.valueAsNumber;
                                                    if (!Number.isFinite(value)) return;
                                                    const next = Math.max(minimum, Math.ceil(value * units) / units);
                                                    form.setValue(key, next, {
                                                        shouldValidate: true,
                                                        shouldDirty: true
                                                    });
                                                }
                                            })}
                                            id={`capacity-${name}`}
                                            type="number"
                                            min={minimum}
                                            step={1 / units}
                                            aria-invalid={Boolean(form.formState.errors[key])}
                                        />
                                        <FieldError errors={[form.formState.errors[key]]} />
                                    </Field>
                                );
                            })}
                            <FieldError errors={[form.formState.errors.root]} />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Link disabled={form.formState.isSubmitting} onClick={() => setEditor(null)}>
                                    Cancel
                                </Link>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    Save capacity
                                </Button>
                            </div>
                        </fieldset>
                        <div className="flex items-center justify-center p-6">
                            <img
                                src={sections[editing].image}
                                alt=""
                                decoding="async"
                                className="w-full max-w-72 object-contain invert dark:invert-0"
                            />
                        </div>
                    </form>
                </Dialog>
            )}
        </Stack>
    );
}

/** Keeps each pool's live byte measurements independent of capacity editing. */
function StorageUsage({ base, section }: { base: string; section: 'database' | 'storage' }) {
    const [usage] = useApi(`${base}/${section}`, schemas.zOrganizationByteUsage);
    return (
        <Progress
            value={usage.space_used}
            max={usage.quota_bytes}
            label={section === 'database' ? 'Disk' : 'Files'}
            showValue
            valueText={`${(usage.space_used / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 3 })} / ${capacityFormatter.format(usage.quota_bytes / 1024 ** 3)} GiB`}
        />
    );
}
