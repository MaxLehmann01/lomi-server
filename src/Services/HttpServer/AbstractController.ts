import express from 'express';
import Logger from 'src/Services/Logger/Logger';

export default abstract class AbstractHttpController {
    protected abstract prefix: string;
    protected router: express.Router;
    protected logger: Logger;

    protected constructor(logger: Logger) {
        this.router = express.Router();
        this.logger = logger;
    }

    public getPrefix(): string {
        return this.prefix;
    }

    public getRouter(): express.Router {
        return this.router;
    }

    protected abstract registerRoutes(): void;
}
