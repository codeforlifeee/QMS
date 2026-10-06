import { execSync } from 'child_process';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

try {
  execSync('npx -y tsx scripts/migrate-json-to-supabase.ts', { env: { ...process.env, ...env, NODE_OPTIONS: '--experimental-websocket' }, stdio: 'inherit' });
} catch (e) {
  console.error(e);
}
