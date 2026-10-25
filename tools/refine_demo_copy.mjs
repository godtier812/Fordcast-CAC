// Mechanical punctuation cleanup in locale values; keys and interpolation stay intact.
import { readFile, writeFile } from 'node:fs/promises';
for (const language of ['en', 'es']) {
  const file = `mobile/src/locales/${language}.json`;
  const text = await readFile(file, 'utf8');
  await writeFile(file, text.replace(/ — /g, ' · '));
}
