import AuthHttpController from 'src/HttpControllers/AuthController';
import IndexHttpController from 'src/HttpControllers/IndexController';
import RequestHttpController from 'src/HttpControllers/RequestController';
import UserRepository from 'src/Repositories/UserRepository';
import Config from 'src/Services/Config/Config';
import Definition from 'src/Services/Config/Definition';
import Database from 'src/Services/Database/Database';
import HttpServer from 'src/Services/HttpServer/HttpServer';
import Logger from 'src/Services/Logger/Logger';

Config.load(Definition);

const logger = new Logger(Config.getLoggerConfig());

Database.setConfig(Config.getDatabaseConfig());
const database = Database.getInstance(logger);

HttpServer.setConfig(Config.getHttpServerConfig());
const httpServer = HttpServer.getInstance(logger);

const userRepository = new UserRepository(database);

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
httpServer.registerController(new AuthHttpController(logger, userRepository));
httpServer.registerController(
    new RequestHttpController(logger, userRepository)
);
httpServer
    .start()
    .then(() => {
        logger.info('Successfully started HTTP server!');
    })
    .catch((e) => {
        logger.error('Failed to start HTTP server', { error: e.message });
        process.exit(1);
    });
