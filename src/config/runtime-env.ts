const DEFAULT_JWT_SECRET = 'change-me-in-production';

export function getDefaultJwtSecret(): string {
  return DEFAULT_JWT_SECRET;
}

export function readPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function validateRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const jwtSecret = env.JWT_SECRET?.trim();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET deve ser informado.');
  }

  if (env.NODE_ENV !== 'production') {
    return;
  }

  if (jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET padrao nao pode ser usado em producao. Defina um segredo forte antes de subir a API.',
    );
  }

  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET deve ter pelo menos 32 caracteres em producao.',
    );
  }

  if (env.SEED_SAMPLE_DATA === 'true') {
    throw new Error(
      'SEED_SAMPLE_DATA deve permanecer false em producao para evitar dados demo.',
    );
  }
}
