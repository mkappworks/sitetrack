import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import type { Request, Response } from 'express';
import Joi from 'joi';
import { join } from 'path';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MaterialsModule } from './materials/materials.module';
import { HealthModule } from './health/health.module';
import { EquipmentsModule } from './equipments/equipments.module';

@Module({
  imports: [
    // --- Config: validate env vars at startup, fail fast if missing ---
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
      }),
    }),

    // --- Database: TypeORM + PostgreSQL ---
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        database: config.get('DB_NAME'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        // NEVER use synchronize in production — use migrations instead
        synchronize: config.get('NODE_ENV') === 'development',
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // --- GraphQL: code-first, subscriptions via WS ---
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Code-first: decorators generate the schema file
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      // Subscriptions over WebSocket
      subscriptions: {
        'graphql-ws': true,
      },
      // Pass the raw request into GraphQL context so Guards can read JWT
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    }),

    UsersModule,
    AuthModule,
    ProjectsModule,
    MaterialsModule,
    HealthModule,
    EquipmentsModule,
  ],
})
export class AppModule {}
