import Config from 'src/Services/Config/Config';
import Definition from 'src/Services/Config/Definition';
import Logger from 'src/Services/Logger/Logger';

Config.load(Definition);

const logger = new Logger(Config.getLoggerConfig());

logger.info('Application started', {
    NODE_ENV: Config.get<string>('NODE_ENV'),
    TZ: Config.get<string>('TZ'),
});
