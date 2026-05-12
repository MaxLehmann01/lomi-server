export type TEncryptedConfig = {
    version: 1;
    algorithm: 'AES-256-GCM';
    iv: string;
    authTag: string;
    encryptedData: string;
};

export type TDBUserRequest = {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    encrypted_config: TEncryptedConfig;
};

export type TUserRequest = {
    id: TDBUserRequest['id'];
    createdAt: TDBUserRequest['created_at'];
    updatedAt: TDBUserRequest['updated_at'];
    userId: TDBUserRequest['user_id'];
    encryptedConfig: TDBUserRequest['encrypted_config'];
};

export default class UserRequest {
    private readonly id: TUserRequest['id'];
    private readonly createdAt: TUserRequest['createdAt'];
    private readonly updatedAt: TUserRequest['updatedAt'];
    private readonly userId: TUserRequest['userId'];
    private readonly encryptedConfig: TUserRequest['encryptedConfig'];

    constructor(userRequest: TUserRequest) {
        this.id = userRequest.id;
        this.createdAt = userRequest.createdAt;
        this.updatedAt = userRequest.updatedAt;
        this.userId = userRequest.userId;
        this.encryptedConfig = userRequest.encryptedConfig;
    }

    public getId(): TUserRequest['id'] {
        return this.id;
    }

    public getCreatedAt(): TUserRequest['createdAt'] {
        return this.createdAt;
    }

    public getUpdatedAt(): TUserRequest['updatedAt'] {
        return this.updatedAt;
    }

    public getUserId(): TUserRequest['userId'] {
        return this.userId;
    }

    public getEncryptedConfig(): TUserRequest['encryptedConfig'] {
        return this.encryptedConfig;
    }
}
