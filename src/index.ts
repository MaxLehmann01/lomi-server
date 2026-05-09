import Config from 'src/Services/Config/Config';
import Definition from 'src/Services/Config/Definition';
import Logger from 'src/Services/Logger/Logger';
import HttpServer from 'src/Services/HttpServer/HttpServer';
import IndexHttpController from 'src/HttpControllers/IndexController';

Config.load(Definition);

const logger = new Logger(Config.getLoggerConfig());

HttpServer.setConfig(Config.getHttpServerConfig());
const httpServer = HttpServer.getInstance(logger);

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
