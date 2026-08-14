import type { ComponentType } from 'react';
import type { ArticleMetadata } from '@/lib/pages';
import Terms, { metadata as termsMetadata } from '@/platform/legal/terms';
import Privacy, { metadata as privacyMetadata } from '@/platform/legal/privacy';
import Impressum, { metadata as impressumMetadata } from '@/platform/legal/impressum';
import ApplicationsDocumentation, { metadata as sdkMetadata } from '@/platform/docs/sdk';
import PlatformDocumentation, { metadata as platformMetadata } from '@/platform/docs/api';
import PagesDocumentation, { metadata as pagesMetadata } from '@/platform/docs/sdk/pages';
import RoutesDocumentation, { metadata as routesMetadata } from '@/platform/docs/sdk/routes';
import IntroductionDocumentation, { metadata as introductionMetadata } from '@/platform/docs';
import StorageDocumentation, { metadata as storageMetadata } from '@/platform/docs/sdk/storage';
import TestingDocumentation, { metadata as testingMetadata } from '@/platform/docs/sdk/testing';
import BuildingDocumentation, { metadata as buildingMetadata } from '@/platform/docs/sdk/building';
import DatabaseDocumentation, { metadata as databaseMetadata } from '@/platform/docs/sdk/database';
import EnvironmentsDocumentation, { metadata as environmentsMetadata } from '@/platform/docs/sdk/environments';
import ApplicationsApiDocumentation, { metadata as applicationsMetadata } from '@/platform/docs/api/applications';
import OrganizationsDocumentation, { metadata as organizationsMetadata } from '@/platform/docs/api/organizations';

type ArticleEntry = {
    Component: ComponentType;
    metadata: ArticleMetadata;
};

export const documentationPages = [
    { Component: IntroductionDocumentation, metadata: introductionMetadata },
    { Component: PlatformDocumentation, metadata: platformMetadata },
    { Component: OrganizationsDocumentation, metadata: organizationsMetadata },
    { Component: ApplicationsApiDocumentation, metadata: applicationsMetadata },
    { Component: ApplicationsDocumentation, metadata: sdkMetadata },
    { Component: EnvironmentsDocumentation, metadata: environmentsMetadata },
    { Component: RoutesDocumentation, metadata: routesMetadata },
    { Component: StorageDocumentation, metadata: storageMetadata },
    { Component: DatabaseDocumentation, metadata: databaseMetadata },
    { Component: PagesDocumentation, metadata: pagesMetadata },
    { Component: TestingDocumentation, metadata: testingMetadata },
    { Component: BuildingDocumentation, metadata: buildingMetadata },
] as const satisfies readonly ArticleEntry[];

export const legalPages = [
    { Component: Terms, metadata: termsMetadata },
    { Component: Impressum, metadata: impressumMetadata },
    { Component: Privacy, metadata: privacyMetadata },
] as const satisfies readonly ArticleEntry[];
