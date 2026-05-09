export type TConfigDefinition = {
    type: 'string' | 'number' | 'boolean';
    required: boolean;
};

export type TLoggerConfig = {
    level: string;
    directory: string;
};
