import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Item } from '@astryxdesign/core/Item';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { Popover } from '@astryxdesign/core/Popover';
import { useTranslator } from '@astryxdesign/core/i18n';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useUser } from '@/hooks/use-user';

/** Renders a user profile popover with authentication and navigation actions. */
export function UserProfile() {
    const t = useTranslator();
    const { user, signOut, switchAccount } = useUser();
    const showToast = useToast();
    const [isOpen, setIsOpen] = useState(false);

    // Hide the profile menu until a user is loaded.
    if (!user) {
        return null;
    }

    /** Closes the profile navigation after selecting an internal link. */
    function closeProfile() {
        setIsOpen(false);
    }

    return (
        <Popover
            alignment="end"
            isOpen={isOpen}
            label={user.name}
            onOpenChange={setIsOpen}
            placement="below"
            width={280}
            content={
                <Stack gap={2} width="100%">
                    <Item
                        description={user.email}
                        endContent={<Icon icon="arrowsUpDown" size="sm" />}
                        label={user.name}
                        onClick={() => {
                            setIsOpen(false);
                            void switchAccount().catch(() => {
                                showToast({ body: t('auth.switchAccountFailed'), type: 'error' });
                            });
                        }}
                        startContent={<Avatar src={user.avatar} name={user.name} size="small" />}
                    />
                    <Divider />
                    <Link href="/organizations" isStandalone onClick={closeProfile}>
                        {t('profile.organizations')}
                    </Link>
                    <Link href="/settings" isStandalone onClick={closeProfile}>
                        {t('profile.settings')}
                    </Link>
                    <Link href="/docs" isStandalone onClick={closeProfile} rel="noopener noreferrer" target="_blank">
                        {t('common.documentation')} <Icon icon="externalLink" size="xsm" />
                    </Link>
                    {user.role !== 'user' ? (
                        <>
                            <Divider />
                            <Link href="/admin/users" isStandalone onClick={closeProfile}>
                                {t('profile.users')}
                            </Link>
                            <Link href="/admin/applications" isStandalone onClick={closeProfile}>
                                {t('profile.applications')}
                            </Link>
                            <Link href="/admin/organizations" isStandalone onClick={closeProfile}>
                                {t('profile.organizations')}
                            </Link>
                            <Link href="/admin/database" isStandalone onClick={closeProfile}>
                                {t('profile.database')}
                            </Link>
                            <Link href="/admin/storage" isStandalone onClick={closeProfile}>
                                {t('profile.storage')}
                            </Link>
                            <Link href="/admin/compute" isStandalone onClick={closeProfile}>
                                {t('profile.compute')}
                            </Link>
                            <Link href="/admin/operations" isStandalone onClick={closeProfile}>
                                {t('profile.operations')}
                            </Link>
                            <Divider />
                        </>
                    ) : null}
                    <Button
                        label={t('actions.signOut')}
                        onClick={() => {
                            setIsOpen(false);
                            void signOut().catch(() => {
                                showToast({ body: t('profile.signOutFailed'), type: 'error' });
                            });
                        }}
                        variant="destructive"
                    />
                </Stack>
            }
        >
            <IconButton
                icon={<Avatar src={user.avatar} name={user.name} size="small" />}
                label={user.name}
                size="md"
                variant="ghost"
            />
        </Popover>
    );
}
