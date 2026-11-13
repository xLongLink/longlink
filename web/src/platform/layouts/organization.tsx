import type { z } from 'zod';
import * as tabs from '@/platform/tabs';
import { Settings2 } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { ProfileMenu } from '@/components/profile';
import Platform from '@/components/layouts/platform';
import { PageContainer } from '@/components/page-container';
import { Outlet, useParams, useLocation, useOutletContext } from 'react-router';
import { OrganizationSwitcher } from '@/platform/components/organization-switcher';
import { OrganizationBreadcrumb } from '@/platform/components/organization-breadcrumb';
import { zOrganizationTagResponse, zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

export type OrganizationContext = z.output<typeof zUserOrganizationMembership> & {
    tags: z.output<typeof zOrganizationTagResponse>[];
    activeTag: z.output<typeof zOrganizationTagResponse> | undefined;
};

/** Renders shared category navigation around organization pages. */
export default function OrganizationLayout() {
    const { organization = '' } = useParams();
    const membership = useOutletContext<z.output<typeof zUserOrganizationMembership>>();
    const [tags] = useApi(`/api/v1/organizations/${membership.organization.id}/tags`, zOrganizationTagResponse.array());
    const location = useLocation();
    const base = `/orgs/${organization}`;

    // Category links share a pathname, so resolve selection from the query as well.
    const requestedTag = new URLSearchParams(location.search).get('tag');

    const activeTag = tags.find((tag) => tag.id === requestedTag) ?? tags[0];

    const activeTab =
        location.pathname.replace(/\/+$/, '') === `${base}/settings`
            ? `${base}/settings`
            : activeTag && activeTag.id !== tags[0]?.id
              ? `${base}?tag=${activeTag.id}`
              : base;

    return (
        <Platform
            action={<ProfileMenu />}
            breadcrumb={<OrganizationBreadcrumb organization={membership.organization} />}
            sidebarHeader={<OrganizationSwitcher organization={membership.organization} />}
            activeTab={activeTab}
            tabs={[
                ...tags.map((tag, index) => {
                    const Icon = tabs.icons[tag.icon].component;

                    return {
                        href: index === 0 ? base : `${base}?tag=${tag.id}`,
                        icon: <Icon aria-hidden="true" size={16} />,
                        label: tag.name
                    };
                }),
                { href: `${base}/settings`, icon: <Settings2 aria-hidden="true" size={16} />, label: 'Settings' }
            ]}
        >
            <PageContainer gap={8} padding={2}>
                <ApiBoundary>
                    <Outlet context={{ ...membership, tags, activeTag } satisfies OrganizationContext} />
                </ApiBoundary>
            </PageContainer>
        </Platform>
    );
}
