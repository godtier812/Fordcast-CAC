"""Geodesic comparator selection; no assumed watershed connectivity."""

from collections.abc import Mapping

from pyproj import Geod

GEOD = Geod(ellps="WGS84")


def distance_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    return GEOD.inv(a[0], a[1], b[0], b[1])[2] / 1000


def nearest_gauge(lon: float, lat: float, catalog: Mapping[str, Mapping]) -> str:
    if not catalog:
        raise ValueError("An eligible gauge catalog is required")
    return min(
        catalog,
        key=lambda gid: (distance_km((lon, lat), (catalog[gid]["lon"], catalog[gid]["lat"])), gid),
    )
