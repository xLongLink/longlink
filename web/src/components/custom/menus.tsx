import { useMenuTouch } from './menu-touch';
import { ReportedError } from '@/lib/reported';
import { Toolbar } from '@base-ui/react/toolbar';
import { Icon, type StoneIconName } from './Icon';
import { Button as Control } from '@/components/shadcn/button';
import { ChevronDown, Ellipsis, LoaderCircle } from 'lucide-react';
import { ButtonGroupContext, ControlSizeContext, LinkNavigationContext } from './contexts';
import {
    isValidElement,
    useContext,
    useId,
    useRef,
    useState,
    useTransition,
    type MouseEvent,
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
    icon?: StoneIconName;
    description?: ReactNode;
    endContent?: ReactNode;
    isDisabled?: boolean;
    variant?: 'default' | 'destructive';
    hasCloseOnSelect?: boolean;
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

export type NativeMenuItem = Omit<ActionMenuItemData, 'icon' | 'items'> & {
    icon?: StoneIconName | ReactElement;
    items?: NativeMenuOption[];
};

export type NativeMenuOption =
    | NativeMenuItem
    | { type: 'divider' }
    | { type: 'section'; id?: string; title?: string; items: NativeMenuItem[] };

/** Shares menu behavior without exposing primitive props to isolated Views. */
export function MenuControl({
    items,
    label,
    variant = 'secondary',
    size: requestedSize,
    isDisabled = false,
    icon,
    iconOnly = false,
    isMenuOpen,
    onOpenChange,
    alignment = 'start'
}: {
    items: NativeMenuOption[];
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    isDisabled?: boolean;
    icon?: StoneIconName;
    iconOnly?: boolean;
    isMenuOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    alignment?: 'start' | 'center' | 'end';
}) {
    const group = useContext(ButtonGroupContext);
    const owner = useId();
    const inheritedSize = useContext(ControlSizeContext);
    const size = requestedSize ?? inheritedSize ?? 'md';
    const disabled = isDisabled || (group?.isDisabled ?? false);
    const [internalOpen, setInternalOpen] = useState(false);
    const open = isMenuOpen ?? internalOpen;

    // Controlled callers retain ownership; uncontrolled menus report the same transitions.
    function changeOpen(nextOpen: boolean) {
        if (isMenuOpen === undefined) setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
    }

    const touch = useMenuTouch(owner, open, disabled, changeOpen);

    const trigger = (
        <DropdownMenuTrigger
            {...touch}
            className="touch-none"
            data-menu-trigger=""
            disabled={disabled}
            aria-label={iconOnly ? label : undefined}
            render={
                <Control
                    variant={variant === 'primary' ? 'default' : variant === 'secondary' ? 'outline' : variant}
                    size={iconOnly ? (size === 'md' ? 'icon' : `icon-${size}`) : size === 'md' ? 'default' : size}
                    data-variant={variant}
                    data-size={size}
                    data-icon-only={iconOnly || undefined}
                    focusableWhenDisabled
                />
            }
        >
            {iconOnly ? (
                icon ? (
                    <Icon icon={icon} size={size} />
                ) : (
                    <Ellipsis aria-hidden="true" />
                )
            ) : (
                <>
                    <span className="view-action-label">{label}</span>
                    <ChevronDown className="ml-auto size-4 shrink-0" aria-hidden="true" />
                </>
            )}
        </DropdownMenuTrigger>
    );

    // Only the trigger participates in its surrounding control group.
    return (
        <DropdownMenu open={open} onOpenChange={changeOpen}>
            {group ? (
                <Toolbar.Button disabled={disabled} focusableWhenDisabled={group.isDisabled} render={trigger} />
            ) : (
                trigger
            )}
            <MenuSurface owner={owner} items={items} alignment={alignment} closeMenu={() => changeOpen(false)} />
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
    items: NativeMenuOption[];
    closeMenu: () => void;
    nested?: boolean;
    alignment?: 'start' | 'center' | 'end';
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
function MenuItems({ owner, items, closeMenu }: { owner: string; items: NativeMenuOption[]; closeMenu: () => void }) {
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
                    <DropdownMenuSubTrigger disabled={item.isDisabled} data-variant={item.variant}>
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
function MenuAction({ item, closeMenu }: { item: NativeMenuItem; closeMenu: () => void }) {
    const navigation = useContext(LinkNavigationContext);
    const inFlight = useRef(false);
    const [pending, startTransition] = useTransition();
    const disabled = item.isDisabled || pending;

    // Modified link clicks belong to the browser, not the action or navigation delegate.
    function activate(event: MouseEvent) {
        if (item.isDisabled || inFlight.current) {
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
            closeOnClick={item.hasCloseOnSelect ?? true}
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

                if (item.href && event.button === 1 && (item.hasCloseOnSelect ?? true)) closeMenu();
            }}
        >
            <MenuItemContent item={item} pending={pending} />
        </DropdownMenuItem>
    );
}

/** Gives every action and submenu the same icon, description, and trailing content layout. */
function MenuItemContent({ item, pending = false }: { item: NativeMenuItem; pending?: boolean }) {
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
