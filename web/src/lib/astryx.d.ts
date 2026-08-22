import '@astryxdesign/core/TextInput';
import type { InputHTMLAttributes } from 'react';

declare module '@astryxdesign/core/TextInput' {
    // Astryx forwards input attributes that its current prop type omits.
    interface TextInputProps {
        autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete'];
    }
}
