from src.router import router
from src.types.sample import FormSampleResponse


# A LongLink page takes a URL, with filders and stuff. If is not possible to show in a single page then the content is too complex
# Each POST request from the page shall automatically re-render the page. Given that we assume new data has come
@router.get('/sample/form', response_model=FormSampleResponse)
async def table():
    pass


@router.get('/sample/form', response_model=FormSampleResponse)
async def form():
    """Return an example form schema payload compatible with the ViaVai form renderer."""

    return FormSampleResponse(
        title='Bug report form',
        description='Sample form schema for creating a bug report.',
        components=[
            {
                'type': 'text',
                'name': 'title',
                'label': 'Bug Title',
                'description': 'Short summary of the issue.',
                'placeholder': 'Login button not working',
                'required': True,
                'default': '',
                'validate': {
                    'minLength': 5,
                    'maxLength': 32,
                },
                'error': 'Title must be between 5 and 32 characters.',
            },
            {
                'type': 'email',
                'name': 'reporterEmail',
                'label': 'Reporter email',
                'description': 'Email used for follow-up communication.',
                'placeholder': 'john@company.com',
                'required': True,
                'default': '',
                'error': 'Please provide a valid email address.',
            },
            {
                'type': 'textarea',
                'name': 'description',
                'label': 'Description',
                'description': 'Steps to reproduce and expected result.',
                'placeholder': 'Explain what happened...',
                'required': True,
                'default': '',
                'validate': {
                    'minLength': 20,
                    'maxLength': 250,
                },
                'error': 'Description must be between 20 and 250 characters.',
            },
        ],
    )
