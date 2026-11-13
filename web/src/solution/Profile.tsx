import { SidebarContext } from '@/lib/sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Popover } from '@base-ui/react/popover';
import { Divider } from '@/components/ui/Divider';
import { useContext, useLayoutEffect, useState } from 'react';
import { BookOpen, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { developmentUsers, getDevelopmentUser, setDevelopmentUser } from '@/solution/development';

/** Switches local request identity without exposing production account controls. */
export function DevelopmentProfile() {
    const sidebar = useContext(SidebarContext);
    const [isOpen, setIsOpen] = useState(false);
    const [profile] = useState(getDevelopmentUser);
    const { user } = profile;

    // Install the initial persona before the isolated View can make business requests.
    useLayoutEffect(() => {
        setDevelopmentUser(profile);
    }, [profile]);

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen} modal="trap-focus">
            <Popover.Trigger
                type="button"
                aria-label={user.name}
                className="profile-trigger"
                data-expanded={sidebar === 'expanded' || undefined}
            >
                <Avatar name={user.name} seed={user.id} />
                {sidebar === 'expanded' && (
                    <>
                        <span className="profile-identity-text">
                            <span className="profile-name">{user.name}</span>
                            <span className="profile-email">{user.email}</span>
                        </span>
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                )}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner
                    className="profile-positioner"
                    side={sidebar === null ? 'bottom' : 'top'}
                    align={sidebar === null ? 'end' : 'start'}
                    sideOffset={4}
                >
                    <Popover.Popup className="profile-popup" aria-label="Development user">
                        <section className="profile-links" aria-label="Development users">
                            <p className="profile-heading">Development users</p>
                            {developmentUsers.map((candidate) => (
                                <button
                                    type="button"
                                    className="profile-link identity-option"
                                    key={candidate.user.id}
                                    aria-pressed={candidate.role === profile.role}
                                    onClick={() => {
                                        setDevelopmentUser(candidate);

                                        // Dispose the old View, requests, and cached data together.
                                        window.location.reload();
                                    }}
                                >
                                    <Avatar name={candidate.user.name} seed={candidate.user.id} />
                                    <span className="profile-identity-text">
                                        <span className="profile-name">{candidate.user.name}</span>
                                        <span className="profile-email">{candidate.user.email}</span>
                                    </span>
                                </button>
                            ))}
                        </section>
                        <Divider />
                        <a
                            className="profile-link"
                            href="https://www.longlink.dev/docs/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClickCapture={() => setIsOpen(false)}
                        >
                            <BookOpen aria-hidden="true" className="text-muted-foreground" size={16} />
                            Documentation
                            <ExternalLink
                                aria-hidden="true"
                                className="profile-external text-muted-foreground"
                                size={12}
                            />
                        </a>
                        <Popover.Close className="sr-only focus:not-sr-only">Close development user menu</Popover.Close>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
