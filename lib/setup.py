from pathlib import Path
from setuptools import setup, find_packages

README = Path(__file__).with_name("README.md").read_text(encoding="utf-8")

setup(
    name="longlink",
    use_scm_version={
        "version_scheme": "guess-next-dev",
        "local_scheme": "no-local-version",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    include_package_data=True,
    description="LonkLink SDK",
    long_description=README,
    long_description_content_type="text/markdown",
    author="Sau1707",
    author_email="info@lonklink.ch",
    url="https://github.com/XLongLink/lonklink-sdk",
    python_requires=">=3.12",
    install_requires=[
        "fastapi",
    ],
)