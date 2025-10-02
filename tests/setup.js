import fs from 'fs';
import path from 'path';

const testDbPath = path.resolve(process.cwd(), 'data', 'test.sqlite');
try {
  fs.unlinkSync(testDbPath);
} catch (err) {
  if (err.code !== 'ENOENT') {
    throw err;
  }
}
