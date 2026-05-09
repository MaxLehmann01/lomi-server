import cors from 'cors';
import express from 'express';
import http from 'http';
import { THttpServerConfig } from 'src/Services/Config/Types';
import AbstractHttpController from 'src/Services/HttpServer/AbstractController';
import RouteError from 'src/Services/HttpServer/RouteError';
import Logger from 'src/Services/Logger/Logger';

export default class HttpServer {
    private static instance?: HttpServer;
    private static config: THttpServerConfig;

    private readonly app: express.Application;
    private readonly server: http.Server;
    private readonly router: express.Router;
    private logger: Logger;

    private constructor(logger: Logger) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.router = express.Router();
        this.logger = logger;

        this.app.use(express.json());
        this.app.use(cors(HttpServer.config.corsOptions));

        this.app.use('/', this.router);

        this.useErrorHandlers();
    }

    public static getInstance(logger: Logger): HttpServer {
        if (!HttpServer.instance) {
            HttpServer.instance = new HttpServer(logger);
        }

        return HttpServer.instance;
    }

    public static setConfig(config: THttpServerConfig): void {
        HttpServer.config = config;
    }

    public async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.listen(HttpServer.config.port, () => {
                resolve();
            });

            this.server.on('error', (err) => {
                reject(err);
            });
        });
    }

    public registerController(controller: AbstractHttpController): void {
        this.router.use(controller.getPrefix(), controller.getRouter());
    }

    public getHttpServer(): http.Server {
        return this.server;
    }

    private useErrorHandlers(): void {
        this.app.use(
            (
                req: express.Request,
                _res: express.Response,
                next: express.NextFunction
            ) => {
                const error = new RouteError(
                    404,
                    `Route not found: ${req.method} ${req.originalUrl}`
                );
                next(error);
            }
        );

        this.app.use(
            (
                err: Error | RouteError,
                _req: express.Request,
                res: express.Response,
                _next: express.NextFunction
            ) => {
                const statusCode =
                    err instanceof RouteError ? err.getStatusCode() : 500;
                const message = err.message;

                this.logger.error(`[${statusCode}] ${message}`);

                res.status(statusCode).json({
                    message,
                    data: null,
                });
            }
        );
    }
}
