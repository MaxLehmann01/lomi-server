import { CorsOptions } from 'cors';

export type TConfigDefinition = {
    type: 'string' | 'number' | 'boolean';
    required: boolean;
};

export type TLoggerConfig = {
    level: string;
    directory: string;
};

export type THttpServerConfig = {
    port: number;
    corsOptions: CorsOptions;
};

export type TDatabaseConfig = {
    host: string;
    port: number;
    database: string;
    schema: string;
    user: string;
    password: string;
    ssl: boolean;
    migrationsDir: string;
};
