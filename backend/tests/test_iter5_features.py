"""Backend tests for Iteration 5 enhancements.

Coverage:
- PEM textarea persistence (ayolinx private_key_pem / public_key_pem) + masking
- mode dropdown persistence (ayolinx sandbox/production, digiflazz development/production)
- Empty PUT reverts source to 'env'
- Test-connection after PEM saved (refresh_from_db should consume DB PEM)
- clone-new with auto-generated SVG logo (no assets.logo provided)
- quantumdrop site still exists (logo + site-configs row)
"""
import os
import shutil
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://store-variant-test.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "admin@voucherverse.com"
ADMIN_PASS = "admin123"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

SITES_ROOT = Path("/app/sites")
THEMES_ROOT = Path("/app/themes")

DEMO_SITE_ID = "demoauto"
DEMO_PREFIX = "DMO"

DUMMY_PRIVATE_PEM = (
    "-----BEGIN PRIVATE KEY-----\n"
    "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDtest_dummy_key_for_testing_only_NOT_REAL\n"
    "-----END PRIVATE KEY-----"
)
DUMMY_PUBLIC_PEM = (
    "-----BEGIN PUBLIC KEY-----\n"
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest_dummy_pubkey_for_testing_only\n"
    "-----END PUBLIC KEY-----"
)


# ---------- Fixtures ----------

@pytest.fixture(scope="session")
def admin_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json()["token"]
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    return client[DB_NAME]


def _clear_integration(headers, service):
    """Clear DB override for service (revert to env)."""
    requests.put(
        f"{BASE_URL}/api/admin/integrations/{service}",
        headers=headers, json={"config": {}}, timeout=15,
    )


@pytest.fixture()
def cleanup_integrations(admin_headers):
    yield
    _clear_integration(admin_headers, "ayolinx")
    _clear_integration(admin_headers, "digiflazz")


def _cleanup_demoauto(mongo_db):
    shutil.rmtree(SITES_ROOT / DEMO_SITE_ID, ignore_errors=True)
    try:
        (THEMES_ROOT / f"{DEMO_SITE_ID}.json").unlink(missing_ok=True)
    except Exception:
        pass
    try:
        mongo_db.site_configs.delete_many({"site_id": DEMO_SITE_ID})
    except Exception:
        pass


@pytest.fixture()
def cleanup_demoauto(mongo_db):
    yield
    _cleanup_demoauto(mongo_db)


# ---------- PEM textarea persistence ----------

class TestAyolinxPEMPersistence:
    def test_put_pem_and_get_masked(self, admin_headers, cleanup_integrations):
        # 1) PUT PEM + mode + key/secret
        r = requests.put(
            f"{BASE_URL}/api/admin/integrations/ayolinx",
            headers=admin_headers,
            json={"config": {
                "private_key_pem": DUMMY_PRIVATE_PEM,
                "public_key_pem": DUMMY_PUBLIC_PEM,
                "mode": "sandbox",
                "client_key": "TKEY",
                "client_secret": "TSEC",
            }},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        saved = set(data["saved_keys"])
        assert {"private_key_pem", "public_key_pem", "mode", "client_key", "client_secret"} <= saved

        # 2) GET — masking & source
        g = requests.get(f"{BASE_URL}/api/admin/integrations", headers=admin_headers, timeout=15)
        assert g.status_code == 200
        ayolinx = g.json()["settings"]["ayolinx"]
        vals = ayolinx["values"]
        src = ayolinx["source"]

        # private_key_pem must be masked (contains bullet or truncated, not full PEM)
        pk_masked = vals["private_key_pem"]
        assert pk_masked, "private_key_pem missing in values"
        assert "BEGIN PRIVATE KEY" not in pk_masked or "•" in pk_masked, \
            f"private_key_pem not masked: {pk_masked!r}"
        assert "•" in pk_masked, f"expected bullet mask in private_key_pem, got {pk_masked!r}"

        # source must be 'db' for the saved keys
        assert src["private_key_pem"] == "db", src
        assert src["public_key_pem"] == "db", src
        assert src["mode"] == "db", src
        assert src["client_key"] == "db", src

        # mode value should be readable plain text
        assert vals["mode"] == "sandbox"

    def test_empty_put_reverts_to_env(self, admin_headers, cleanup_integrations):
        # Save first, then clear
        requests.put(
            f"{BASE_URL}/api/admin/integrations/ayolinx",
            headers=admin_headers,
            json={"config": {"client_key": "PRESET", "mode": "production"}},
            timeout=15,
        )
        r = requests.put(
            f"{BASE_URL}/api/admin/integrations/ayolinx",
            headers=admin_headers, json={"config": {}}, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True

        g = requests.get(f"{BASE_URL}/api/admin/integrations", headers=admin_headers, timeout=15)
        ayolinx = g.json()["settings"]["ayolinx"]
        src = ayolinx["source"]
        # All sources should be 'env' (since DB is empty)
        for key in ("client_key", "client_secret", "private_key_pem", "public_key_pem", "mode"):
            assert src[key] == "env", f"{key} source={src[key]} expected env after empty PUT"


# ---------- DigiFlazz mode dropdown ----------

class TestDigiflazzMode:
    def test_put_mode_production_persists(self, admin_headers, cleanup_integrations):
        r = requests.put(
            f"{BASE_URL}/api/admin/integrations/digiflazz",
            headers=admin_headers,
            json={"config": {
                "mode": "production",
                "username": "testuser",
                "api_key": "testkey",
            }},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        g = requests.get(f"{BASE_URL}/api/admin/integrations", headers=admin_headers, timeout=15)
        df = g.json()["settings"]["digiflazz"]
        assert df["values"]["mode"] == "production"
        assert df["source"]["mode"] == "db"
        assert df["source"]["username"] == "db"
        assert df["source"]["api_key"] == "db"


# ---------- Test-connection with PEM in DB ----------

class TestConnectionWithPEM:
    def test_ayolinx_refresh_consumes_db_pem(self, admin_headers, cleanup_integrations):
        # Set PEM + creds in DB
        requests.put(
            f"{BASE_URL}/api/admin/integrations/ayolinx",
            headers=admin_headers,
            json={"config": {
                "private_key_pem": DUMMY_PRIVATE_PEM,
                "public_key_pem": DUMMY_PUBLIC_PEM,
                "mode": "sandbox",
                "client_key": "TKEY",
                "client_secret": "TSEC",
            }},
            timeout=15,
        )
        # Trigger test-connection. We don't assert ok=True (creds are dummy),
        # but the endpoint must respond 200 with the standard shape and not crash
        # on PEM loading.
        r = requests.post(
            f"{BASE_URL}/api/admin/integrations/ayolinx/test",
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "ok" in body and isinstance(body["ok"], bool)
        assert "details" in body
        # If details exposes private_key_loaded, it must reflect that PEM was used
        pkl = body.get("details", {}).get("private_key_loaded")
        if pkl is not None:
            assert pkl is True, f"private_key_loaded expected truthy when PEM in DB, got {pkl}"


# ---------- Clone-new with auto-generated logo ----------

class TestCloneNewWithLogo:
    def test_clone_new_generates_svg_logo_and_patches_theme(self, admin_headers, mongo_db, cleanup_demoauto):
        # Pre-clean
        _cleanup_demoauto(mongo_db)

        theme = {
            "siteId": DEMO_SITE_ID,
            "orderPrefix": DEMO_PREFIX,
            "brand": {"name": "DemoAuto"},
            "meta": {"themeColor": "#3b82f6"},
            "assets": {"heroBg": "https://example.com/x.jpg"},  # NO 'logo' key
            "copy": {"hero": {"titleLine1": "X", "titleLine2": "Y"}, "features": [], "cta": {}},
            "colors": {
                "primary": "#3b82f6",
                "secondary": "#ffffff",
                "accent": "#fbbf24",
                "background": "#0a0a0a",
                "card": "#111111",
                "border": "#222222",
                "foreground": "#ffffff",
                "destructive": "#ef4444",
            },
            "fonts": {"body": "Inter", "heading": "Inter"},
            "style": {"heroVisual": "controller-orb"},
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/sites/clone-new",
            headers=admin_headers, json={"theme": theme}, timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True, f"clone non-ok: {data}"
        assert data.get("logo_path"), f"logo_path should be returned, got {data}"

        # File system: SVG logo must exist
        svg_path = SITES_ROOT / DEMO_SITE_ID / "public" / f"logo-{DEMO_SITE_ID}.svg"
        assert svg_path.exists(), f"Logo SVG not generated at {svg_path}"
        svg_content = svg_path.read_text()
        assert "<svg" in svg_content
        # New design: full brand name as wordmark (DEMOAUTO uppercase since <=12 chars)
        assert ">DEMOAUTO</text>" in svg_content or "DEMOAUTO" in svg_content, \
            "Expected brand wordmark 'DEMOAUTO' rendered in SVG"

        # theme.config.js must include the logo path
        cfg_js = SITES_ROOT / DEMO_SITE_ID / "src" / "theme.config.js"
        assert cfg_js.exists(), "theme.config.js missing"
        cfg_text = cfg_js.read_text()
        assert f"/logo-{DEMO_SITE_ID}.svg" in cfg_text, \
            f"theme.config.js should reference /logo-{DEMO_SITE_ID}.svg"

        # DB row created
        row = mongo_db.site_configs.find_one({"site_id": DEMO_SITE_ID})
        assert row is not None
        assert row["prefix"] == DEMO_PREFIX


# ---------- QuantumDrop preservation ----------

class TestQuantumdropPreserved:
    def test_logo_file_exists(self):
        p = SITES_ROOT / "quantumdrop" / "public" / "logo-quantumdrop.svg"
        assert p.exists(), f"QuantumDrop logo missing at {p}"
        assert "<svg" in p.read_text()

    def test_site_configs_includes_quantumdrop(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/site-configs", headers=admin_headers, timeout=15
        )
        assert r.status_code == 200
        items = r.json().get("items") or r.json().get("configs") or []
        sid_to_prefix = {c["site_id"]: c["prefix"] for c in items}
        assert "quantumdrop" in sid_to_prefix
        assert sid_to_prefix["quantumdrop"] == "QTM"


# ---------- Existing sites backfilled with logos ----------

class TestExistingSitesLogos:
    @pytest.mark.parametrize("site_id", ["neonforge", "pixelvault", "elitecharge", "raidstation"])
    def test_logo_present(self, site_id):
        p = SITES_ROOT / site_id / "public" / f"logo-{site_id}.svg"
        assert p.exists(), f"Backfilled logo missing for {site_id} at {p}"
        assert "<svg" in p.read_text()
