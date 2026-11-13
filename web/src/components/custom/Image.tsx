import { Text } from './Text';
import { useState } from 'react';
import { usePreview } from './preview';
import { ImageIcon } from 'lucide-react';

type ImageProps = {
    /** Scoped Solution image path, or an image data/blob URL. */
    src: string;
    /** Accessible description of the photo. */
    alt: string;
};

/** Displays a full-width, landscape photo through the isolated runtime's image capability. */
export function Image(props: ImageProps) {
    // Give each source its own loading state and object-URL lifecycle.
    return <ImageContent key={props.src} {...props} />;
}

/** Owns one scoped image request and releases its blob URL when unmounted. */
function ImageContent({ src, alt }: ImageProps) {
    const inline = src.startsWith('data:image/') || src.startsWith('blob:');
    const preview = usePreview(src, inline);
    const [erroredUrl, setErroredUrl] = useState<string>();

    // Reserve the same landscape frame for loading, errors, and the displayed photo.
    return (
        <div className="view-image">
            {preview.status === 'error' || preview.status === 'unsupported' ? (
                <Text type="supporting">Photo unavailable</Text>
            ) : (
                <div className="view-image-content" role="group" aria-label={alt}>
                    {preview.status === 'loading' ? (
                        <div className="view-image-skeleton" aria-hidden="true" />
                    ) : erroredUrl === preview.url ? (
                        <div className="view-image-placeholder">
                            <ImageIcon size={24} aria-hidden="true" />
                        </div>
                    ) : (
                        <>
                            <img
                                src={preview.url}
                                alt={alt}
                                role={!alt ? 'presentation' : undefined}
                                aria-hidden={!alt || undefined}
                                onError={() => setErroredUrl(preview.url)}
                            />
                            <div className="view-image-border" aria-hidden="true" />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
