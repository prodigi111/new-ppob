# 🔧 PATCH: Fix Proxy Forwarding di `blazestore.id`

## Masalah
Function `_forward_ayolinx` di proxy `blazestore.id` hardcoded hanya forward prefix `VTX` ke `vortexgamers.cloud`. Prefix lain (RDS, BSS, NFG, PXL, EOC, QDP, AQR) langsung `return` tanpa forward.

## Solusi
Replace `_forward_ayolinx` agar membaca konfigurasi per-prefix dari MongoDB `site_configs`.

---

## LANGKAH 1: SSH ke proxy server `blazestore.id`

```bash
ssh user@blazestore.id
cd /path/to/blazestore-backend   # sesuaikan path
```

Cari file payment routes (biasanya):
```bash
sudo find / -name "payment.py" 2>/dev/null | grep -v venv | grep -v site-packages
```

## LANGKAH 2: Edit file `payment.py` di proxy

Buka file payment.py dan **HAPUS** block ini:

```python
# Ayolinx callback forward URLs (Vortex)
AYOLINX_FORWARD = {
    "qris": "https://vortexgamers.cloud/api/payment/callback/qris",
    "va": "https://vortexgamers.cloud/api/payment/callback/va",
}
```

**Ganti dengan:**

```python
# Legacy hardcoded fallback (untuk VTX bila DB tidak punya entry)
AYOLINX_FORWARD = {
    "qris": "https://vortexgamers.cloud/api/payment/callback/qris",
    "va":   "https://vortexgamers.cloud/api/payment/callback/va",
    "notify": "https://vortexgamers.cloud/api/payment/callback/notify",
    "link":   "https://vortexgamers.cloud/api/payment/callback/link",
}
```

Lalu **HAPUS SELURUH** function `_forward_ayolinx` lama (yang hanya cek `VTX`).

**Ganti dengan versi dinamis di bawah ini:**

```python
async def _forward_ayolinx(raw_body: bytes, headers: dict, channel: str):
    """Forward Ayolinx callback ke per-site URL yang dikonfigurasi di DB.

    Resolution:
      1. Ambil 3 char pertama dari `originalPartnerReferenceNo` sebagai prefix
      2. Lookup db.site_configs.find_one({"prefix": prefix, "active": True})
      3. Bila process_locally=False dan forward_url_* terisi → forward
      4. Bila prefix tidak terdaftar di DB tapi == "VTX" → fallback ke
         AYOLINX_FORWARD (vortexgamers.cloud) untuk backward-compat
    """
    import httpx as _httpx

    try:
        data = json.loads(raw_body)
        ref_id = (data.get("originalPartnerReferenceNo") or "").strip()
    except Exception:
        return

    if len(ref_id) < 3:
        return

    prefix = ref_id[:3].upper()
    try:
        config = await _db.site_configs.find_one(
            {"prefix": prefix, "active": True}, {"_id": 0}
        )
    except Exception as e:
        logger.error(f"[Ayolinx Forward] DB lookup failed for prefix {prefix}: {e}")
        config = None

    if not config:
        # Legacy fallback: only VTX hardcoded
        if prefix == "VTX":
            config = {
                "prefix": "VTX",
                "forward_url_qris": AYOLINX_FORWARD["qris"],
                "forward_url_va":   AYOLINX_FORWARD["va"],
                "process_locally": False,
                "active": True,
            }
        else:
            logger.warning(f"[Ayolinx Forward] No site_config for prefix={prefix} ref={ref_id}, dropping")
            return

    # Bila site diproses lokal (misal master Blaze), jangan forward
    if config.get("process_locally"):
        logger.info(f"[Ayolinx Forward] prefix={prefix} process_locally=True, no forward")
        return

    # Pilih URL forward berdasarkan channel
    fwd_urls = []
    ch = (channel or "").upper()
    if "QRIS" in ch:
        u = config.get("forward_url_qris")
        if u:
            fwd_urls.append(u)
    elif "VIRTUAL_ACCOUNT" in ch or "VA" in ch:
        u = config.get("forward_url_va")
        if u:
            fwd_urls.append(u)
    else:
        # Channel tidak diketahui — forward ke semua URL yang ada
        for k in ("forward_url_qris", "forward_url_va"):
            u = config.get(k)
            if u and u not in fwd_urls:
                fwd_urls.append(u)

    if not fwd_urls:
        logger.warning(f"[Ayolinx Forward] prefix={prefix} no forward_url configured for channel={channel}")
        return

    for fwd_url in fwd_urls:
        try:
            async with _httpx.AsyncClient() as client:
                resp = await client.post(fwd_url, content=raw_body, headers=headers, timeout=15.0)
                logger.info(f"[Ayolinx Forward] {prefix} {ref_id} → {fwd_url} [{resp.status_code}]")
        except Exception as e:
            logger.error(f"[Ayolinx Forward] Failed {fwd_url}: {e}")
```

## LANGKAH 3: Pastikan DB `site_configs` punya entry RDS

Login ke MongoDB proxy `blazestore.id`:

```bash
mongosh
use blazestore   # atau nama DB Anda
db.site_configs.find({}, {prefix:1, forward_url_qris:1, forward_url_va:1, process_locally:1, active:1, _id:0})
```

Bila RDS belum ada atau salah URL, jalankan:

```js
db.site_configs.updateOne(
  { prefix: "RDS" },
  { $set: {
      prefix: "RDS",
      site_id: "raidstation",
      forward_url_qris: "https://raidstation.online/api/payment/callback/qris",
      forward_url_va:   "https://raidstation.online/api/payment/callback/va",
      process_locally: false,
      active: true,
  }},
  { upsert: true }
);
```

Lakukan sama untuk site lain bila perlu (NFG → neonforge.online, PXL → pixelvault.online, EOC → elitecharge.online, QDP → quantumdrop.online, AQR → aquarift.online, BSS → blossombyte.online).

## LANGKAH 4: Restart proxy backend

```bash
sudo systemctl restart blazestore-backend
sudo systemctl status blazestore-backend --no-pager
```

## LANGKAH 5: Test end-to-end

Dari Ayolinx dashboard atau gunakan curl simulasi ke proxy:

```bash
curl -X POST https://blazestore.id/api/payment/callback/qris \
  -H "Content-Type: application/json" \
  -H "X-SIGNATURE: dummy" \
  -H "X-TIMESTAMP: dummy" \
  -d '{
    "originalPartnerReferenceNo": "RDS-TEST-001",
    "originalReferenceNo": "AYL-XXX",
    "latestTransactionStatus": "00",
    "finishedTime": "2026-02-15T10:00:00+07:00",
    "additionalInfo": { "channel": "QRIS" }
  }' -v
```

Cek log proxy — harus muncul:
```
[Ayolinx Forward] RDS RDS-TEST-001 → https://raidstation.online/api/payment/callback/qris [200]
```

Lalu cek log di VPS Hostinger:
```bash
sudo journalctl -u voucherverse-backend -f --no-pager | grep -i callback
```
Harus muncul: `[Callback/qris] order=RDS-TEST-001 ...`

---

## KENAPA PANEL ADMIN TIDAK BERFUNGSI?

Anda sudah tambah RDS di panel admin `blazestore.id`, tapi panel admin itu **menulis ke DB** sementara **kode proxy tidak baca DB**. Setelah patch ini diterapkan, panel admin akan langsung berfungsi.
