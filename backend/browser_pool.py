"""Shared Playwright Chromium pool.

A single headless Chromium instance is launched at FastAPI startup and reused
across all scrapers (readings, bible, …). This avoids:

  * paying the 1–2 s browser-launch cost on every request,
  * duplicating the per-module lock / lifecycle,
  * first-request timeouts when the container has just restarted.

If the Chromium binary is missing (e.g. the pod was recreated and the
PLAYWRIGHT_BROWSERS_PATH cache was wiped), we invoke `playwright install
chromium` synchronously *before* the server starts accepting traffic — this
keeps the cold-start cost where it belongs (boot time) and guarantees the
first user-facing request has a ready browser.
"""
from __future__ import annotations

import asyncio
import logging
import os
import subprocess
from typing import Optional

from playwright.async_api import Browser, async_playwright

logger = logging.getLogger(__name__)

_browser: Optional[Browser] = None
_playwright = None
_lock = asyncio.Lock()


def _ensure_chromium_installed() -> None:
    """Make sure a Chromium build is available for Playwright.

    Checks the filesystem under PLAYWRIGHT_BROWSERS_PATH (or the default cache)
    and only runs `playwright install chromium` when no build is found. Safe
    to call from within the asyncio loop since it does not use sync_playwright.
    """
    browsers_dir = os.environ.get(
        "PLAYWRIGHT_BROWSERS_PATH",
        os.path.expanduser("~/.cache/ms-playwright"),
    )
    # Any chromium-* directory is enough — Playwright picks the newest.
    try:
        has_build = os.path.isdir(browsers_dir) and any(
            name.startswith("chromium-") for name in os.listdir(browsers_dir)
        )
    except OSError:
        has_build = False

    if has_build:
        logger.info("Playwright chromium present under %s", browsers_dir)
        return

    logger.warning(
        "Chromium not found under %s — installing (one-time, ~180 MB)…",
        browsers_dir,
    )
    try:
        subprocess.run(
            ["playwright", "install", "chromium"],
            check=True,
            timeout=300,
            env={**os.environ},
        )
        logger.info("Playwright chromium installed")
    except Exception as e:
        logger.error("playwright install chromium failed: %s", e)


async def start_browser() -> None:
    """Launch the shared Chromium instance. Safe to call multiple times."""
    global _browser, _playwright
    async with _lock:
        if _browser is not None and _browser.is_connected():
            return
        _ensure_chromium_installed()
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        )
        logger.info("Shared Playwright Chromium browser launched")


async def stop_browser() -> None:
    """Tear down the browser on shutdown."""
    global _browser, _playwright
    async with _lock:
        try:
            if _browser is not None:
                await _browser.close()
        except Exception:
            pass
        try:
            if _playwright is not None:
                await _playwright.stop()
        except Exception:
            pass
        _browser = None
        _playwright = None


async def get_browser() -> Browser:
    """Return the shared browser, launching lazily if startup didn't run."""
    global _browser
    if _browser is None or not _browser.is_connected():
        await start_browser()
    assert _browser is not None  # for type-checkers
    return _browser
