import { api } from '@/lib/api';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { apiQueryOptions } from '@/lib/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Table, proportional } from '@astryxdesign/core/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query';

const tokensQuery = apiQueryOptions('/api/v1/mcp/tokens', schemas.zTokenSummary.array());

/** Connects an MCP client once and manages the user's independently revocable grants. */
export default function McpSettings() {
    const client = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);

    // Refresh grants when returning from the client's browser authorization.
    const [{ data: tokens }, { data: memberships }] = useSuspenseQueries({
        queries: [
            { ...tokensQuery, refetchOnWindowFocus: true },
            apiQueryOptions('/api/v1/me/organizations', schemas.zUserOrganizationMembership.array()),
        ],
    });

    /** Refreshes authorized connections when setup is dismissed. */
    async function changeDialog(open: boolean) {
        setIsCreating(open);

        if (!open) await client.invalidateQueries({ queryKey: tokensQuery.queryKey, exact: true });
    }

    return (
        <Stack gap={6}>
            <Stack gap={4}>
                <Stack
                    direction="horizontal"
                    justify="between"
                    align="end"
                    wrap="wrap"
                    minHeight="var(--size-element-md)"
                >
                    <Heading level={2} hasCapsize>
                        MCP connections
                    </Heading>
                    <Button label="New Connection" size="sm" onClick={() => setIsCreating(true)} />
                </Stack>
                <Divider />
                {tokens.length === 0 ? (
                    <Text as="p" type="supporting">
                        No active MCP connections. Choose New Connection to connect your client.
                    </Text>
                ) : (
                    <Table
                        data={tokens}
                        idKey="id"
                        density="compact"
                        columns={[
                            {
                                key: 'client',
                                header: 'Client',
                                width: proportional(1),
                                renderCell: (token) => token.client_name,
                            },
                            {
                                key: 'access',
                                header: 'Access',
                                width: proportional(2),
                                renderCell: (token) =>
                                    token.solution_id
                                        ? `Solution ${token.solution_id}`
                                        : token.organization_ids
                                              .map(
                                                  (id) =>
                                                      memberships.find(
                                                          (membership) => membership.organization.id === id
                                                      )?.organization.name ?? id
                                              )
                                              .join(', '),
                            },
                            {
                                key: 'expiry',
                                header: 'Expires',
                                renderCell: (token) => new Date(token.expires_at).toLocaleDateString(),
                            },
                            {
                                key: 'revoke',
                                header: 'Revoke',
                                renderCell: (token) => (
                                    <Button
                                        label="Revoke"
                                        size="sm"
                                        variant="ghost"
                                        clickAction={async () => {
                                            await api.delete(`/api/v1/mcp/tokens/${token.id}`);
                                            await client.invalidateQueries({
                                                queryKey: tokensQuery.queryKey,
                                                exact: true,
                                            });
                                        }}
                                    />
                                ),
                            },
                        ]}
                    />
                )}
            </Stack>
            {isCreating && (
                <Dialog isOpen title="New Connection" onOpenChange={(open) => void changeDialog(open)}>
                    <ApiBoundary>
                        <ConnectionInstructions />
                    </ApiBoundary>
                </Dialog>
            )}
        </Stack>
    );
}

/** Loads canonical connection details only while the setup dialog is open. */
function ConnectionInstructions() {
    const [{ resource }] = useApi('/.well-known/oauth-protected-resource/api/v1/mcp', schemas.zResourceMetadata);
    const setup = `codex mcp add longlink --url ${JSON.stringify(resource)}\ncodex mcp login longlink`;

    return (
        <Tabs hasDivider>
            <Tab label="OpenAI" value="openai">
                <Stack gap={4}>
                    <Stack gap={3}>
                        <Heading level={3}>Codex CLI</Heading>
                        <CodeBlock code={setup} language="bash" isWrapped />
                    </Stack>
                    <Stack gap={3}>
                        <Heading level={3}>ChatGPT plugin</Heading>
                        <Button as="a" href="/api/v1/mcp/plugin" label="Download plugin ZIP" />
                    </Stack>
                </Stack>
            </Tab>
        </Tabs>
    );
}
