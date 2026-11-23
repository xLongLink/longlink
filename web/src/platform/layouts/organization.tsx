import type { z } from 'zod';
import * as tabs from '@/platform/tabs';
import { Settings2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { ProfileMenu } from '@/platform/profile';
import Platform from '@/components/layouts/platform';
import { PageContainer } from '@/components/layouts/page-container';
import { Outlet, useLocation, useOutletContext } from 'react-router';
import { OrganizationBreadcrumb } from '@/components/ui/organization-breadcrumb';
import { OrganizationSwitcher, type OrganizationIdentity } from '@/components/ui/organization-switcher';
import { zOrganizationTagResponse, zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

export type OrganizationContext = z.output<typeof zUserOrganizationMembership> & {
    tags: z.output<typeof zOrganizationTagResponse>[];
    activeTag: z.output<typeof zOrganizationTagResponse> | undefined;
};

type OrganizationFrameProps = Pick<ComponentProps<typeof Platform>, 'activeTab' | 'tabs' | 'children'> & {
    organization: OrganizationIdentity;
    showSwitcher: boolean;
};

export function OrganizationFrame({ organization, showSwitcher, activeTab, tabs, children }: OrganizationFrameProps) {
    return (
        <Platform
            action={<ProfileMenu />}
            breadcrumb={<OrganizationBreadcrumb organization={organization} />}
            sidebarHeader={showSwitcher ? <OrganizationSwitcher organization={organization} /> : undefined}
            activeTab={activeTab}
            tabs={tabs}
        >
            <PageContainer gap={8}>{children}</PageContainer>
        </Platform>
    );
}

/** Renders shared category navigation around organization pages. */
export default function OrganizationLayout() {
    const membership = useOutletContext<z.output<typeof zUserOrganizationMembership>>();
    const [tags] = useApi(`/api/v1/organizations/${membership.organization.id}/tags`, zOrganizationTagResponse.array());
    const location = useLocation();
    const base = `/orgs/${membership.organization.id}`;

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
        <OrganizationFrame
            organization={membership.organization}
            showSwitcher
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
            <ApiBoundary>
                <Outlet context={{ ...membership, tags, activeTag } satisfies OrganizationContext} />
            </ApiBoundary>
        </OrganizationFrame>
    );
}
