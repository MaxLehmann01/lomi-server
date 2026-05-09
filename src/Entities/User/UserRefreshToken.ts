export type TDBUserRefreshToken = {
    id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string;
    token_ct: Buffer;
    token_iv: Buffer;
    token_tag: Buffer;
    token_digest: Buffer;
    token_expires_at: Date;
};

export type TUserRefreshToken = {
    id: TDBUserRefreshToken['id'];
    createdAt: TDBUserRefreshToken['created_at'];
    updatedAt: TDBUserRefreshToken['updated_at'];
    userId: TDBUserRefreshToken['user_id'];
    token: string;
    tokenDigest: TDBUserRefreshToken['token_digest'];
    tokenExpiresAt: TDBUserRefreshToken['token_expires_at'];
};

export default class UserRefreshToken {
    private readonly id: TUserRefreshToken['id'];
    private readonly createdAt: TUserRefreshToken['createdAt'];
    private readonly updatedAt: TUserRefreshToken['updatedAt'];
    private readonly userId: TUserRefreshToken['userId'];
    private readonly token: TUserRefreshToken['token'];
    private readonly tokenDigest: TUserRefreshToken['tokenDigest'];
    private readonly tokenExpiresAt: TUserRefreshToken['tokenExpiresAt'];

    constructor(userRefreshToken: TUserRefreshToken) {
        this.id = userRefreshToken.id;
        this.createdAt = userRefreshToken.createdAt;
        this.updatedAt = userRefreshToken.updatedAt;
        this.userId = userRefreshToken.userId;
        this.token = userRefreshToken.token;
        this.tokenDigest = userRefreshToken.tokenDigest;
        this.tokenExpiresAt = userRefreshToken.tokenExpiresAt;
    }

    public getId(): TUserRefreshToken['id'] {
        return this.id;
    }

    public getCreatedAt(): TUserRefreshToken['createdAt'] {
        return this.createdAt;
    }

    public getUpdatedAt(): TUserRefreshToken['updatedAt'] {
        return this.updatedAt;
    }

    public getUserId(): TUserRefreshToken['userId'] {
        return this.userId;
    }

    public getToken(): TUserRefreshToken['token'] {
        return this.token;
    }

    public getTokenDigest(): TUserRefreshToken['tokenDigest'] {
        return this.tokenDigest;
    }

    public getTokenExpiresAt(): TUserRefreshToken['tokenExpiresAt'] {
        return this.tokenExpiresAt;
    }
}
