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
} as Record<string, TConfigDefinition>;
