from urllib.parse import urlparse


def normalize(url: str) -> str:
    """Normalize an app URL by ensuring it has a scheme and no trailing slash."""
    
    cleaned_url = url.strip().rstrip('/')
    if cleaned_url == '':
        raise ValueError('App URL is required')

    parsed = urlparse(cleaned_url)
    if parsed.scheme == '':
        cleaned_url = f'http://{cleaned_url}'
        parsed = urlparse(cleaned_url)

    if parsed.netloc == '':
        raise ValueError('Invalid app URL')

    return cleaned_url
