import { TConfigDefinition, TLoggerConfig } from 'src/Services/Config/Types';

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
}
