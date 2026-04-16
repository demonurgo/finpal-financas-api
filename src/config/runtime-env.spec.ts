import { getDefaultJwtSecret, validateRuntimeEnvironment } from './runtime-env';

describe('runtime environment validation', () => {
  it('throws when JWT_SECRET is missing', () => {
    expect(() =>
      validateRuntimeEnvironment({
        NODE_ENV: 'development',
      }),
    ).toThrow('JWT_SECRET deve ser informado.');
  });

  it('allows the development placeholder secret outside production', () => {
    expect(() =>
      validateRuntimeEnvironment({
        JWT_SECRET: getDefaultJwtSecret(),
        NODE_ENV: 'development',
        SEED_SAMPLE_DATA: 'true',
      }),
    ).not.toThrow();
  });

  it('throws when the default JWT secret is used in production', () => {
    expect(() =>
      validateRuntimeEnvironment({
        JWT_SECRET: getDefaultJwtSecret(),
        NODE_ENV: 'production',
        SEED_SAMPLE_DATA: 'false',
      }),
    ).toThrow('JWT_SECRET padrao nao pode ser usado em producao.');
  });

  it('throws when sample demo data is enabled in production', () => {
    expect(() =>
      validateRuntimeEnvironment({
        JWT_SECRET: 'uma-chave-bem-grande-para-producao-123',
        NODE_ENV: 'production',
        SEED_SAMPLE_DATA: 'true',
      }),
    ).toThrow('SEED_SAMPLE_DATA deve permanecer false em producao');
  });

  it('throws when the production JWT secret is too short', () => {
    expect(() =>
      validateRuntimeEnvironment({
        JWT_SECRET: 'segredo-curto',
        NODE_ENV: 'production',
        SEED_SAMPLE_DATA: 'false',
      }),
    ).toThrow('JWT_SECRET deve ter pelo menos 32 caracteres em producao.');
  });
});
