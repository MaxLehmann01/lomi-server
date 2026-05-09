import {
    TAuthConfig,
    TConfigDefinition,
    TDatabaseConfig,
    THttpServerConfig,
    TLoggerConfig,
} from 'src/Services/Config/Types';
import { CorsOptions } from 'cors';
import Security from 'src/Services/Security/Security';
import path from 'path';
import fs from 'node:fs';

export default class Config {
    private static values: Record<
        string,
        string | number | boolean | undefined
    > = {};

    public static load(definitions: Record<string, TConfigDefinition>): void {
        this.values = {};

        for (const envName of Object.keys(definitions)) {
            const configDefinition = definitions[envName];
            const envValue = process.env[envName];

            if (envValue === undefined) {
                if (configDefinition.required) {
                    throw new Error(
                        `Missing required environment variable: ${envName}`
                    );
                }

                Config.values[envName] = undefined;
                continue;
            }

            switch (configDefinition.type) {
                case 'string': {
                    Config.values[envName] = envValue;
                    break;
                }
                case 'number': {
                    const numValue = Number(envValue);

                    if (isNaN(numValue)) {
                        throw new Error(
                            `Invalid value for environment variable: ${envName}. Expected a number.`
                        );
                    }

                    Config.values[envName] = numValue;
                    break;
                }
                case 'boolean': {
                    const lowerEnvValue = envValue.toLowerCase();

                    if (lowerEnvValue !== 'true' && lowerEnvValue !== 'false') {
                        throw new Error(
                            `Invalid value for environment variable: ${envName}. Expected a boolean.`
                        );
                    }

                    Config.values[envName] = lowerEnvValue === 'true';
                    break;
                }
                default: {
                    throw new Error(
                        `Unknown type for environment variable: ${envName}`
                    );
                }
            }
        }
    }

    public static get<T extends string | number | boolean>(name: string): T {
        const value = Config.values[name];

        if (value === undefined) {
            throw new Error(`Missing requested environment variable: ${name}`);
        }

        return value as T;
    }

    public static getLoggerConfig(): TLoggerConfig {
        return {
            level: 'silly',
            directory: '/app/logs',
        };
    }
    public static getHttpServerConfig(): THttpServerConfig {
        return {
            port: 80,
            corsOptions: Config.getCorsOptions(),
        };
    }

    public static getDatabaseConfig(): TDatabaseConfig {
        return {
            host: Config.get<string>('DB_HOST'),
            port: Config.get<number>('DB_PORT'),
            database: Config.get<string>('DB_NAME'),
            schema: 'public',
            user: Config.get<string>('DB_USER'),
            password: Config.get<string>('DB_PASSWORD'),
            ssl: Config.get<boolean>('DB_SSL'),
            migrationsDir: '/app/migrations',
        };
    }

    public static getAuthConfig(): TAuthConfig {
        const secretsJsonFilePath = path.resolve('app-data/secrets.json');

        if (!fs.existsSync(secretsJsonFilePath)) {
            Config.generateSecretsJSON();
        }

        const jsonContent = fs.readFileSync(secretsJsonFilePath, 'utf8');

        const secrets = JSON.parse(jsonContent);

        return {
            accessToken: {
                secret: secrets.accessTokenSecret,
                expiresIn: 3600,
            },
            refreshToken: {
                secret: secrets.refreshTokenSecret,
                expiresIn: 7 * 24 * 3600,
            },
            aes256GcmKey: Config.getAes256GcmKey(secrets.aes256GcmKey),
        };
    }

    private static getCorsOptions(): CorsOptions {
        const whitelist = Config.get<string>('CORS_WHITELIST').split(',');

        return {
            credentials: true,
            origin: (origin, callback) => {
                if (!origin || whitelist.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'), false);
                }
            },
        };
    }

    private static getAes256GcmKey(base64Key: string): Buffer {
        const bufferKey = Buffer.from(base64Key, 'base64');

        if (bufferKey.length !== 32) {
            throw new Error(
                `AES256_GCM_KEY must decode to 32 bytes; got ${bufferKey.length}`
            );
        }

        return bufferKey;
    }

    private static generateSecretsJSON(): void {
        const jsonContent = JSON.stringify(
            {
                accessTokenSecret: Security.generateJWTSecret(),
                refreshTokenSecret: Security.generateJWTSecret(),
                aes256GcmKey: Security.generateAesGCMKey(),
            },
            null,
            4
        );

        fs.writeFileSync(
            path.resolve('app-data/secrets.json'),
            jsonContent,
            'utf8'
        );
    }
}
