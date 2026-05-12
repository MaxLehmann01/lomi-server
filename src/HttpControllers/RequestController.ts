import { Request, RequestHandler, Response } from 'express';
import AuthAccessTokenMiddleware from 'src/Middlewares/Auth/AccessToken';
import AuthRefreshTokenMiddleware from 'src/Middlewares/Auth/RefreshToken';
import UserRepository from 'src/Repositories/UserRepository';
import Config from 'src/Services/Config/Config';
import AbstractHttpController from 'src/Services/HttpServer/AbstractController';
import { asyncHandler } from 'src/Services/HttpServer/AsyncRouteHandler';
import Logger from 'src/Services/Logger/Logger';

export default class RequestHttpController extends AbstractHttpController {
    protected readonly prefix = '/requests';

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
            '/',
            this.accessTokenMiddleware,
            this.refreshTokenMiddleware,
            asyncHandler(this.allRoute)
        );

        this.router.post(
            '/',
            this.accessTokenMiddleware,
            this.refreshTokenMiddleware,
            asyncHandler(this.createRoute)
        );
    }

    private allRoute = async (req: Request, res: Response): Promise<void> => {
        const requests = await this.userRepository.findAllRequestsByUserId(
            req.user.getId()
        );

        res.status(200).json({
            message: 'Successfully retrieved user requests',
            data: requests.map((request) => ({
                id: request.getId(),
                createdAt: request.getCreatedAt(),
                updatedAt: request.getUpdatedAt(),
                userId: request.getUserId(),
                encryptedConfig: request.getEncryptedConfig(),
            })),
        });
    };

    private createRoute = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const body = req.body;

        await this.userRepository.insertRequest({
            userId: req.user.getId(),
            encryptedConfig: body,
        });

        res.status(200).json({
            message: 'Successfully created user request',
            data: null,
        });
    };
}
