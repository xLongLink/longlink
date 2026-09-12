import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { RegistryDialog, useRegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1).max(128),
    kubeconfig: z.string().trim().min(1),
    gateway_url: z
        .url({ protocol: /^https$/ })
        .max(512)
        .refine((value) => {
            const url = URL.parse(value);
            return (
                url !== null &&
                url.username === '' &&
                url.password === '' &&
                url.pathname === '/' &&
                url.search === '' &&
                url.hash === ''
            );
        }, 'Enter an HTTPS origin without credentials, path, query, or fragment'),
    gateway_certificate: z.string().max(65536).nullable(),
    database_storage_class: z
        .string()
        .min(1)
        .max(253)
        .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/)
        .refine(
            (value) => value.split('.').every((label) => label.length <= 63),
            'DNS labels must not exceed 63 characters'
        ),
    database_size_gib: z.number().int().min(1).max(65536),
    database_instances: z.number().int().min(1).max(3),
    storage_class: z.string().min(1).max(253),
    storage_endpoint: z.url({ protocol: /^https$/ }).max(512),
    storage_size_gib: z.number().int().min(10).max(65536),
    storage_instances: z.union([z.literal(1), z.literal(3)]),
    storage_certificate: z.string().max(65536).nullable(),
    bucket_size_bytes: z.number().int().min(1024).max(70368744177664).multipleOf(1024),
    bucket_max_objects: z.number().int().min(1).max(2147483647),
    storage_reserve_percent: z.number().int().min(1).max(99),
    storage_object_overhead_bytes: z.number().int().min(4096).max(1073741824),
});

/** Registers one compute target. */
export default function CreateCompute() {
    const dialog = useRegistryDialog({
        defaultValues: {
            name: '',
            kubeconfig: '',
            gateway_url: '',
            gateway_certificate: null,
            database_storage_class: '',
            database_size_gib: 10,
            database_instances: 1,
            storage_class: '',
            storage_endpoint: 'https://rook-ceph-rgw-longlink.rook-ceph.svc:443',
            storage_size_gib: 100,
            storage_instances: 3,
            storage_certificate: null,
            bucket_size_bytes: undefined,
            bucket_max_objects: undefined,
            storage_reserve_percent: undefined,
            storage_object_overhead_bytes: undefined,
        },
        endpoint: '/api/v1/computes',
        schema,
    });

    return (
        <RegistryDialog dialog={dialog} title="Connect compute" width={640}>
            <FormLayout>
                <Controller
                    control={dialog.form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Name"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="gateway_url"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Gateway URL"
                            description="HTTPS origin of the Kourier gateway reachable by the Platform API."
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="gateway_certificate"
                    render={({ field, fieldState }) => (
                        <TextArea
                            ref={field.ref}
                            label="Gateway CA certificate"
                            description="PEM trust bundle for a private CA. Leave blank to use system trust. Do not include private keys."
                            value={field.value ?? ''}
                            htmlName={field.name}
                            isOptional
                            hasSpellCheck={false}
                            rows={4}
                            onBlur={field.onBlur}
                            onChange={(value) => field.onChange(value.trim() === '' ? null : value)}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="database_storage_class"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Database storage class"
                            description="Existing Kubernetes StorageClass used for each Organization's CNPG database."
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="database_size_gib"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Database size per instance"
                            value={field.value}
                            htmlName={field.name}
                            units="GiB"
                            min={1}
                            max={65536}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="database_instances"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Database instances"
                            description="Total PostgreSQL instances per Organization, including the primary."
                            value={field.value}
                            htmlName={field.name}
                            min={1}
                            max={3}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="storage_class"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Ceph backing storage class"
                            description="Existing independent StorageClass supporting Block OSD PVCs and filesystem monitor PVCs."
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="storage_endpoint"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Storage HTTPS endpoint"
                            description="Reachable from Platform workers and Solutions; certificate must cover this hostname."
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="storage_size_gib"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Ceph capacity per OSD"
                            units="GiB"
                            min={10}
                            max={65536}
                            value={field.value}
                            htmlName={field.name}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="storage_instances"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Ceph replicas"
                            description="3 across separate nodes for production; 1 for non-HA development."
                            min={1}
                            max={3}
                            step={2}
                            value={field.value}
                            htmlName={field.name}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="storage_certificate"
                    render={({ field, fieldState }) => (
                        <TextArea
                            ref={field.ref}
                            label="Storage CA certificate"
                            description="PEM CA trust bundle. TLS key and server certificate belong in rook-ceph/longlink-storage-tls."
                            value={field.value ?? ''}
                            htmlName={field.name}
                            isOptional
                            hasSpellCheck={false}
                            rows={4}
                            onBlur={field.onBlur}
                            onChange={(value) => field.onChange(value.trim() === '' ? null : value)}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="bucket_size_bytes"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Organization bucket byte quota"
                            description="Shared by all Solutions in each Organization. Enter a multiple of 1024 bytes."
                            units="bytes"
                            min={1024}
                            max={70368744177664}
                            step={1024}
                            value={field.value}
                            htmlName={field.name}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="bucket_max_objects"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Organization bucket object quota"
                            min={1}
                            max={2147483647}
                            value={field.value}
                            htmlName={field.name}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="storage_reserve_percent"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Ceph capacity headroom"
                            description="Unallocated capacity after replication, for recovery, quota lag, and operational overhead."
                            units="%"
                            min={1}
                            max={99}
                            value={field.value}
                            htmlName={field.name}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="storage_object_overhead_bytes"
                    render={({ field, fieldState }) => (
                        <NumberInput
                            ref={field.ref}
                            label="Reserved overhead per object"
                            description="Budget for allocation rounding, bucket indexes, and metadata in addition to the byte quota. Size for your workload."
                            units="bytes"
                            min={4096}
                            max={1073741824}
                            value={field.value}
                            htmlName={field.name}
                            isIntegerOnly
                            isRequired
                            isWheelEnabled={false}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="kubeconfig"
                    render={({ field, fieldState }) => (
                        <TextArea
                            ref={field.ref}
                            label="Kubeconfig"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            hasSpellCheck={false}
                            rows={8}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
            </FormLayout>
        </RegistryDialog>
    );
}
