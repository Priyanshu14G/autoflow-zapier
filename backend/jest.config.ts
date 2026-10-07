import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@libs/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@libs/database(|/.*)$': '<rootDir>/libs/database/src/$1',
    '^@libs/domain(|/.*)$': '<rootDir>/libs/domain/src/$1',
    '^@libs/queue(|/.*)$': '<rootDir>/libs/queue/src/$1',
    '^@libs/engine(|/.*)$': '<rootDir>/libs/engine/src/$1',
    '^@libs/integrations(|/.*)$': '<rootDir>/libs/integrations/src/$1',
  },
};

export default config;
