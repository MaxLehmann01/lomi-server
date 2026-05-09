import { NextFunction, Request, RequestHandler, Response } from 'express';
import { TAuthConfig } from 'src/Services/Config/Types';
import UserRepository from 'src/Repositories/UserRepository';
import { asyncHandler } from 'src/Services/HttpServer/AsyncRouteHandler';
import RouteError from 'src/Services/HttpServer/RouteError';
import jwt from 'jsonwebtoken';
import { TJWTUserPayload } from 'src/Entities/User/User';

export default function AuthAccessTokenMiddleware(
    accessTokenSecret: TAuthConfig['accessToken']['secret'],
    userRepository: UserRepository
): RequestHandler {
    return asyncHandler(
        async (
            req: Request,
            _res: Response,
            next: NextFunction
        ): Promise<void> => {
            const accessToken = req.headers['x-auth-access-token'];

            if (typeof accessToken !== 'string') {
                throw new RouteError(
                    401,
                    'The header "x-auth-access-token" is required'
                );
            }

            const verifiedToken = jwt.verify(accessToken, accessTokenSecret);
            if (!verifiedToken) {
                throw new RouteError(
                    403,
                    'The header "x-auth-access-token" is invalid'
                );
            }

            const userPayload = (verifiedToken as TJWTUserPayload).user;
            const user = await userRepository.findById(userPayload.id);

            if (!user) {
                throw new RouteError(
                    403,
                    'The user belonging to this access token does not exist'
                );
            }

            req.user = user;
            next();
        }
    );
}
