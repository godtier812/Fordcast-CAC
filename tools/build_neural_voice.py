"""
Generates studio-quality neural TTS audio clips (Ava, Andrew, Aria, and Dalia ES)
for FordCast's voice alerts, storm demos, and voice persona previews.
Run with:
  uv run --with edge-tts python tools/build_neural_voice.py
"""
import asyncio
import base64
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
TRIPS_PATH = ROOT / "mobile" / "assets" / "demo" / "trips.json"
OUT_PATH = ROOT / "mobile" / "assets" / "voice" / "neural_clips.json"

VOICES = {
    "ava": "en-US-AvaMultilingualNeural",
    "andrew": "en-US-AndrewMultilingualNeural",
    "aria": "en-US-AriaNeural",
    "es": "es-MX-DaliaNeural",
}


def clean_name(raw: str) -> str:
    return (
        raw.replace("@", " at ")
        .replace("(W)", "West")
        .replace("(E)", "East")
        .replace("(N)", "North")
        .replace("(S)", "South")
        .replace("  ", " ")
        .strip()
    )


async def synth_b64(text: str, voice: str) -> str:
    comm = edge_tts.Communicate(text, voice, rate="-4%", pitch="-1Hz")
    chunks = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    raw = b"".join(chunks)
    return "data:audio/mpeg;base64," + base64.b64encode(raw).decode("ascii")


async def main() -> None:
    trips_doc = json.loads(TRIPS_PATH.read_text(encoding="utf-8"))
    trips = trips_doc["trips"]

    phrases_en = {
        "voice_test": "This is FordCast. Neural voice warnings are active and ready for your drive.",
        "test_alert": "FordCast test alert. Water is rising upstream. In a real flood warning, FordCast will announce which crossing to avoid and reroute your trip.",
        "arrived": "You have arrived at your destination.",
        "sim_route": "Rerouting around flooded crossing ahead. Your updated flood-checked route is active.",
    }
    phrases_es = {
        "voice_test": "Esto es FordCast. Los avisos de voz neuronal están activos y listos para su viaje.",
        "test_alert": "Alerta de prueba de FordCast. El agua está subiendo río arriba. En una alerta real, escuchará qué cruce evitar.",
        "arrived": "Ha llegado a su destino.",
        "sim_route": "Desviando alrededor de un cruce inundado más adelante. Su nueva ruta revisada está activa.",
    }

    for t in trips:
        storm_id = t["stormId"]
        cname = clean_name(t["crossingName"])
        state = t["trigger"]["state"]
        if state == "avoid":
            phrases_en[f"trip:{storm_id}"] = (
                f"Flooding likely ahead at {cname}. FordCast is rerouting your trip onto a higher-ground detour."
            )
            phrases_es[f"trip:{storm_id}"] = (
                f"Inundación probable más adelante en {cname}. FordCast está desviando su viaje por una ruta alternativa."
            )
        else:
            phrases_en[f"trip:{storm_id}"] = (
                f"Water rising upstream near {cname}. FordCast is switching your trip to a precaution detour."
            )
            phrases_es[f"trip:{storm_id}"] = (
                f"Agua subiendo río arriba cerca de {cname}. FordCast está cambiando su viaje a un desvío preventivo."
            )

    out = {"schema": "fordcast.voice.v1", "personas": {"ava": {}, "andrew": {}, "aria": {}, "es": {}}}

    tasks = []
    for persona in ("ava", "andrew", "aria"):
        voice_id = VOICES[persona]
        for key, text in phrases_en.items():
            tasks.append((persona, key, synth_b64(text, voice_id)))

    for key, text in phrases_es.items():
        tasks.append(("es", key, synth_b64(text, VOICES["es"])))

    print(f"Synthesizing {len(tasks)} neural voice clips...")
    results = await asyncio.gather(*(t[2] for t in tasks))
    for (persona, key, _), data_uri in zip(tasks, results):
        out["personas"][persona][key] = data_uri

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"Wrote {OUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    asyncio.run(main())
