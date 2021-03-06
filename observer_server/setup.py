from setuptools import setup

setup(
    name="Observer Server",
    version="0.1",
    author="Nathan Sollenberger",
    author_email="nathan@spacenate.com",
    url="https://github.com/spacenate/olark-observer",
    description="Relay Olark operator updates to an embedded system via USB.",
    license="MIT",
    packages=["observer_server"],
    include_package_data=True,
    install_requires=[
        "flask>=0.10",
        "flask-cors",
        "pyusb"
    ],
)
