import User from 'src/Entities/User/User';

declare global {
    namespace Express {
        export interface Request {
            user: User;
        }
    }
}
