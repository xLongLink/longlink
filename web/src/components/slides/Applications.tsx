import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { ArrowRight, Blocks, Cloud, FileSpreadsheet, Hand, Server, Sparkles, Wrench } from 'lucide-react';

/** Renders the process stages covered by an application type. */
function ProcessCoverage({ stages }: { stages: readonly string[] }) {
    return (
        <Stack align="center" direction="horizontal" gap={0.5}>
            {stages.flatMap((stage, index) => [
                <Text key={stage} textWrap="nowrap" type="supporting">
                    {stage}
                </Text>,
                index < stages.length - 1 ? (
                    <ArrowRight aria-hidden className="text-secondary" key={`${stage}-separator`} size={12} />
                ) : null,
            ])}
        </Stack>
    );
}

/** Renders the applications comparison slide. */
export function ApplicationsSlide() {
    return (
        <Stack align="center" gap={2} maxWidth={832} width="100%">
            <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                <Card height={120} variant="muted" width={272}>
                    <Stack align="center" gap={1} height="100%" justify="center">
                        <Server aria-hidden className="text-accent" size={16} />
                        <Text type="large" weight="semibold">
                            Legacy systems
                        </Text>
                        <ProcessCoverage stages={['Operate']} />
                    </Stack>
                </Card>
                <Card height={120} variant="muted" width={272}>
                    <Stack align="center" gap={1} height="100%" justify="center">
                        <Blocks aria-hidden className="text-accent" size={16} />
                        <Text type="large" weight="semibold">
                            Low-code platforms
                        </Text>
                        <ProcessCoverage stages={['Design', 'Build', 'Operate']} />
                    </Stack>
                </Card>
            </Grid>
            <Grid columns={3} gap={2} justify="center" width="100%">
                <Card height={120} variant="muted" width={272}>
                    <Stack align="center" gap={1} height="100%" justify="center">
                        <Cloud aria-hidden className="text-accent" size={16} />
                        <Text type="large" weight="semibold">
                            SaaS applications
                        </Text>
                        <ProcessCoverage stages={['Operate']} />
                    </Stack>
                </Card>
                <Card height={120} variant="muted" width={272}>
                    <Stack align="center" gap={1} height="100%" justify="center">
                        <FileSpreadsheet aria-hidden className="text-accent" size={16} />
                        <Text type="large" weight="semibold">
                            Excel
                        </Text>
                        <ProcessCoverage stages={['Design', 'Build', 'Operate', 'Improve']} />
                    </Stack>
                </Card>
                <Card height={120} variant="muted" width={272}>
                    <Stack align="center" gap={1} height="100%" justify="center">
                        <Sparkles aria-hidden className="text-accent" size={16} />
                        <Text type="large" weight="semibold">
                            Vibe tools
                        </Text>
                        <ProcessCoverage stages={['Design', 'Build']} />
                    </Stack>
                </Card>
            </Grid>
            <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                <Card height={120} variant="muted" width={272}>
                    <Stack align="center" gap={1} height="100%" justify="center">
                        <Hand aria-hidden className="text-accent" size={16} />
                        <Text type="large" weight="semibold">
                            Manual workflows
                        </Text>
                        <ProcessCoverage stages={['Operate']} />
                    </Stack>
                </Card>
                <Card height={120} variant="muted" width={272}>
                    <Stack align="center" gap={1} height="100%" justify="center">
                        <Wrench aria-hidden className="text-accent" size={16} />
                        <Text type="large" weight="semibold">
                            Workarounds
                        </Text>
                        <ProcessCoverage stages={['Build', 'Operate']} />
                    </Stack>
                </Card>
            </Grid>
        </Stack>
    );
}
