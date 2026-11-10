const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Vercel startup never creates disk storage or writes to the deployment directory', () => {
  const result = spawnSync(process.execPath, ['-e', `
    process.env.VERCEL = '1';
    const fs = require('node:fs');
    const multer = require('multer');
    multer.diskStorage = () => { throw new Error('Disk storage must not initialize on Vercel'); };
    fs.mkdirSync = () => { throw new Error('Read-only deployment filesystem'); };
    const app = require('./server');
    if (typeof app !== 'function') throw new Error('Missing Express handler');
    console.log('serverless startup OK');
  `], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /serverless startup OK/);
});
