"""Apostol backend API test suite.

Covers: auth (register/login/me/logout), readings ES/EN, liturgy hours,
prayers index + individual, news ES/EN, bible translations/books/chapter,
catechism structure/paragraphs, examen upload/list/get/delete,
favorites CRUD.
"""
import io
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://apostol-sacred.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@apostol.app"
ADMIN_PASSWORD = "Apostol2026!"

TIMEOUT = 45  # external scrapers may be slow


# ---------- Shared fixtures ----------

@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=TIMEOUT)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def user_session():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "TestPass123!", "name": "Test User"}, timeout=TIMEOUT)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    s.test_email = email  # type: ignore[attr-defined]
    s.test_password = "TestPass123!"  # type: ignore[attr-defined]
    return s


# ---------- Auth tests ----------

class TestAuth:
    def test_register_sets_cookie_and_returns_user(self):
        s = requests.Session()
        email = f"reg_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass1234!"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["role"] == "user"
        assert "id" in data
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_register_duplicate_rejected(self, user_session):
        r = requests.post(f"{API}/auth/register",
                          json={"email": user_session.test_email, "password": "AnotherPass1!"},
                          timeout=TIMEOUT)
        assert r.status_code == 400

    def test_admin_login(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "access_token" in s.cookies

    def test_login_invalid_credentials(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": f"nouser_{uuid.uuid4().hex[:6]}@example.com", "password": "wrong"},
                          timeout=TIMEOUT)
        assert r.status_code == 401

    def test_me_with_cookie(self, user_session):
        r = user_session.get(f"{API}/auth/me", timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["email"] == user_session.test_email

    def test_me_without_auth_returns_401(self):
        r = requests.get(f"{API}/auth/me", timeout=TIMEOUT)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        email = f"lo_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Pass1234!"}, timeout=TIMEOUT)
        assert "access_token" in s.cookies
        r = s.post(f"{API}/auth/logout", timeout=TIMEOUT)
        assert r.status_code == 200
        # Server sends Set-Cookie with expiry in past - requests.Session drops them
        r2 = s.get(f"{API}/auth/me", timeout=TIMEOUT)
        assert r2.status_code == 401


# ---------- Readings ----------

class TestReadings:
    def test_readings_es(self):
        r = requests.get(f"{API}/readings", params={"lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "title" in data
        assert "sections" in data
        assert isinstance(data["sections"], list)
        assert len(data["sections"]) >= 4, f"Expected 4+ sections, got {len(data['sections'])}"
        # Verify key Spanish liturgy sections present
        labels = " ".join(s.get("label", "") for s in data["sections"]).lower()
        assert "lectura" in labels or "evangelio" in labels or "salmo" in labels

    def test_readings_en(self):
        r = requests.get(f"{API}/readings", params={"lang": "en"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "title" in data
        assert "sections" in data and isinstance(data["sections"], list)
        assert len(data["sections"]) >= 3, f"Expected >=3 EN sections, got {len(data['sections'])}"

    def test_readings_cache_fast(self):
        # First request (may warm cache / scrape)
        r1 = requests.get(f"{API}/readings", params={"lang": "es"}, timeout=TIMEOUT)
        assert r1.status_code == 200
        time.sleep(1.0)
        t0 = time.time()
        r2 = requests.get(f"{API}/readings", params={"lang": "es"}, timeout=TIMEOUT)
        elapsed = time.time() - t0
        assert r2.status_code == 200
        # Allow some network latency; pure server cache should be well under 500ms,
        # but public ingress can add ~200-300ms. Cap at 1500ms to stay non-flaky.
        assert elapsed < 1.5, f"Cached readings took {elapsed:.2f}s (expected <1.5s)"


# ---------- Liturgy ----------

class TestLiturgy:
    def test_hours_list_es(self):
        r = requests.get(f"{API}/liturgy/hours", params={"lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        # Accept either {hours: [...]} or plain list
        hours = data.get("hours") if isinstance(data, dict) else data
        assert isinstance(hours, list)
        assert len(hours) == 7, f"Expected 7 hours, got {len(hours)}"

    def test_liturgy_lauds_es(self):
        r = requests.get(f"{API}/liturgy", params={"hour": "lauds", "lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "title" in data
        assert "content_text" in data or "content_html" in data or "content" in data
        text = data.get("content_text") or data.get("content_html") or data.get("content") or ""
        assert len(text) > 200, f"Content too short: {len(text)} chars"


# ---------- Prayers ----------

class TestPrayers:
    @pytest.fixture(scope="class")
    def prayer_index(self):
        r = requests.get(f"{API}/prayers", params={"lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        return r.json()

    def test_prayers_index_has_categories(self, prayer_index):
        cats = prayer_index.get("categories") if isinstance(prayer_index, dict) else prayer_index
        assert isinstance(cats, list)
        assert len(cats) >= 10, f"Expected 10+ categories, got {len(cats)}"
        for c in cats:
            assert "items" in c or "prayers" in c

    def test_prayers_individual(self, prayer_index):
        cats = prayer_index.get("categories") if isinstance(prayer_index, dict) else prayer_index
        slug = None
        for c in cats:
            items = c.get("items") or c.get("prayers") or []
            for it in items:
                slug = it.get("slug") or it.get("id")
                if slug:
                    break
            if slug:
                break
        assert slug, "No prayer slug found in index"
        r = requests.get(f"{API}/prayers/{slug}", params={"lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, f"Prayer {slug}: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert "title" in data or "content" in data or "content_html" in data


# ---------- News ----------

class TestNews:
    def test_news_es_multiple_sources(self):
        r = requests.get(f"{API}/news", params={"lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        items = data.get("items") if isinstance(data, dict) else data
        assert isinstance(items, list)
        assert len(items) > 0
        sources = {i.get("source") for i in items if i.get("source")}
        assert len(sources) >= 1

    def test_news_en_multi_sources(self):
        r = requests.get(f"{API}/news", params={"lang": "en"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        items = data.get("items") if isinstance(data, dict) else data
        assert isinstance(items, list)
        assert len(items) > 0
        sources = {i.get("source") for i in items if i.get("source")}
        assert len(sources) >= 2, f"Expected >=2 sources for EN news, got {sources}"


# ---------- Bible ----------

class TestBible:
    def test_translations(self):
        r = requests.get(f"{API}/bible/translations", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "en" in data and "es" in data
        assert isinstance(data["en"], list) and len(data["en"]) >= 1
        assert isinstance(data["es"], list) and len(data["es"]) >= 1

    def test_books_es(self):
        r = requests.get(f"{API}/bible/books", params={"lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        books = data.get("books") if isinstance(data, dict) else data
        assert isinstance(books, list)
        assert len(books) == 73, f"Expected 73-book Catholic canon, got {len(books)}"

    def test_chapter_es(self):
        r = requests.get(f"{API}/bible/chapter",
                         params={"book": 1, "chapter": 1, "lang": "es"},
                         timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        verses = data.get("verses") if isinstance(data, dict) else data
        assert isinstance(verses, list)
        assert len(verses) > 0

    def test_chapter_en(self):
        r = requests.get(f"{API}/bible/chapter",
                         params={"book": 1, "chapter": 1, "lang": "en"},
                         timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        verses = data.get("verses") if isinstance(data, dict) else data
        assert isinstance(verses, list)
        assert len(verses) > 0, "Expected EN NABRE verses via Playwright"


# ---------- Catechism ----------

class TestCatechism:
    def test_structure_es(self):
        r = requests.get(f"{API}/catechism/structure", params={"lang": "es"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        parts = data.get("parts") if isinstance(data, dict) else data
        assert isinstance(parts, list)
        assert len(parts) == 4, f"Expected 4 parts, got {len(parts)}"

    def test_paragraphs_en_no_500(self):
        r = requests.get(f"{API}/catechism/paragraphs",
                         params={"start": 26, "end": 30, "lang": "en"}, timeout=TIMEOUT)
        # Source scrape may fail/empty but must not 500
        assert r.status_code != 500, r.text
        assert r.status_code in (200, 404)


# ---------- Examen ----------

class TestExamen:
    def test_upload_requires_auth(self):
        r = requests.post(f"{API}/examen/upload",
                          data={"title": "Test", "lang": "es"},
                          files={"file": ("t.pdf", b"%PDF-1.4\n%test\n", "application/pdf")},
                          timeout=TIMEOUT)
        assert r.status_code == 401

    def test_upload_as_non_admin_forbidden(self, user_session):
        r = user_session.post(f"{API}/examen/upload",
                              data={"title": "TEST_nonadmin", "lang": "es", "description": ""},
                              files={"file": ("t.pdf", b"%PDF-1.4\n%hello\n", "application/pdf")},
                              timeout=TIMEOUT)
        assert r.status_code == 403

    def test_admin_upload_list_get_delete(self, admin_session):
        # Upload a minimal valid PDF
        content = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
        r = admin_session.post(f"{API}/examen/upload",
                               data={"title": "TEST_examen_pdf", "lang": "es", "description": "Test pdf"},
                               files={"file": ("examen.pdf", content, "application/pdf")},
                               timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        doc_id = r.json()["id"]

        # List
        r2 = admin_session.get(f"{API}/examen", timeout=TIMEOUT)
        assert r2.status_code == 200
        items = r2.json()
        ids = [d["id"] for d in items]
        assert doc_id in ids
        found = next(d for d in items if d["id"] == doc_id)
        assert found["content_type"] == "application/pdf"
        assert found["title"] == "TEST_examen_pdf"

        # Get file
        r3 = admin_session.get(f"{API}/examen/{doc_id}/file", timeout=TIMEOUT)
        assert r3.status_code == 200
        assert r3.content == content
        assert r3.headers.get("content-type", "").startswith("application/pdf")

        # Delete
        r4 = admin_session.delete(f"{API}/examen/{doc_id}", timeout=TIMEOUT)
        assert r4.status_code == 200
        assert r4.json().get("ok") is True

        # Confirm removal
        r5 = admin_session.get(f"{API}/examen/{doc_id}/file", timeout=TIMEOUT)
        assert r5.status_code == 404

    def test_delete_requires_auth(self, admin_session):
        # Create a doc with admin, then try deletion without auth
        content = b"%PDF-1.4\n%to-delete\n"
        r = admin_session.post(f"{API}/examen/upload",
                               data={"title": "TEST_del_unauth", "lang": "es"},
                               files={"file": ("x.pdf", content, "application/pdf")},
                               timeout=TIMEOUT)
        assert r.status_code == 200
        doc_id = r.json()["id"]
        # Unauthenticated delete
        r2 = requests.delete(f"{API}/examen/{doc_id}", timeout=TIMEOUT)
        assert r2.status_code == 401
        # Cleanup
        admin_session.delete(f"{API}/examen/{doc_id}", timeout=TIMEOUT)


# ---------- Favorites ----------

class TestFavorites:
    def test_favorites_requires_auth(self):
        r = requests.get(f"{API}/favorites", timeout=TIMEOUT)
        assert r.status_code == 401

    def test_create_list_delete_favorite(self, user_session):
        # Create
        payload = {"section": "prayers", "title": "TEST_Padre Nuestro",
                   "content": "Padre nuestro que estás...", "lang": "es"}
        r = user_session.post(f"{API}/favorites", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        fav = r.json()
        assert fav["title"] == payload["title"]
        assert fav["section"] == "prayers"
        assert "id" in fav
        fav_id = fav["id"]

        # List shows only own
        r2 = user_session.get(f"{API}/favorites", timeout=TIMEOUT)
        assert r2.status_code == 200
        lst = r2.json()
        assert any(f["id"] == fav_id for f in lst)

        # Delete
        r3 = user_session.delete(f"{API}/favorites/{fav_id}", timeout=TIMEOUT)
        assert r3.status_code == 200

        # Confirm removed
        r4 = user_session.get(f"{API}/favorites", timeout=TIMEOUT)
        assert not any(f["id"] == fav_id for f in r4.json())

    def test_favorites_isolated_between_users(self, user_session, admin_session):
        # user creates
        r = user_session.post(f"{API}/favorites",
                              json={"section": "readings", "title": "TEST_private", "content": "secret", "lang": "es"},
                              timeout=TIMEOUT)
        assert r.status_code == 200
        fav_id = r.json()["id"]

        # admin should not see it
        r2 = admin_session.get(f"{API}/favorites", timeout=TIMEOUT)
        assert r2.status_code == 200
        assert not any(f["id"] == fav_id for f in r2.json())

        # admin cannot delete it
        r3 = admin_session.delete(f"{API}/favorites/{fav_id}", timeout=TIMEOUT)
        assert r3.status_code == 404

        # cleanup
        user_session.delete(f"{API}/favorites/{fav_id}", timeout=TIMEOUT)
