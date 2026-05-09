import Database from 'src/Services/Database/Database';

export default abstract class AbstractRepository {
    protected readonly db: Database;

    constructor(db: Database) {
        this.db = db;
    }
}
