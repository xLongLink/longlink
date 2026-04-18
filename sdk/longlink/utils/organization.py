from pydantic import BaseModel


class Organization(BaseModel):
    ORG_NAME: str = ''
    ORG_NAME_LEGAL: str = ''
    ORG_TAX_ID: str = ''
    ORG_PHONE: str = ''
    ORG_MAIL_CONTACT: str = ''
    ORG_MAIL_SUPPORT: str = ''
    ORG_WEBSITE: str = ''
    ORG_ADDRESS: str = ''
