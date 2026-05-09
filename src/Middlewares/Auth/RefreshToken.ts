import { NextFunction, Request, RequestHandler, Response } from 'express';
import { TAuthConfig } from 'src/Services/Config/Types';
import UserRepository from 'src/Repositories/UserRepository';
import { asyncHandler } from 'src/Services/HttpServer/AsyncRouteHandler';
import RouteError from 'src/Services/HttpServer/RouteError';
import jwt from 'jsonwebtoken';
import { TJWTUserPayload } from 'src/Entities/User/User';

export default function AuthRefreshTokenMiddleware(
    refreshTokenSecret: TAuthConfig['refreshToken']['secret'],
    userRepository: UserRepository
): RequestHandler {
    return asyncHandler(
        async (
            req: Request,
            _res: Response,
            next: NextFunction
        ): Promise<void> => {
            const refreshToken = req.headers['x-auth-refresh-token'];

            if (typeof refreshToken !== 'string') {
                throw new RouteError(
                    401,
                    'The header "x-auth-refresh-token" is required'
                );
            }

            const verifiedToken = jwt.verify(refreshToken, refreshTokenSecret);
            if (!verifiedToken) {
                throw new RouteError(
                    403,
                    'The header "x-auth-refresh-token" is invalid'
                );
            }

            const userPayload = (verifiedToken as TJWTUserPayload).user;
            const user = await userRepository.findById(userPayload.id);

            if (!user) {
                throw new RouteError(
                    403,
                    'The user belonging to this refresh token does not exist'
                );
            }

            req.user = user;
            next();
        }
    );
}
