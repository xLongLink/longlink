"""
This folder contains the database provider adapters. 
If a superuser is added to the LongLink control plane, 
when a new app is created, a new database will be created for that app.
A database adapter is implemented for each database that support superuser access: 
- PostgreSQL
- TODO: MySQL Adapter
- TODO: Oracle Adapter
- TODO: PostgreSQL Adapter
- TODO: MariaDB Adapter

An app can also be deployed with a direct database url string.
"""

from src.databases.__root__ import Database
from src.databases.postgresql import PostgreSQL

__all__ = ['Database', 'PostgreSQL']
