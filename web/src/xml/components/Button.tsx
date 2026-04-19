import { Button as UIButton } from '@/ui/button';

import type { ActionComponentProps } from '../types';

type XMLButtonProps = Omit<Parameters<typeof UIButton>[0], keyof ActionComponentProps> &
    Partial<ActionComponentProps> & {
        _baseUrl?: string;
    };

/**
 * XML button adapter that maps action-layer props to DOM-safe button props.
 */
function Button({ action, pending = false, _baseUrl: _unusedBaseUrl, onClick, disabled, ...props }: XMLButtonProps) {
    const handleClick = (event: Parameters<NonNullable<typeof onClick>>[0]) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
            void action?.(event as any);
        }
    };

    return <UIButton {...props} onClick={handleClick} disabled={Boolean(disabled) || pending} />;
}

export { Button };
export default Button;
