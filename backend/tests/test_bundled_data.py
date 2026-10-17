import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_bundled_data_matches_manifest_and_mobile_copy():
    manifest = json.loads((ROOT / "data/MANIFEST.json").read_text())
    for entry in manifest["files"]:
        path = ROOT / "data" / entry["path"]
        content = path.read_bytes()
        assert len(content) == entry["bytes"]
        assert hashlib.sha256(content).hexdigest() == entry["sha256"]
    inventory = json.loads((ROOT / "data/seed/crossings.geojson").read_text())
    mobile = json.loads((ROOT / "mobile/assets/seed/crossings.json").read_text())
    assert inventory == mobile
