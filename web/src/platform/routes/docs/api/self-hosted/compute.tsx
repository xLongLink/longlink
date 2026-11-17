import { Stack } from '@/components/longlink/layout/stack';
import { NativeLink as Link } from '@/components/custom/native-link';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
import {
    CodeBlock,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle
} from '@/components/reui/code-block/code-block';

const article = {
    title: 'Compute | LongLink Self Hosted Documentation',
    description: 'Install the LongLink Compute Helm chart and connect a Kubernetes cluster to the Platform.',
    toc: [
        { id: 'compute', label: 'Compute', level: 1 },
        { id: 'configuration', label: 'Configuration', level: 2 },
        { id: 'connect', label: 'Connect to the Platform', level: 2 }
    ],
    lastUpdated: '2026-10-29',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/self-hosted/compute.tsx'
};

/** Introduces connecting self-hosted compute to the Platform. */
export default function Compute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="compute">
                    Compute
                </h1>
                <p>
                    Compute runs your Solutions on Kubernetes and is installed using the{' '}
                    <Link href="https://github.com/xLongLink/longlink/tree/main/k8s/chart" isExternalLink>
                        Helm chart
                    </Link>
                    . Use a dedicated cluster with persistent storage, load balancer support, cluster-level installation
                    permissions, and Helm 4.3 or later. The Platform must reach the Kubernetes API and the gateway and
                    storage HTTPS endpoints.
                </p>
                <CodeBlock
                    language="bash"
                    code={`helm upgrade --install longlink-compute oci://ghcr.io/xlonglink/longlink \\
  --namespace longlink-system --create-namespace \\
  --values compute-values.yaml --wait=legacy --timeout 15m`}
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="configuration">
                        Configuration
                    </h2>
                    <CodeBlock
                        language="yaml"
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
                    >
                        <CodeBlockHeader>
                            <CodeBlockTitle>compute-values.yaml</CodeBlockTitle>
                            <CodeBlockCopyButton className="ml-auto" />
                        </CodeBlockHeader>
                    </CodeBlock>
                </Stack>
                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="connect">
                        Connect to the Platform
                    </h2>
                    <p>
                        Sign in as the Platform administrator, open Compute, and select Register Compute. Enter a name,
                        the gateway and storage HTTPS endpoints, and a kubeconfig with cluster access. The kubeconfig
                        must contain credentials and certificate data and use a Kubernetes API address reachable from
                        the Platform; local file references and exec authentication plugins are not supported.
                    </p>
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
