import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** All files of a local mail folder, including subfolders such as Old, relative to the folder. */
export function mailFiles(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: 'utf8' }).filter((name) => statSync(join(folder, name)).isFile());
}
