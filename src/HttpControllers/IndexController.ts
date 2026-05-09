import { Request, Response } from 'express';
import Config from 'src/Services/Config/Config';
import AbstractHttpController from 'src/Services/HttpServer/AbstractController';
import { asyncHandler } from 'src/Services/HttpServer/AsyncRouteHandler';
import Logger from 'src/Services/Logger/Logger';

export default class IndexHttpController extends AbstractHttpController {
    protected readonly prefix = '/';

    constructor(logger: Logger) {
        super(logger);
        this.registerRoutes();
    }

    protected registerRoutes(): void {
        this.router.get('/', asyncHandler(this.indexRoute));
    }

    private indexRoute = async (req: Request, res: Response): Promise<void> => {
        res.status(200).json({
            message: 'Welcome to the Lomi-Server API!',
            data: {
                TZ: Config.get<string>('TZ'),
                PACKAGE_VERSION: Config.get<string>('npm_package_version'),
            },
        });
    };
}
