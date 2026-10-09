/** Copies the icons next to the compiled node and credential, where n8n reads `file:` icons. */
import { cp, readdir } from 'node:fs/promises';

for (const folder of ['credentials', 'nodes']) {
  for (const file of await readdir(folder, { recursive: true })) {
    if (file.endsWith('.svg')) await cp(`${folder}/${file}`, `dist/${folder}/${file}`);
  }
}
