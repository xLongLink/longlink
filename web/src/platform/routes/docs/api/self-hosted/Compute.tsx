import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DocumentationArticle } from '@/components/layouts/Article';

const article = {
    title: 'Compute | LongLink Self Hosted Documentation',
    description: 'Install the LongLink Compute Helm chart and connect a Kubernetes cluster to the Platform.',
    toc: [
        { id: 'compute', label: 'Compute', level: 1 },
        { id: 'configuration', label: 'Configuration', level: 2 },
        { id: 'connect', label: 'Connect to the Platform', level: 2 },
    ],
    lastUpdated: '2026-10-29',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/self-hosted/Compute.tsx',
};

/** Introduces connecting self-hosted compute to the Platform. */
export default function Compute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="compute" level={1}>
                    Compute
                </Heading>
                <Text as="p">
                    Compute runs your Solutions on Kubernetes and is installed using the{' '}
                    <Link href="https://github.com/xLongLink/longlink/tree/main/k8s/chart" isExternalLink>
                        Helm chart
                    </Link>
                    . Use a dedicated cluster with persistent storage, load balancer support, cluster-level installation
                    permissions, and Helm 4.3 or later. The Platform must reach the Kubernetes API and the gateway and
                    storage HTTPS endpoints.
                </Text>
                <CodeBlock
                    language="bash"
                    code={`helm upgrade --install longlink-compute oci://ghcr.io/xlonglink/longlink \\
  --namespace longlink-system --create-namespace \\
  --values compute-values.yaml --wait=legacy --timeout 15m`}
                />
                <Stack as="section" gap={3}>
                    <Heading id="configuration" level={2}>
                        Configuration
                    </Heading>
                    <CodeBlock
                        language="yaml"
                        title="compute-values.yaml"
                        code={`gateway:
  address: <gateway-ip>
storage:
  address: <storage-ip>
gatewayAllowedSourceCidr: <platform-outbound-ip>/32
rustfs:
  mode: standalone
  storage:
    name: <storage-class-name>
    dataStorageSize: 5Gi`}
                    />
                </Stack>
                <Stack as="section" gap={3}>
                    <Heading id="connect" level={2}>
                        Connect to the Platform
                    </Heading>
                    <Text as="p">
                        Sign in as the Platform administrator, open Compute, and select Register Compute. Enter a name,
                        the gateway and storage HTTPS endpoints, and a kubeconfig with cluster access. The kubeconfig
                        must contain credentials and certificate data and use a Kubernetes API address reachable from
                        the Platform; local file references and exec authentication plugins are not supported.
                    </Text>
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
