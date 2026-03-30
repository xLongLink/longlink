"""
This folder contains the database provider adapters

PostgreSQL (psycopg2)
MySQL
MariaDB

Amazon Web Services → RDS / Aurora
Google → Cloud SQL
Microsoft → Azure Database
Oracle → Oracle Cloud Database

An app shall also be deployed with a direct database url string.
"""

from src.databases.__root__ import Database
from src.databases.postgresql import PostgreSQL

__all__ = ['Database', 'PostgreSQL']
