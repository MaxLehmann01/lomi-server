import { TConfigDefinition } from 'src/Services/Config/Types';

export default {
    NODE_ENV: {
        type: 'string',
        required: true,
    },
    TZ: {
        type: 'string',
        required: true,
    },
    CORS_WHITELIST: {
        type: 'string',
        required: true,
    },
    npm_package_version: {
        type: 'string',
        required: true,
    },
    DB_HOST: {
        type: 'string',
        required: true,
    },
    DB_PORT: {
        type: 'number',
        required: true,
    },
    DB_NAME: {
        type: 'string',
        required: true,
    },
    DB_USER: {
        type: 'string',
        required: true,
    },
    DB_PASSWORD: {
        type: 'string',
        required: true,
    },
    DB_SSL: {
        type: 'boolean',
        required: true,
    },
} as Record<string, TConfigDefinition>;
