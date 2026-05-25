import MarkdownDoc from './MarkdownDoc';
import markdown from '../../docs/index.md?raw';
import controlPlaneMarkdown from '../../docs/api/index.md?raw';
import selfHostedControlPlaneMarkdown from '../../docs/api/self-hosted.md?raw';
import sdkBuildingMarkdown from '../../docs/sdk/building.md?raw';
import sdkDatabaseMarkdown from '../../docs/sdk/database.md?raw';
import sdkEnvironmentsMarkdown from '../../docs/sdk/environments.md?raw';
import sdkRoutesMarkdown from '../../docs/sdk/routes.md?raw';
import sdkStorageMarkdown from '../../docs/sdk/storage.md?raw';
import sdkTestingMarkdown from '../../docs/sdk/testing.md?raw';
import sdkMarkdown from '../../docs/sdk/index.md?raw';
import xmlComponentsMarkdown from '../../docs/xml/components.md?raw';
import xmlFieldMarkdown from '../../docs/xml/field.md?raw';
import xmlLayoutMarkdown from '../../docs/xml/layout.md?raw';
import xmlMarkdown from '../../docs/xml/index.md?raw';

/** Renders the LongLink docs introduction page. */
export function DocsOverviewPage() {
    return <MarkdownDoc content={markdown} />;
}


export default DocsOverviewPage;


/** Renders the control plane documentation page. */
export function ControlPlanePage() {
    return <MarkdownDoc content={controlPlaneMarkdown} />;
}


/** Renders the self-hosted control plane documentation page. */
export function SelfHostedControlPlanePage() {
    return <MarkdownDoc content={selfHostedControlPlaneMarkdown} />;
}


/** Renders the SDK overview page. */
export function SdkOverviewPage() {
    return <MarkdownDoc content={sdkMarkdown} />;
}


/** Renders the SDK environments documentation page. */
export function SdkEnvironmentsPage() {
    return <MarkdownDoc content={sdkEnvironmentsMarkdown} />;
}


/** Renders the SDK routes documentation page. */
export function SdkRoutesPage() {
    return <MarkdownDoc content={sdkRoutesMarkdown} />;
}


/** Renders the SDK storage documentation page. */
export function SdkStoragePage() {
    return <MarkdownDoc content={sdkStorageMarkdown} />;
}


/** Renders the SDK database documentation page. */
export function SdkDatabasePage() {
    return <MarkdownDoc content={sdkDatabaseMarkdown} />;
}


/** Renders the SDK testing documentation page. */
export function SdkTestingPage() {
    return <MarkdownDoc content={sdkTestingMarkdown} />;
}


/** Renders the SDK building documentation page. */
export function SdkBuildingPage() {
    return <MarkdownDoc content={sdkBuildingMarkdown} />;
}


/** Renders the XML pages overview. */
export function XmlOverviewPage() {
    return <MarkdownDoc content={xmlMarkdown} />;
}


/** Renders the XML components documentation page. */
export function XmlComponentsPage() {
    return <MarkdownDoc content={xmlComponentsMarkdown} />;
}


/** Renders the XML field documentation page. */
export function XmlFieldPage() {
    return <MarkdownDoc content={xmlFieldMarkdown} />;
}


/** Renders the XML layout documentation page. */
export function XmlLayoutPage() {
    return <MarkdownDoc content={xmlLayoutMarkdown} />;
}
