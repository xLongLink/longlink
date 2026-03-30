from urllib.parse import urlparse


def normalize(url: str) -> str:
    """Normalize an app URL by ensuring it has a scheme and no trailing slash."""

    cleaned_url = url.strip().rstrip('/')
    if cleaned_url == '':
        raise ValueError('App URL is required')

    parsed = urlparse(cleaned_url)
    if parsed.scheme == '':
        local_hosts = {'localhost', '127.0.0.1', '::1'}
        host = cleaned_url.split('/', 1)[0].split(':', 1)[0].strip('[]').lower()
        default_scheme = 'http' if host in local_hosts else 'https'
        cleaned_url = f'{default_scheme}://{cleaned_url}'
        parsed = urlparse(cleaned_url)

    if parsed.netloc == '':
        raise ValueError('Invalid app URL')

    return cleaned_url
