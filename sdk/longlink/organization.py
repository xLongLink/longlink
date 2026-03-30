from pydantic import BaseModel


class OrganizationSettings(BaseModel):
    organization_name: str = ''
    legal_name: str = ''
    registration_tax_id: str = ''
    phone_number: str = ''
    primary_contact_email: str = ''
    support_email: str = ''
    website: str = ''
    physical_address: str = ''
