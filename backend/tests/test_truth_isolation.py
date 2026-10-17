import ast
from pathlib import Path


def test_runtime_does_not_import_scoring():
    root = Path(__file__).parents[1] / "fordcast"
    for path in root.rglob("*.py"):
        if "scoring" in path.parts or "linking" in path.parts:
            continue
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, ast.ImportFrom):
                assert not (node.module or "").startswith("fordcast.scoring"), path
            elif isinstance(node, ast.Import):
                assert all(not a.name.startswith("fordcast.scoring") for a in node.names), path
