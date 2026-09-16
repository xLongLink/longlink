from pydantic import TypeAdapter
from longlink.shared.models import Email

EMAIL_ADAPTER: TypeAdapter[Email] = TypeAdapter(Email)
