import controlPlaneMarkdown from '../../docs/api/index.md?raw';
import selfHostedControlPlaneMarkdown from '../../docs/api/self-hosted.md?raw';
import markdown from '../../docs/index.md?raw';
import sdkBuildingMarkdown from '../../docs/sdk/building.md?raw';
import sdkDatabaseMarkdown from '../../docs/sdk/database.md?raw';
import sdkEnvironmentsMarkdown from '../../docs/sdk/environments.md?raw';
import sdkMarkdown from '../../docs/sdk/index.md?raw';
import sdkRoutesMarkdown from '../../docs/sdk/routes.md?raw';
import sdkStorageMarkdown from '../../docs/sdk/storage.md?raw';
import sdkTestingMarkdown from '../../docs/sdk/testing.md?raw';
import xmlComponentsMarkdown from '../../docs/xml/components.md?raw';
import xmlMarkdown from '../../docs/xml/index.md?raw';
import xmlLayoutMarkdown from '../../docs/xml/layout.md?raw';
import MarkdownDoc from './MarkdownDoc';

/** Creates a docs page component for a markdown source. */
function createMarkdownPage(content: string) {
    return function MarkdownPage() {
        return <MarkdownDoc content={content} />;
    };
}

/** Renders the LongLink docs introduction page. */
export const DocsOverviewPage = createMarkdownPage(markdown);

/** Renders the control plane documentation page. */
export const ControlPlanePage = createMarkdownPage(controlPlaneMarkdown);

/** Renders the self-hosted control plane documentation page. */
export const SelfHostedControlPlanePage = createMarkdownPage(selfHostedControlPlaneMarkdown);

/** Renders the SDK overview page. */
export const SdkOverviewPage = createMarkdownPage(sdkMarkdown);

/** Renders the SDK environments documentation page. */
export const SdkEnvironmentsPage = createMarkdownPage(sdkEnvironmentsMarkdown);

/** Renders the SDK routes documentation page. */
export const SdkRoutesPage = createMarkdownPage(sdkRoutesMarkdown);

/** Renders the SDK storage documentation page. */
export const SdkStoragePage = createMarkdownPage(sdkStorageMarkdown);

/** Renders the SDK database documentation page. */
export const SdkDatabasePage = createMarkdownPage(sdkDatabaseMarkdown);

/** Renders the SDK testing documentation page. */
export const SdkTestingPage = createMarkdownPage(sdkTestingMarkdown);

/** Renders the SDK building documentation page. */
export const SdkBuildingPage = createMarkdownPage(sdkBuildingMarkdown);

/** Renders the XML pages overview. */
export const XmlOverviewPage = createMarkdownPage(xmlMarkdown);

/** Renders the XML components documentation page. */
export const XmlComponentsPage = createMarkdownPage(xmlComponentsMarkdown);

/** Renders the XML layout documentation page. */
export const XmlLayoutPage = createMarkdownPage(xmlLayoutMarkdown);

export default DocsOverviewPage;
