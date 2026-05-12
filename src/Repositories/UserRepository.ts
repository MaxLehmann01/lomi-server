import User, { TDBUser, TUser } from 'src/Entities/User/User';
import UserDevice, {
    TDBUserDevice,
    TUserDevice,
} from 'src/Entities/User/UserDevice';
import UserRefreshToken, {
    TDBUserRefreshToken,
    TUserRefreshToken,
} from 'src/Entities/User/UserRefreshToken';
import UserRequest, {
    TDBUserRequest,
    TUserRequest,
} from 'src/Entities/User/UserRequest';
import AbstractRepository from 'src/Repositories/AbstractRepository';
import Security from 'src/Services/Security/Security';

export default class UserRepository extends AbstractRepository {
    public async findById(userId: TUser['id']): Promise<User | null> {
        const user = await this.db.selectOne<TDBUser>(
            'users',
            '*',
            'id = $1',
            undefined,
            [userId]
        );

        if (!user) {
            return null;
        }

        return new User({
            id: user.id,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            name: user.name,
            passwordHash: user.password_hash,
            passwordSalt: user.password_salt,
            encryptedAccountKey: user.encrypted_account_key,
        });
    }

    public async findByName(name: TUser['name']): Promise<User | null> {
        const user = await this.db.selectOne<TDBUser>(
            'users',
            '*',
            'name = $1',
            undefined,
            [name]
        );

        if (!user) {
            return null;
        }

        return new User({
            id: user.id,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            name: user.name,
            passwordHash: user.password_hash,
            passwordSalt: user.password_salt,
            encryptedAccountKey: user.encrypted_account_key,
        });
    }

    public async insert(
        user: Omit<
            TUser,
            | 'id'
            | 'createdAt'
            | 'updatedAt'
            | 'passwordSalt'
            | 'passwordHash'
            | 'encryptedAccountKey'
        >,
        password: string
    ): Promise<User | null> {
        const salt = Security.generateSalt();
        const passwordHash = Security.hashString(password, salt);

        const encryptedAccountKey =
            Security.createEncryptedAccountKey(password);

        const insertedId = await this.db.insert<TUser['id']>(
            'users',
            {
                name: user.name,
                password_salt: salt,
                password_hash: passwordHash,
                encrypted_account_key:
                    Security.stringifyEncryptedAccountKey(encryptedAccountKey),
            },
            'id'
        );

        if (!insertedId) {
            return null;
        }

        return this.findById(insertedId);
    }

    public async findRefreshTokenById(
        refreshTokenId: TUserRefreshToken['id']
    ): Promise<UserRefreshToken | null> {
        const refreshToken = await this.db.selectOne<TDBUserRefreshToken>(
            'user_refresh_tokens',
            '*',
            'id = $1',
            undefined,
            [refreshTokenId]
        );

        if (!refreshToken) {
            return null;
        }

        return new UserRefreshToken({
            id: refreshToken.id,
            createdAt: refreshToken.created_at,
            updatedAt: refreshToken.updated_at,
            userId: refreshToken.user_id,
            token: Security.decryptAesGCM({
                ct: refreshToken.token_ct,
                iv: refreshToken.token_iv,
                tag: refreshToken.token_tag,
            }),
            tokenDigest: refreshToken.token_digest,
            tokenExpiresAt: refreshToken.token_expires_at,
        });
    }

    public async findRefreshTokenByUserIdAndToken(
        userId: TUserRefreshToken['userId'],
        token: TUserRefreshToken['token']
    ): Promise<UserRefreshToken | null> {
        const tokenDigest = Security.createDigest(token);

        const refreshToken = await this.db.selectOne<TDBUserRefreshToken>(
            'user_refresh_tokens',
            '*',
            'user_id = $1 AND token_digest = $2',
            undefined,
            [userId, tokenDigest]
        );

        if (!refreshToken) {
            return null;
        }

        return new UserRefreshToken({
            id: refreshToken.id,
            createdAt: refreshToken.created_at,
            updatedAt: refreshToken.updated_at,
            userId: refreshToken.user_id,
            token: Security.decryptAesGCM({
                ct: refreshToken.token_ct,
                iv: refreshToken.token_iv,
                tag: refreshToken.token_tag,
            }),
            tokenDigest: refreshToken.token_digest,
            tokenExpiresAt: refreshToken.token_expires_at,
        });
    }

    public async insertRefreshToken(
        refreshToken: Omit<
            TUserRefreshToken,
            'id' | 'createdAt' | 'updatedAt' | 'tokenDigest'
        >
    ): Promise<UserRefreshToken | null> {
        const encryptedToken = Security.encryptAesGCM(refreshToken.token);
        const tokenDigest = Security.createDigest(refreshToken.token);

        const insertedId = await this.db.insert<TUserRefreshToken['id']>(
            'user_refresh_tokens',
            {
                user_id: refreshToken.userId,
                token_ct: encryptedToken.ct,
                token_iv: encryptedToken.iv,
                token_tag: encryptedToken.tag,
                token_digest: tokenDigest,
                token_expires_at: refreshToken.tokenExpiresAt,
            },
            'id'
        );

        if (!insertedId) {
            return null;
        }

        return this.findRefreshTokenById(insertedId);
    }

    public async deleteRefreshTokenByUserIdAndToken(
        userId: TUserRefreshToken['userId'],
        token: TUserRefreshToken['token']
    ): Promise<boolean> {
        const tokenDigest = Security.createDigest(token);

        const isDeleted = await this.db.delete(
            'user_refresh_tokens',
            'user_id = $1 AND token_digest = $2',
            [userId, tokenDigest]
        );

        if (isDeleted === null) {
            return false;
        }

        return isDeleted > 0;
    }

    public async findDeviceById(
        deviceId: TUserDevice['id']
    ): Promise<UserDevice | null> {
        const device = await this.db.selectOne<TDBUserDevice>(
            'user_devices',
            '*',
            'id = $1',
            undefined,
            [deviceId]
        );

        if (!device) {
            return null;
        }

        return new UserDevice({
            id: device.id,
            createdAt: device.created_at,
            updatedAt: device.updated_at,
            userId: device.user_id,
            clientDeviceId: device.client_device_id,
            clientDeviceName: device.client_device_name,
            publicKey: device.public_key,
        });
    }

    public async findDeviceByUserIdAndClientDeviceId(
        userId: TUserDevice['userId'],
        clientDeviceId: TUserDevice['clientDeviceId']
    ): Promise<UserDevice | null> {
        const device = await this.db.selectOne<TDBUserDevice>(
            'user_devices',
            '*',
            'user_id = $1 AND client_device_id = $2',
            undefined,
            [userId, clientDeviceId]
        );

        if (!device) {
            return null;
        }

        return new UserDevice({
            id: device.id,
            createdAt: device.created_at,
            updatedAt: device.updated_at,
            userId: device.user_id,
            clientDeviceId: device.client_device_id,
            clientDeviceName: device.client_device_name,
            publicKey: device.public_key,
        });
    }

    public async findDevicesByUserId(
        userId: TUserDevice['userId']
    ): Promise<UserDevice[]> {
        const devices = await this.db.select<TDBUserDevice>(
            'user_devices',
            '*',
            'user_id = $1',
            undefined,
            [userId]
        );

        return devices.map(
            (device) =>
                new UserDevice({
                    id: device.id,
                    createdAt: device.created_at,
                    updatedAt: device.updated_at,
                    userId: device.user_id,
                    clientDeviceId: device.client_device_id,
                    clientDeviceName: device.client_device_name,
                    publicKey: device.public_key,
                })
        );
    }

    public async insertDevice(
        device: Omit<TUserDevice, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<UserDevice | null> {
        const insertedId = await this.db.insert<TUserDevice['id']>(
            'user_devices',
            {
                user_id: device.userId,
                client_device_id: device.clientDeviceId,
                client_device_name: device.clientDeviceName,
                public_key: device.publicKey,
            },
            'id'
        );

        if (!insertedId) {
            return null;
        }

        return this.findDeviceById(insertedId);
    }

    public async deleteDeviceByUserIdAndClientDeviceId(
        userId: TUserDevice['userId'],
        clientDeviceId: TUserDevice['clientDeviceId']
    ): Promise<boolean> {
        const isDeleted = await this.db.delete(
            'user_devices',
            'user_id = $1 AND client_device_id = $2',
            [userId, clientDeviceId]
        );

        if (isDeleted === null) {
            return false;
        }

        return isDeleted > 0;
    }

    public async findRequestById(
        requestId: TUserRequest['id']
    ): Promise<UserRequest | null> {
        const userRequest = await this.db.selectOne<TDBUserRequest>(
            'user_requests',
            '*',
            'id = $1',
            undefined,
            [requestId]
        );

        if (!userRequest) {
            return null;
        }

        return new UserRequest({
            id: userRequest.id,
            createdAt: userRequest.created_at,
            updatedAt: userRequest.updated_at,
            userId: userRequest.user_id,
            encryptedConfig: userRequest.encrypted_config,
        });
    }

    public async findAllRequestsByUserId(
        userId: TUserRequest['userId']
    ): Promise<UserRequest[]> {
        const userRequests = await this.db.select<TDBUserRequest>(
            'user_requests',
            '*',
            'user_id = $1',
            undefined,
            [userId]
        );

        return userRequests.map(
            (userRequest) =>
                new UserRequest({
                    id: userRequest.id,
                    createdAt: userRequest.created_at,
                    updatedAt: userRequest.updated_at,
                    userId: userRequest.user_id,
                    encryptedConfig: userRequest.encrypted_config,
                })
        );
    }

    public async insertRequest(
        userRequest: Omit<TUserRequest, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<UserRequest | null> {
        const insertedId = await this.db.insert<TUserRequest['id']>(
            'user_requests',
            {
                user_id: userRequest.userId,
                encrypted_config: JSON.stringify(userRequest.encryptedConfig),
            },
            'id'
        );

        if (!insertedId) {
            return null;
        }

        return this.findRequestById(insertedId);
    }

    public async deleteRequest(
        requestId: TUserRequest['id']
    ): Promise<boolean> {
        const isDeleted = await this.db.delete('user_requests', 'id = $1', [
            requestId,
        ]);

        if (isDeleted === null) {
            return false;
        }

        return isDeleted > 0;
    }
}
