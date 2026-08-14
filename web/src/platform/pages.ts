import type { PageMetadata } from '@/lib/pages';
import { pageReferenceDocs } from './docs/sdk/pages/index';
import { metadata as homeMetadata } from './Home.metadata';
import { metadata as pricingMetadata } from './Pricing.metadata';
import { metadata as termsMetadata } from './legal/terms.metadata';
import { metadata as sdkMetadata } from './docs/sdk/index.metadata';
import { metadata as pagesMetadata } from './docs/sdk/pages.metadata';
import { metadata as privacyMetadata } from './legal/privacy.metadata';
import { metadata as routesMetadata } from './docs/sdk/routes.metadata';
import { metadata as platformMetadata } from './docs/api/index.metadata';
import { metadata as introductionMetadata } from './docs/index.metadata';
import { metadata as storageMetadata } from './docs/sdk/storage.metadata';
import { metadata as testingMetadata } from './docs/sdk/testing.metadata';
import { metadata as impressumMetadata } from './legal/impressum.metadata';
import { metadata as buildingMetadata } from './docs/sdk/building.metadata';
import { metadata as databaseMetadata } from './docs/sdk/database.metadata';
import { metadata as applicationsMetadata } from './docs/api/applications.metadata';
import { metadata as environmentsMetadata } from './docs/sdk/environments.metadata';
import { metadata as organizationsMetadata } from './docs/api/organizations.metadata';

export const publicPages = [
    homeMetadata,
    pricingMetadata,
    introductionMetadata,
    platformMetadata,
    organizationsMetadata,
    applicationsMetadata,
    sdkMetadata,
    environmentsMetadata,
    routesMetadata,
    storageMetadata,
    databaseMetadata,
    pagesMetadata,
    testingMetadata,
    buildingMetadata,
    ...pageReferenceDocs.map(({ name, path, summary }) => ({ path, title: name, description: summary })),
    termsMetadata,
    impressumMetadata,
    privacyMetadata,
] satisfies readonly PageMetadata[];
