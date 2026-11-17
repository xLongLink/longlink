import { SidebarContext } from '@/lib/sidebar';
import { Separator } from '@/components/shadcn/separator';
import { Avatar } from '@/components/longlink/display/avatar';
import { useContext, useLayoutEffect, useState } from 'react';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { BookOpen, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { developmentUsers, getDevelopmentUser, setDevelopmentUser } from '@/solution/development';

/** Switches local request identity without exposing production account controls. */
export function DevelopmentProfile() {
    const sidebar = useContext(SidebarContext);
    const [profile] = useState(getDevelopmentUser);
    const { user } = profile;

    // Install the initial persona before the isolated View can make business requests.
    useLayoutEffect(() => {
        setDevelopmentUser(profile);
    }, [profile]);

    return (
        <Popover modal="trap-focus">
            <PopoverTrigger
                type="button"
                render={
                    <Button
                        variant="ghost"
                        size={sidebar === 'expanded' ? 'lg' : 'icon-lg'}
                        className={sidebar === 'expanded' ? 'w-full min-w-0 justify-start text-start' : undefined}
                    />
                }
                aria-label={user.name}
            >
                <Avatar name={user.name} size="sm" />
                {sidebar === 'expanded' && (
                    <>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm leading-4">{user.name}</span>
                            <span className="truncate text-xs leading-4 text-muted-foreground">{user.email}</span>
                        </span>
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                )}
            </PopoverTrigger>
            <PopoverContent
                className="max-h-(--available-height) max-w-(--available-width) overflow-y-auto"
                side={sidebar === null ? 'bottom' : 'top'}
                align={sidebar === null ? 'end' : 'start'}
                sideOffset={4}
                aria-label="Development user"
            >
                <section className="flex flex-col gap-1" aria-label="Development users">
                    <p className="text-xs font-medium text-muted-foreground">Development users</p>
                    {developmentUsers.map((candidate) => (
                        <Button
                            type="button"
                            variant="ghost"
                            size="lg"
                            className="w-full min-w-0 justify-start text-start font-normal aria-pressed:bg-muted dark:aria-pressed:bg-muted/50"
                            key={candidate.user.id}
                            aria-pressed={candidate.role === profile.role}
                            onClick={() => {
                                setDevelopmentUser(candidate);

                                // Dispose the old View, requests, and cached data together.
                                window.location.reload();
                            }}
                        >
                            <Avatar name={candidate.user.name} size="sm" />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm leading-4">{candidate.user.name}</span>
                                <span className="truncate text-xs leading-4 text-muted-foreground">
                                    {candidate.user.email}
                                </span>
                            </span>
                        </Button>
                    ))}
                </section>
                <Separator />
                <PopoverPrimitive.Close
                    nativeButton={false}
                    render={(props) => (
                        <a
                            {...props}
                            href="https://www.longlink.dev/docs/"
                            target="_blank"
                            rel="noopener noreferrer"
                            role={undefined}
                            onKeyDown={undefined}
                            onKeyUp={undefined}
                        />
                    )}
                    className={buttonVariants({
                        variant: 'ghost',
                        size: 'lg',
                        className: 'w-full justify-start font-normal'
                    })}
                >
                    <BookOpen aria-hidden="true" className="text-muted-foreground" size={16} />
                    Documentation
                    <ExternalLink aria-hidden="true" className="ms-auto text-muted-foreground" size={12} />
                </PopoverPrimitive.Close>
                <PopoverPrimitive.Close
                    type="button"
                    render={<Button variant="ghost" />}
                    className="sr-only focus:not-sr-only"
                >
                    Close development user menu
                </PopoverPrimitive.Close>
            </PopoverContent>
        </Popover>
    );
}
