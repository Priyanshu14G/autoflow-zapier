import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { API_KEYS_VALIDATOR } from '@libs/common';

@Module({
  controllers: [ApiKeysController],
  providers: [
    ApiKeysService,
    // Bind ApiKeysService to the abstract token used by ApiKeyAuthGuard
    { provide: API_KEYS_VALIDATOR, useExisting: ApiKeysService },
  ],
  exports: [ApiKeysService, API_KEYS_VALIDATOR],
})
export class ApiKeysModule {}
