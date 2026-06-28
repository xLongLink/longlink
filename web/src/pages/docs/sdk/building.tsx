import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
    lastUpdated: '2026-06-24',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/building.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="building" level="h1">
            Building
        </Heading>
        <ul className="ml-6 list-disc space-y-2">
            <li>Applications can be built using Docker.</li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                    longlink build
                </code>{' '}
                builds the image from a temporary Docker context and leaves no build files in the app folder.
            </li>
            <li>Once containerized, applications can be pushed to any registry.</li>
            <li>Applications can be connected to the control plane and deployed.</li>
        </ul>
        <div className="flex flex-col gap-2">
            <Heading id="docker-labels" level="h2">
                Docker Labels
            </Heading>
            <p className="leading-7">
                The build command writes these labels into the image metadata when values are available:
            </p>
            <CodeBlock language="text">
                {
                    'longlink.name=<app-name>\nlonglink.sdk=<installed-longlink-version>\nlonglink.version=<app-pyproject-version>\nlonglink.description=<app-description>\nlonglink.environments=<json-environment-list>\nlonglink.title=<app-title>\nlonglink.summary=<app-summary>\nlonglink.terms_of_service=<terms-url>\nlonglink.contact=<contact-metadata>\nlonglink.license_info=<license-metadata>'
                }
            </CodeBlock>
            <ul className="ml-6 list-disc space-y-2">
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.name
                    </code>{' '}
                    is the application name.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.sdk
                    </code>{' '}
                    is the installed LongLink SDK version.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.version
                    </code>{' '}
                    is the application version from{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        pyproject.toml
                    </code>
                    .
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.description
                    </code>{' '}
                    is the optional application description.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.environments
                    </code>{' '}
                    lists the app environment variables when{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        src/envs.py
                    </code>{' '}
                    exists.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.title
                    </code>{' '}
                    is the optional application title.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.summary
                    </code>{' '}
                    is the optional short summary.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.terms_of_service
                    </code>{' '}
                    is the optional terms-of-service URL.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.contact
                    </code>{' '}
                    is the optional contact metadata.
                </li>
                <li>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                        longlink.license_info
                    </code>{' '}
                    is the optional license metadata.
                </li>
            </ul>
        </div>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">longlink build</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv run longlink build</CodeBlock>
            </TabsContent>
        </Tabs>
        <div className="flex flex-col gap-2">
            <Heading id="ci-workflows" level="h2">
                CI Workflows
            </Heading>
            <p className="leading-7">
                Use the same flow in GitHub Actions or GitLab CI. Strip a leading `v` from release tags.
            </p>
            <Tabs defaultValue="github">
                <TabsList>
                    <TabsTrigger value="github">GitHub</TabsTrigger>
                    <TabsTrigger value="gitlab">GitLab</TabsTrigger>
                </TabsList>
                <TabsContent value="github">
                    <CodeBlock language="yaml">{`name: build-sample-image

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - name: Set up uv
        uses: astral-sh/setup-uv@v7

      - name: Set up Python
        uses: actions/setup-python@v6
        with:
          python-version: '3.14'

      - name: Install SDK dependencies
        working-directory: sdk
        run: uv sync

      - name: Generate sample app scaffold
        working-directory: sdk
        run: .venv/bin/longlink init --folder sample-app

      - name: Build sample app image
        working-directory: sdk/sample-app
        run: |
          image_version="${'$'}{GITHUB_REF_NAME#v}"
          ../.venv/bin/longlink build --tag "$image_version"

      - name: Log in to GHCR
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${'$'}{{ github.actor }}
          password: ${'$'}{{ secrets.GITHUB_TOKEN }}

      - name: Publish sample image
        working-directory: sdk/sample-app
        run: |
          image_version="${'$'}{GITHUB_REF_NAME#v}"
          docker tag longlink-app:"$image_version" ghcr.io/xlonglink/sample:latest
          docker tag longlink-app:"$image_version" ghcr.io/xlonglink/sample:"$image_version"
          docker push ghcr.io/xlonglink/sample:latest
          docker push ghcr.io/xlonglink/sample:"$image_version"`}</CodeBlock>
                </TabsContent>
                <TabsContent value="gitlab">
                    <CodeBlock language="yaml">{`build-sample-image:
  image: ghcr.io/astral-sh/uv:python3.14-bookworm
  stage: build

  script:
    - cd sdk
    - uv sync
    - .venv/bin/longlink init --folder sample-app
    - cd sample-app
    - image_version="${'$'}{CI_COMMIT_TAG#v}"
    - ../.venv/bin/longlink build --tag "$image_version"
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
    - docker tag longlink-app:"$image_version" "$CI_REGISTRY_IMAGE":latest
    - docker tag longlink-app:"$image_version" "$CI_REGISTRY_IMAGE":"$image_version"
    - docker push "$CI_REGISTRY_IMAGE":latest
    - docker push "$CI_REGISTRY_IMAGE":"$image_version"`}</CodeBlock>
                </TabsContent>
            </Tabs>
        </div>
    </div>
);
