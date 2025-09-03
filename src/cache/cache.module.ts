import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheProvider } from '../interfaces/cache-provider.interface';
import { InMemoryCacheProvider } from '../providers/in-memory-cache.provider';
import { RedisCacheProvider } from '../providers/redis-cache.provider';

@Module({
  providers: [
    {
      provide: 'CACHE_PROVIDER',
      useFactory: (configService: ConfigService): CacheProvider => {
        const cacheType = configService.get<string>('CACHE_TYPE', 'memory');

        switch (cacheType) {
          case 'redis':
            try {
              return new RedisCacheProvider(configService);
            } catch (error) {
              console.warn(
                'Redis not available, falling back to in-memory cache:',
                error instanceof Error ? error.message : String(error),
              );
              return new InMemoryCacheProvider();
            }
          case 'memory':
          default:
            return new InMemoryCacheProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['CACHE_PROVIDER'],
})
export class CacheModule {}
