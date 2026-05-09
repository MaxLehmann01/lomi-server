import * as fs from 'node:fs';
import path from 'path';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { TDatabaseConfig } from 'src/Services/Config/Types';
import Logger from 'src/Services/Logger/Logger';

export default class Database {
    private static instance: Database;
    private static config: TDatabaseConfig;

    private pool!: Pool;
    private schema!: string;
    private logger: Logger;

    private constructor(logger: Logger) {
        this.logger = logger;
    }

    public static setConfig(config: TDatabaseConfig): void {
        Database.config = config;
    }

    public static getInstance(logger: Logger): Database {
        if (!Database.instance) {
            Database.instance = new Database(logger);
        }
        return Database.instance;
    }

    public async start(): Promise<void> {
        if (!Database.config) {
            throw new Error(
                'Database configuration not set. Call Postgres.setConfig() first.'
            );
        }

        const { host, port, database, schema, user, password, ssl } =
            Database.config;

        this.schema = schema;

        this.pool = new Pool({
            host,
            port,
            database,
            user,
            password,
            ssl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('connect', () => {
            this.logger.info(
                `Connected to Database at ${user}@${host}:${port}/${database}`
            );
        });

        this.pool.on('error', (err: any) => {
            this.logger.error(`Database Pool Error: ${err}`);
        });

        try {
            const connection = await this.getConnection();
            await connection.query('SELECT NOW()');
            connection.release();
        } catch (e) {
            this.logger.error(`Failed to connect to Database: ${e}`);
            throw e;
        }
    }

    public async getConnection(): Promise<PoolClient> {
        if (!this.pool) {
            throw new Error('Database pool not initialized');
        }

        try {
            const connection = await this.pool.connect();
            await connection.query(
                `SET search_path TO ${this.schema}, "$user"`
            );
            return connection;
        } catch (e) {
            this.logger.error(`Error acquiring Database connection: ${e}`);
            throw e;
        }
    }

    public async stop(): Promise<void> {
        if (this.pool) {
            try {
                await this.pool.end();
                this.logger.info('Database pool closed');
            } catch (e) {
                this.logger.error(`Error closing Database pool: ${e}`);
            }
        }
    }

    public async migrate(): Promise<boolean> {
        const migrationsDir = Database.config.migrationsDir;

        if (!fs.existsSync(migrationsDir)) {
            this.logger.error('Migrations directory does not exist', {
                migrationsDir,
            });

            return false;
        }

        const client = await this.getConnection();

        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS ${this.schema}._migrations (
                    id SERIAL PRIMARY KEY,
                    filename TEXT UNIQUE NOT NULL,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);

            const scripts = fs
                .readdirSync(migrationsDir)
                .filter((file) => file.endsWith('.sql'))
                .sort();

            if (scripts.length === 0) {
                this.logger.warn('Migrations directory is empty', {
                    migrationsDir,
                });

                return true;
            }

            for (const script of scripts) {
                const { rows } = await client.query(
                    `SELECT 1 FROM ${this.schema}._migrations WHERE filename = $1`,
                    [script]
                );

                if (rows.length > 0) {
                    this.logger.debug('Migration already applied, skipping', {
                        script,
                    });
                    continue;
                }

                const fullFilePath = path.join(migrationsDir, script);
                const sql = fs.readFileSync(fullFilePath, 'utf-8');

                this.logger.info('Applying migration', { script });

                await client.query('BEGIN');
                try {
                    await client.query(sql);
                    await client.query(
                        `INSERT INTO ${this.schema}._migrations (filename) VALUES ($1)`,
                        [script]
                    );
                    await client.query('COMMIT');

                    this.logger.info('Migration applied successfully', {
                        script,
                    });
                } catch (e) {
                    await client.query('ROLLBACK');
                    this.logger.error('Error applying migration, rolled back', {
                        script,
                    });

                    throw new Error(e instanceof Error ? e.message : String(e));
                }
            }

            return true;
        } finally {
            client.release();
        }
    }

    public async query<T extends QueryResultRow>(
        query: string,
        params: Array<
            string | number | boolean | Date | null | string[] | Buffer
        > = []
    ): Promise<QueryResult<T>> {
        const connection = await this.getConnection();

        try {
            return await connection.query<T>(query, params);
        } catch (e) {
            this.logger.error(`Error executing query: ${e}`);
            throw e;
        } finally {
            connection.release();
        }
    }

    public async select<T extends QueryResultRow>(
        table: string,
        columns: string[] | '*',
        where?: string,
        orderBy?: string,
        params: Array<string | number | boolean | Date | null | Buffer> = []
    ): Promise<T[]> {
        const query = `SELECT ${
            Array.isArray(columns)
                ? columns.map((column) => `"${column}"`).join(', ')
                : '*'
        } FROM "${table}" ${where ? `WHERE ${where}` : ''} ${orderBy ? `ORDER BY ${orderBy}` : ''}`;

        const result = await this.query<T>(query, params);
        return result.rows;
    }

    public async selectOne<T extends QueryResultRow>(
        table: string,
        columns: string[] | '*',
        where: string,
        orderBy?: string,
        params: Array<string | number | boolean | Date | null | Buffer> = []
    ): Promise<T | null> {
        const query = `SELECT ${
            Array.isArray(columns)
                ? columns.map((column) => `"${column}"`).join(', ')
                : '*'
        } FROM "${table}" ${where ? `WHERE ${where}` : ''} ${orderBy ? `ORDER BY ${orderBy}` : ''} LIMIT 1`;

        const result = await this.query<T>(query, params);

        return result.rows[0] || null;
    }

    public async insert<
        T extends string | number | boolean | Date | Buffer | string[],
    >(
        table: string,
        data: Record<
            string,
            string | number | boolean | Date | null | string[] | Buffer
        >,
        returning: string | null = null
    ): Promise<T | null> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(',');
        const returningClause = returning ? ` RETURNING ${returning}` : '';

        const query = `INSERT INTO "${table}" (${keys
            .map((key) => `"${key}"`)
            .join(', ')}) VALUES (${placeholders})${returningClause}`;

        const result = await this.query(query, values);

        if (returning) {
            return result.rows[0][returning] as T;
        }

        return null;
    }

    public async update(
        table: string,
        data: Record<
            string,
            string | number | boolean | Date | null | string[] | Buffer
        >,
        where: string,
        params: Array<string | number | boolean | Date | null | Buffer> = []
    ): Promise<number | null> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys
            .map((key, idx) => `"${key}" = $${idx + 1}`)
            .join(', ');

        const whereOffset = values.length;
        const whereClause = where.replace(
            /\$(\d+)/g,
            (_, idx) => `$${parseInt(idx) + whereOffset}`
        );

        const query = `UPDATE "${table}" SET ${setClause} WHERE ${whereClause}`;

        const result = await this.query(query, [...values, ...params]);
        return result.rowCount;
    }

    public async delete(
        table: string,
        where: string,
        params: Array<string | number | boolean | Date | null | Buffer> = []
    ): Promise<number | null> {
        const query = `DELETE FROM ${table} WHERE ${where}`;

        const result = await this.query(query, params);
        return result.rowCount;
    }
}
