import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../server/auth.mjs';

function hiddenQuestion(prompt) {
  if (!process.stdin.isTTY) throw new Error('Run this setup in an interactive terminal.');
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function finish(error) {
      process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause();
      process.stdout.write('\n'); error ? reject(error) : resolve(value);
    }
    function onData(buffer) {
      for (const char of buffer.toString()) {
        if (char === '\u0003') { finish(new Error('Setup cancelled.')); return; }
        if (char === '\r' || char === '\n') { finish(); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ' && value.length < 1024) value += char;
      }
    }
    process.stdin.on('data', onData);
  });
}
try {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const username = (await readline.question('Admin username [admin]: ')).trim() || 'admin';
  readline.close();
  if (!/^[a-zA-Z0-9_.@-]{1,80}$/.test(username)) throw new Error('Use letters, numbers, dots, dashes or @ for the username.');
  const password = await hiddenQuestion('Password (at least 14 characters; hidden): ');
  if (password.length < 14) throw new Error('Use at least 14 characters.');
  if (await hiddenQuestion('Confirm password (hidden): ') !== password) throw new Error('Passwords do not match.');
  const hash = await hashPassword(password);
  let previous;
  try { previous = await readFile('.env', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; previous = await readFile('.env.example', 'utf8'); }
  const lines = previous.split(/\r?\n/).filter(line => !/^ADMIN_(USERNAME|PASSWORD_HASH)=/.test(line));
  await writeFile('.env', lines.join('\n').trimEnd() + '\nADMIN_USERNAME=' + username + '\nADMIN_PASSWORD_HASH=' + hash + '\n', { mode: 0o600 });
  console.log('Saved the admin username and salted password hash in ignored .env. Restart the server to apply changes.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
