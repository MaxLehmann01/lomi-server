import AbstractHttpController from 'src/Services/HttpServer/AbstractController';
import Logger from 'src/Services/Logger/Logger';
import UserRepository from 'src/Repositories/UserRepository';
import { Request, RequestHandler, Response } from 'express';
import AuthAccessTokenMiddleware from 'src/Middlewares/Auth/AccessToken';
import AuthRefreshTokenMiddleware from 'src/Middlewares/Auth/RefreshToken';
import { asyncHandler } from 'src/Services/HttpServer/AsyncRouteHandler';
import RouteError from 'src/Services/HttpServer/RouteError';
import Security from 'src/Services/Security/Security';
import User, { TJWTUserPayload } from 'src/Entities/User/User';
import jwt from 'jsonwebtoken';
import Config from 'src/Services/Config/Config';

type TAuthTokens = {
    accessToken: {
        token: string;
        expiresIn: number;
    };
    refreshToken: {
        token: string;
        expiresIn: number;
    };
};

export default class AuthHttpController extends AbstractHttpController {
    protected readonly prefix = '/auth';

    private readonly userRepository: UserRepository;

    private readonly accessTokenMiddleware: RequestHandler;
    private readonly refreshTokenMiddleware: RequestHandler;

    constructor(logger: Logger, userRepository: UserRepository) {
        super(logger);

        this.userRepository = userRepository;

        const authConfig = Config.getAuthConfig();

        this.accessTokenMiddleware = AuthAccessTokenMiddleware(
            authConfig.accessToken.secret,
            userRepository
        );
        this.refreshTokenMiddleware = AuthRefreshTokenMiddleware(
            authConfig.refreshToken.secret,
            userRepository
        );

        this.registerRoutes();
    }

    protected registerRoutes(): void {
        this.router.get(
            '/user',
            this.accessTokenMiddleware,
            this.refreshTokenMiddleware,
            asyncHandler(this.userRoute)
        );

        this.router.post('/sign-in', asyncHandler(this.signInRoute));
        this.router.delete(
            '/sign-out',
            this.accessTokenMiddleware,
            this.refreshTokenMiddleware,
            asyncHandler(this.signOutRoute)
        );
        this.router.post(
            '/refresh',
            this.refreshTokenMiddleware,
            asyncHandler(this.refreshRoute)
        );

        this.router.get(
            '/devices',
            this.accessTokenMiddleware,
            this.refreshTokenMiddleware,
            asyncHandler(this.devicesRoute)
        );
        this.router.delete(
            '/devices/:clientDeviceId',
            this.accessTokenMiddleware,
            this.refreshTokenMiddleware,
            asyncHandler(this.removeDeviceRoute)
        );
    }

    private userRoute = async (req: Request, res: Response): Promise<void> => {
        res.status(200).json({
            message: 'Successfully retrieved user',
            data: {
                id: req.user.getId(),
                name: req.user.getName(),
                encryptedAccountKey: req.user.getEncryptedAccountKey(),
            },
        });
    };

    private signInRoute = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const { username, password, device, publicKey } = req.body;

        if (!username || typeof username !== 'string') {
            throw new RouteError(
                400,
                'The field "username" is required and must be a string'
            );
        }

        if (!password || typeof password !== 'string') {
            throw new RouteError(
                400,
                'The field "password" is required and must be a string'
            );
        }

        if (!device || typeof device !== 'object') {
            throw new RouteError(
                400,
                'The field "device" is required and must be an object'
            );
        }

        if (
            !publicKey ||
            typeof publicKey !== 'string' ||
            !Security.isValidPublicKeyPem(publicKey)
        ) {
            throw new RouteError(
                400,
                'The field "publicKey" is required and must be a valid pem formatted public key string'
            );
        }

        const user = await this.userRepository.findByName(username);
        if (!user) {
            throw new RouteError(401, 'Invalid username');
        }

        if (
            Security.hashString(password, user.getPasswordSalt()) !==
            user.getPasswordHash()
        ) {
            throw new RouteError(401, 'Invalid password');
        }

        const authConfig = Config.getAuthConfig();
        const authTokens = this.generateAuthTokens(user);

        const refreshToken = await this.userRepository.insertRefreshToken({
            userId: user.getId(),
            token: authTokens.refreshToken.token,
            tokenExpiresAt: new Date(
                Date.now() + authConfig.refreshToken.expiresIn * 1000
            ),
        });

        if (!refreshToken) {
            throw new RouteError(500, 'Failed to create refresh token.');
        }

        if (
            !(await this.userRepository.findDeviceByUserIdAndClientDeviceId(
                user.getId(),
                device.id
            ))
        ) {
            if (
                !(await this.userRepository.insertDevice({
                    userId: user.getId(),
                    clientDeviceId: device.id,
                    clientDeviceName: device.name,
                    publicKey: publicKey,
                }))
            ) {
                throw new RouteError(500, 'Failed to register user device.');
            }
        }

        res.status(200).json({
            message: 'Successfully signed in',
            data: authTokens,
        });
    };

    private signOutRoute = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const refreshTokenHeader = req.headers[
            'x-auth-refresh-token'
        ] as string;

        if (
            !(await this.userRepository.deleteRefreshTokenByUserIdAndToken(
                req.user.getId(),
                refreshTokenHeader
            ))
        ) {
            throw new RouteError(500, 'Failed to delete refresh token.');
        }

        res.status(200).json({
            message: 'Successfully signed out',
            data: null,
        });
    };

    private refreshRoute = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const refreshTokenHeader = req.headers[
            'x-auth-refresh-token'
        ] as string;

        if (
            !(await this.userRepository.findRefreshTokenByUserIdAndToken(
                req.user.getId(),
                refreshTokenHeader
            ))
        ) {
            throw new RouteError(403, 'Invalid refresh token');
        }

        const user = await this.userRepository.findById(req.user.getId());
        if (!user) {
            throw new RouteError(404, 'User not found');
        }

        const authConfig = Config.getAuthConfig();
        const authTokens = this.generateAuthTokens(user);

        const refreshToken = await this.userRepository.insertRefreshToken({
            userId: user.getId(),
            token: authTokens.refreshToken.token,
            tokenExpiresAt: new Date(
                Date.now() + authConfig.refreshToken.expiresIn * 1000
            ),
        });

        if (!refreshToken) {
            throw new RouteError(500, 'Failed to create refresh token.');
        }

        res.status(200).json({
            message: 'Successfully refreshed user access',
            data: authTokens,
        });
    };

    private devicesRoute = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const devices = await this.userRepository.findDevicesByUserId(
            req.user.getId()
        );

        res.status(200).json({
            message: 'Successfully retrieved user devices',
            data: devices.map((device) => ({
                clientDeviceId: device.getClientDeviceId(),
                clientDeviceName: device.getClientDeviceName(),
                publicKey: device.getPublicKey(),
            })),
        });
    };

    private removeDeviceRoute = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const { clientDeviceId } = req.params;

        if (!clientDeviceId || typeof clientDeviceId !== 'string') {
            throw new RouteError(
                400,
                'The parameter "clientDeviceId" is required and must be a string'
            );
        }

        const isDeleted =
            await this.userRepository.deleteDeviceByUserIdAndClientDeviceId(
                req.user.getId(),
                clientDeviceId
            );

        if (!isDeleted) {
            throw new RouteError(500, 'Failed to delete user device.');
        }

        res.status(200).json({
            message: 'Successfully removed user device',
            data: null,
        });
    };

    private generateAuthTokens(user: User): TAuthTokens {
        const authConfig = Config.getAuthConfig();

        const payload: TJWTUserPayload = {
            user: {
                id: user.getId(),
                name: user.getName(),
            },
        };

        return {
            accessToken: {
                token: jwt.sign(payload, authConfig.accessToken.secret, {
                    expiresIn: authConfig.accessToken.expiresIn,
                }),
                expiresIn: authConfig.accessToken.expiresIn,
            },
            refreshToken: {
                token: jwt.sign(payload, authConfig.refreshToken.secret, {
                    expiresIn: authConfig.refreshToken.expiresIn,
                }),
                expiresIn: authConfig.refreshToken.expiresIn,
            },
        };
    }
}
