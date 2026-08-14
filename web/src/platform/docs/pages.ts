import type { ComponentType } from 'react';
import type { ArticleMetadata } from '@/lib/pages';
import ApplicationsDocumentation, { metadata as sdkMetadata } from './sdk';
import PlatformDocumentation, { metadata as platformMetadata } from './api';
import PagesDocumentation, { metadata as pagesMetadata } from './sdk/pages';
import RoutesDocumentation, { metadata as routesMetadata } from './sdk/routes';
import StorageDocumentation, { metadata as storageMetadata } from './sdk/storage';
import TestingDocumentation, { metadata as testingMetadata } from './sdk/testing';
import BuildingDocumentation, { metadata as buildingMetadata } from './sdk/building';
import DatabaseDocumentation, { metadata as databaseMetadata } from './sdk/database';
import IntroductionDocumentation, { metadata as introductionMetadata } from './index';
import EnvironmentsDocumentation, { metadata as environmentsMetadata } from './sdk/environments';
import ApplicationsApiDocumentation, { metadata as applicationsMetadata } from './api/applications';
import OrganizationsDocumentation, { metadata as organizationsMetadata } from './api/organizations';

type DocumentationEntry = {
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
] as const satisfies readonly DocumentationEntry[];
