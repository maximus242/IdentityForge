/** @jest-environment node */

import fs from 'fs';
import path from 'path';

describe('project test gates', () => {
  it('enforces lint + test + build in root check:web script', () => {
    const packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const checkWebScript = packageJson?.scripts?.['check:web'] as string;

    expect(typeof checkWebScript).toBe('string');
    expect(checkWebScript).toContain('npm run lint');
    expect(checkWebScript).toContain('npm --workspace apps/web run test -- --runInBand');
    expect(checkWebScript).toContain('npm run build:web');
  });
});
