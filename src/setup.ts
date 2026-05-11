import UserRepository from 'src/Repositories/UserRepository';
import Config from 'src/Services/Config/Config';
import Definition from 'src/Services/Config/Definition';
import Database from 'src/Services/Database/Database';
import Logger from 'src/Services/Logger/Logger';

Config.load(Definition);

const logger = new Logger(Config.getLoggerConfig());

Database.setConfig(Config.getDatabaseConfig());
const database = Database.getInstance(logger);

const userRepository = new UserRepository(database);

database
    .start()
    .then(async () => {
        logger.info('Successfully started database connection!');

        await insertDevelopmentUser();

        process.exit(0);
    })
    .catch((e) => {
        logger.error('Failed to start database', { error: e.message });
        process.exit(1);
    });

async function insertDevelopmentUser(): Promise<void> {
    if (!(await userRepository.findByName('dev'))) {
        await userRepository.insert(
            {
                name: 'dev',
            },
            'dev'
        );
    }
}
