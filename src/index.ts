import Config from 'src/Services/Config/Config';
import Definition from 'src/Services/Config/Definition';
import Logger from 'src/Services/Logger/Logger';
import HttpServer from 'src/Services/HttpServer/HttpServer';
import IndexHttpController from 'src/HttpControllers/IndexController';
import Database from 'src/Services/Database/Database';

Config.load(Definition);

const logger = new Logger(Config.getLoggerConfig());

Database.setConfig(Config.getDatabaseConfig());
const database = Database.getInstance(logger);

HttpServer.setConfig(Config.getHttpServerConfig());
const httpServer = HttpServer.getInstance(logger);

database
    .start()
    .then(async () => {
        logger.info('Successfully started database connection!');

        if (await database.migrate()) {
            logger.info('Successfully ran database migrations!');
        } else {
            logger.error('Failed to run database migrations!');
        }
    })
    .catch((e) => {
        logger.error('Failed to start database', { error: e.message });
        process.exit(1);
    });

httpServer.registerController(new IndexHttpController(logger));
httpServer
    .start()
    .then(() => {
        logger.info('Successfully started HTTP server!');
    })
    .catch((e) => {
        logger.error('Failed to start HTTP server', { error: e.message });
        process.exit(1);
    });

logger.debug('AuthConfig', Config.getAuthConfig());
