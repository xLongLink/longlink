import { useMenuTouch } from './menu-touch';
import { ReportedError } from '@/lib/reported';
import { Toolbar } from '@base-ui/react/toolbar';
import { Icon, type StoneIconName } from './icon';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import { Button as Control } from '@/components/shadcn/button';
import { ButtonGroupContext, ControlSizeContext, LinkNavigationContext } from './contexts';
import {
    isValidElement,
    useContext,
    useId,
    useRef,
    useState,
    useTransition,
    type MouseEvent,
    type ComponentProps,
    type ReactElement,
    type ReactNode
} from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

export type ActionMenuItemData = {
    id?: string;
    label: ReactNode;
    icon?: StoneIconName | ReactElement;
    description?: ReactNode;
    endContent?: ReactNode;
    disabled?: ComponentProps<typeof DropdownMenuItem>['disabled'];
    variant?: ComponentProps<typeof DropdownMenuItem>['variant'];
    closeOnClick?: ComponentProps<typeof DropdownMenuItem>['closeOnClick'];
    href?: string;
    target?: '_blank' | '_self';
    rel?: string;
    onClick?: (event: MouseEvent) => void | Promise<void>;
    items?: ActionMenuOption[];
};

export type ActionMenuOption =
    | ActionMenuItemData
    | { type: 'divider' }
    | { type: 'section'; id?: string; title?: string; items: ActionMenuItemData[] };

/** Adds asynchronous actions and scoped navigation to native dropdown composition. */
export function ActionMenu({
    items,
    trigger: button = (
        <Control type="button" variant="outline">
            Actions
            <ChevronDown aria-hidden="true" />
        </Control>
    ),
    open: controlledOpen,
    onOpenChange,
    align = 'start'
}: {
    items: ActionMenuOption[];
    trigger?: ReactElement<ComponentProps<typeof Control>>;
    open?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    align?: ComponentProps<typeof DropdownMenuContent>['align'];
}) {
    const group = useContext(ButtonGroupContext);
    const owner = useId();
    const disabled = button.props.disabled || (group?.isDisabled ?? false);
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;

    // Controlled callers retain ownership; uncontrolled menus report the same transitions.
    function changeOpen(nextOpen: boolean) {
        if (controlledOpen === undefined) setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
    }

    const touch = useMenuTouch(owner, open, disabled, changeOpen);

    const trigger = (
        <DropdownMenuTrigger
            {...touch}
            className="touch-none"
            data-menu-trigger=""
            disabled={disabled}
            render={button}
        />
    );

    // Only the trigger participates in its surrounding control group.
    return (
        <DropdownMenu open={open} onOpenChange={changeOpen}>
            {group ? (
                <Toolbar.Button disabled={disabled} focusableWhenDisabled={group.isDisabled} render={trigger} />
            ) : (
                trigger
            )}
            <MenuSurface owner={owner} items={items} alignment={align} closeMenu={() => changeOpen(false)} />
        </DropdownMenu>
    );
}

/** Keeps portal content independent of trigger sizing and grouping. */
function MenuSurface({
    owner,
    items,
    closeMenu,
    nested = false,
    alignment = 'start'
}: {
    owner: string;
    items: ActionMenuOption[];
    closeMenu: () => void;
    nested?: boolean;
    alignment?: ComponentProps<typeof DropdownMenuContent>['align'];
}) {
    const Content = nested ? DropdownMenuSubContent : DropdownMenuContent;

    return (
        <ButtonGroupContext value={null}>
            <ControlSizeContext value={null}>
                <Content align={alignment} side={nested ? 'inline-end' : 'bottom'} data-view-menu={owner}>
                    <MenuItems owner={owner} items={items} closeMenu={closeMenu} />
                </Content>
            </ControlSizeContext>
        </ButtonGroupContext>
    );
}

/** Retains authored sections, separators, and stable identities in nested menus. */
function MenuItems({ owner, items, closeMenu }: { owner: string; items: ActionMenuOption[]; closeMenu: () => void }) {
    return items.map((item, index) => {
        if ('type' in item) {
            if (item.type === 'divider') {
                // Dividers have no authored identity in the public data contract.
                // eslint-disable-next-line react/no-array-index-key
                return <DropdownMenuSeparator key={index} />;
            }

            return (
                <DropdownMenuGroup key={item.id ?? index}>
                    {item.title && <DropdownMenuLabel>{item.title}</DropdownMenuLabel>}
                    <MenuItems owner={owner} items={item.items} closeMenu={closeMenu} />
                </DropdownMenuGroup>
            );
        }

        if (item.items) {
            return (
                <DropdownMenuSub key={item.id ?? index}>
                    <DropdownMenuSubTrigger disabled={item.disabled} data-variant={item.variant}>
                        <MenuItemContent item={item} />
                    </DropdownMenuSubTrigger>
                    <MenuSurface owner={owner} items={item.items} closeMenu={closeMenu} nested />
                </DropdownMenuSub>
            );
        }

        return <MenuAction key={item.id ?? index} item={item} closeMenu={closeMenu} />;
    });
}

/** Preserves real link semantics and locks asynchronous actions until they settle. */
function MenuAction({ item, closeMenu }: { item: ActionMenuItemData; closeMenu: () => void }) {
    const navigation = useContext(LinkNavigationContext);
    const inFlight = useRef(false);
    const [pending, startTransition] = useTransition();
    const disabled = item.disabled || pending;

    // Modified link clicks belong to the browser, not the action or navigation delegate.
    function activate(event: MouseEvent) {
        if (item.disabled || inFlight.current) {
            event.preventDefault();

            return;
        }

        if (item.href && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) {
            return;
        }

        // Dialog state and navigation remain urgent even while another action is pending.
        try {
            const result = item.onClick?.(event);

            if (item.href && navigation && !event.defaultPrevented) {
                event.preventDefault();
                navigation.navigate(item.href, item.target === '_blank');
            }

            if (!result) return;

            // Only promise-returning actions need transition loading and duplicate suppression.
            inFlight.current = true;
            startTransition(async () => {
                try {
                    await result;
                } catch (error) {
                    if (!(error instanceof ReportedError)) throw error;
                } finally {
                    inFlight.current = false;
                }
            });
        } catch (error) {
            if (!(error instanceof ReportedError)) throw error;
        }
    }

    return (
        <DropdownMenuItem
            disabled={disabled}
            aria-busy={pending || undefined}
            variant={item.variant}
            closeOnClick={item.closeOnClick ?? true}
            render={
                item.href ? (
                    <a
                        href={disabled ? undefined : item.href}
                        target={item.target}
                        rel={item.target === '_blank' ? `${item.rel ?? ''} noopener noreferrer`.trim() : item.rel}
                        draggable={false}
                    />
                ) : undefined
            }
            onClick={activate}
            onAuxClick={(event) => {
                if (disabled) {
                    event.preventDefault();

                    return;
                }

                if (item.href && event.button === 1 && (item.closeOnClick ?? true)) closeMenu();
            }}
        >
            <MenuItemContent item={item} pending={pending} />
        </DropdownMenuItem>
    );
}

/** Gives every action and submenu the same icon, description, and trailing content layout. */
function MenuItemContent({ item, pending = false }: { item: ActionMenuItemData; pending?: boolean }) {
    return (
        <>
            {pending ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : isValidElement(item.icon) ? (
                item.icon
            ) : (
                item.icon && <Icon icon={item.icon} size="sm" />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
                <span>{item.label}</span>
                {item.description != null && (
                    <span className={item.variant === 'destructive' ? 'text-xs' : 'text-xs text-muted-foreground'}>
                        {item.description}
                    </span>
                )}
            </span>
            {item.endContent}
            {pending && (
                <span role="status" className="sr-only">
                    Loading
                </span>
            )}
        </>
    );
}
