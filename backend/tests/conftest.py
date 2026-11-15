import sys
import asyncio
import pytest

@pytest.fixture(scope="session", autouse=True)
def setup_windows_event_loop():
    """
    On Windows Python 3.11, default ProactorEventLoop has known teardown issues with
    Starlette TestClient and AnyIO (AttributeError: 'ProactorEventLoop' object has no attribute '_ssock').
    Using WindowsSelectorEventLoopPolicy eliminates this unraisable exception during test teardown.
    """
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    yield

