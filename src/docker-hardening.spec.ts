import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Docker hardening files', () => {
  it('keeps environment files out of the Docker build context', () => {
    const dockerignore = readFileSync(
      join(process.cwd(), '.dockerignore'),
      'utf-8',
    );

    expect(dockerignore).toContain('.env');
    expect(dockerignore).toContain('.env.*');
  });

  it('uses explicit copy instructions in the Dockerfile', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf-8');

    expect(dockerfile).not.toContain('COPY . .');
    expect(dockerfile).toContain('COPY src ./src');
    expect(dockerfile).toContain('COPY --from=deps /app/package*.json ./');
    expect(dockerfile).toContain('COPY docker ./docker');
  });

  it('keeps demo data disabled by default and blocks it in production seeding', () => {
    const envExample = readFileSync(
      join(process.cwd(), '.env.example'),
      'utf-8',
    );
    const seedScript = readFileSync(
      join(process.cwd(), 'prisma/seed.js'),
      'utf-8',
    );

    expect(envExample).toContain('SEED_SAMPLE_DATA=false');
    expect(seedScript).toContain(
      'SEED_SAMPLE_DATA deve permanecer false em producao.',
    );
  });

  it('lets Docker Compose inherit NODE_ENV from the environment file', () => {
    const composeFile = readFileSync(
      join(process.cwd(), 'docker-compose.yml'),
      'utf-8',
    );

    expect(composeFile).toContain('NODE_ENV: ${NODE_ENV:-development}');
    expect(composeFile).not.toContain('NODE_ENV: production');
  });
});
