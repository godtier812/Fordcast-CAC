"""Run the immediate, in-memory replay pipeline without opening an event-loop socket.

Offline providers and stores must complete without yielding I/O. This deliberately
rejects timers, futures, and network providers; live service execution uses asyncio.
"""

from collections.abc import Coroutine
from typing import Any


def run_offline[T](work: Coroutine[Any, Any, T]) -> T:
    try:
        pending = work.send(None)
    except StopIteration as finished:
        return finished.value
    work.close()
    raise RuntimeError(f"Offline replay attempted asynchronous I/O: {type(pending).__name__}")
