import { api } from '@/lib/api';
import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { Navigate, useSearchParams } from 'react-router';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { zConsent, zAuthorizationRedirect } from '@/lib/generated/platform-api-v1/zod.gen';

/** Reuses browser login before asking for explicit, resource-specific MCP access. */
export default function McpAuthorization() {
    const [params] = useSearchParams();
    const { data: user, isLoading: loadingUser } = useCurrentUser();
    const query = params.toString();
    const requestKey = JSON.stringify([user?.id, query]);
    const [selection, setSelection] = useState<{ requestKey: string; ids: string[] }>({ requestKey, ids: [] });
    const organizationIds = selection.requestKey === requestKey ? selection.ids : [];

    const {
        data: consent,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['api', '/api/v1/mcp/consent', query, user?.id],
        queryFn: ({ signal }) => api(`/api/v1/mcp/consent?${query}`, { signal }).json(zConsent),
        enabled: !!user,
        retry: false,
    });

    /** Posts an explicit decision; the server validates permissions and the callback again. */
    async function decide(approve: boolean) {
        const result = await api
            .post('/api/v1/mcp/consent', {
                json: {
                    ...Object.fromEntries(params),
                    approve,
                    organization_ids: organizationIds,
                },
            })
            .json(zAuthorizationRedirect);

        window.location.assign(result.url);
    }

    // Preserve only this first-party approval route across password or provider login.
    if (loadingUser) return <title>Authorize MCP | LongLink</title>;

    if (!user) {
        return <Navigate replace to={`/login?${new URLSearchParams({ return_to: `/mcp/authorize?${query}` })}`} />;
    }

    // Keep the existing standalone authentication shell and its 384px content budget.
    return (
        <AuthLayout title="Authorize MCP access" description={null}>
            <title>Authorize MCP | LongLink</title>
            {isLoading ? <Text as="p">Loading authorization request…</Text> : null}
            {error ? <Text as="p">This request is invalid or you no longer have access.</Text> : null}
            {consent ? (
                <Stack gap={4}>
                    <Stack gap={2}>
                        <Text as="p">
                            {consent.client_name} requests access to{' '}
                            {consent.solution_name ?? 'your LongLink applications'}.
                        </Text>
                        <Text as="p" type="supporting">
                            This client uses your current Solution permissions. Permission changes apply automatically.{' '}
                            Access expires after {Math.round(consent.expires_in / 86400)} days.
                        </Text>
                        <Text as="p" type="label">
                            Client callback
                        </Text>
                        <Text as="p" type="supporting" className="break-all">
                            {consent.redirect_uri}
                        </Text>
                        <Text as="p" type="supporting">
                            Client names are self-reported. Approve only if you recognize this callback.
                        </Text>
                    </Stack>
                    {consent.solution_name === null ? (
                        <CheckboxList
                            label="Organizations"
                            value={organizationIds}
                            onChange={(ids) => setSelection({ requestKey, ids })}
                            description="Includes current and future installed applications you have permission to use in the selected organizations."
                        >
                            {(consent.organizations ?? []).map((organization) => (
                                <CheckboxListItem
                                    key={organization.id}
                                    value={organization.id}
                                    label={organization.name}
                                    description={organization.id}
                                />
                            ))}
                        </CheckboxList>
                    ) : null}
                    {consent.solution_name === null && !consent.organizations?.length ? (
                        <Text as="p">Join an organization before authorizing this connection.</Text>
                    ) : null}
                    <Button
                        label="Allow access"
                        variant="primary"
                        width="100%"
                        isDisabled={consent.solution_name === null && organizationIds.length === 0}
                        clickAction={() => decide(true)}
                    />
                    <Button label="Deny" width="100%" clickAction={() => decide(false)} />
                </Stack>
            ) : null}
        </AuthLayout>
    );
}
