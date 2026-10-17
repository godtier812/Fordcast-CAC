"""USGS v1 transport with bounded pagination and schema validation."""

import asyncio
from datetime import UTC, datetime
from urllib.parse import urljoin, urlsplit

import httpx
from pydantic import BaseModel, ConfigDict, field_validator

from fordcast.sources.base import Reading


class StageProperties(BaseModel):
    model_config = ConfigDict(extra="ignore")
    monitoring_location_id: str
    parameter_code: str
    time: datetime
    value: float | None
    unit_of_measure: str | None = None
    approval_status: str = "Provisional"
    qualifier: str | list[str] | None = None

    @field_validator("time")
    @classmethod
    def timezone_required(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("USGS timestamp has no timezone")
        return value


def parse_readings(features: list[dict], received_at: datetime) -> list[Reading]:
    readings = []
    for feature in features:
        p = StageProperties.model_validate(feature["properties"])
        if p.parameter_code != "00065" or p.value is None:
            continue
        if p.unit_of_measure != "ft":
            raise ValueError("Stage unit must be verified as feet")
        qualifiers = (p.qualifier,) if isinstance(p.qualifier, str) else tuple(p.qualifier or ())
        if any(q.lower() in {"ice", "eqp", "ssn", "dis", "dry"} for q in qualifiers):
            continue
        readings.append(
            Reading(
                p.monitoring_location_id,
                p.parameter_code,
                p.time,
                max(received_at, p.time),
                p.value,
                "A" if p.approval_status == "Approved" else "P",
                qualifiers,
            )
        )
    return sorted(readings, key=lambda r: (r.gauge_id, r.obs_time))


class USGSClient:
    def __init__(
        self,
        client: httpx.AsyncClient,
        api_key: str | None = None,
        base_url: str = "https://api.waterdata.usgs.gov/ogcapi/v1",
    ) -> None:
        self.client, self.api_key, self.base = client, api_key, base_url.rstrip("/")

    async def features(
        self, collection: str, params: dict[str, str], *, max_pages: int = 50
    ) -> list[dict]:
        if collection not in {
            "continuous",
            "latest-continuous",
            "monitoring-locations",
            "combined-metadata",
        }:
            raise ValueError("Unsupported USGS collection")
        url = self.base + f"/collections/{collection}/items"
        query: dict[str, str] | None = {"f": "json", "limit": "10000", **params}
        headers = {"X-Api-Key": self.api_key} if self.api_key else {}
        features, seen = [], set()
        for _ in range(max_pages):
            if url in seen:
                raise ValueError("Repeated pagination cursor")
            seen.add(url)
            for attempt in range(3):
                response = await self.client.get(url, params=query, headers=headers)
                if response.status_code != 429 and response.status_code < 500:
                    break
                if attempt < 2:
                    try:
                        delay = min(
                            60, max(0, float(response.headers.get("Retry-After", 2**attempt)))
                        )
                    except ValueError:
                        delay = 2**attempt
                    await asyncio.sleep(delay)
            response.raise_for_status()
            data = response.json()
            if data.get("type") != "FeatureCollection" or not isinstance(
                data.get("features"), list
            ):
                raise ValueError("Unexpected USGS response")
            features.extend(data["features"])
            next_url = next(
                (link["href"] for link in data.get("links", []) if link.get("rel") == "next"), None
            )
            if next_url is None:
                return features
            url = urljoin(str(response.url), next_url)
            # Never forward API credentials to another host or downgrade HTTPS.
            if (
                urlsplit(url).netloc != urlsplit(self.base).netloc
                or urlsplit(url).scheme != "https"
            ):
                raise ValueError("Untrusted pagination origin")
            query = None
        raise ValueError("USGS pagination exceeded bounded page limit")

    async def latest(self, bbox: str) -> list[Reading]:
        features = await self.features(
            "latest-continuous", {"bbox": bbox, "parameter_code": "00065"}
        )
        return parse_readings(features, datetime.now(UTC))
