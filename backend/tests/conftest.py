import sys
import asyncio
import pytest

# LangChain/LangGraph compatibility patch for Python 3.11 with langchain-core
try:
    import langchain
    if not hasattr(langchain, "debug"):
        langchain.debug = False
    if not hasattr(langchain, "verbose"):
        langchain.verbose = False
    if not hasattr(langchain, "llm_cache"):
        langchain.llm_cache = None
except ImportError:
    pass

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


