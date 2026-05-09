import Config from 'src/Services/Config/Config';
import Definition from 'src/Services/Config/Definition';

Config.load(Definition);

console.log('Application started', {
    NODE_ENV: Config.get<string>('NODE_ENV'),
    TZ: Config.get<string>('TZ'),
});
