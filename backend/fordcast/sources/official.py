from collections.abc import Sequence
from datetime import datetime, timedelta

from fordcast.sources.base import OfficialStatus


def is_fresh_official(record: OfficialStatus | None, now: datetime) -> bool:
    if record is None or record.available_at > now:
        return False
    if record.source == "manual":
        return record.expires_at is not None and now < record.expires_at
    return record.available_at >= now - timedelta(minutes=15) and (
        record.source_updated_at is None
        or now - timedelta(hours=24) <= record.source_updated_at <= now
    )


class EmptyOfficial:
    """No official status integration is enabled without a permitted source."""

    async def status(
        self, crossing_ids: Sequence[str], as_of: datetime
    ) -> dict[str, OfficialStatus]:
        return {}
