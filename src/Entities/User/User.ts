export type TDBUser = {
    id: string;
    created_at: Date;
    updated_at: Date;
    name: string;
    password_hash: string;
    password_salt: string;
};

export type TUser = {
    id: TDBUser['id'];
    createdAt: TDBUser['created_at'];
    updatedAt: TDBUser['updated_at'];
    name: TDBUser['name'];
    passwordHash: TDBUser['password_hash'];
    passwordSalt: TDBUser['password_salt'];
};

export type TJWTUserPayload = {
    user: {
        id: TUser['id'];
        name: TUser['name'];
    };
};

export default class User {
    private readonly id: TUser['id'];
    private readonly createdAt: TUser['createdAt'];
    private readonly updatedAt: TUser['updatedAt'];
    private readonly name: TUser['name'];
    private readonly passwordHash: TUser['passwordHash'];
    private readonly passwordSalt: TUser['passwordSalt'];

    constructor(user: TUser) {
        this.id = user.id;
        this.createdAt = user.createdAt;
        this.updatedAt = user.updatedAt;
        this.name = user.name;
        this.passwordHash = user.passwordHash;
        this.passwordSalt = user.passwordSalt;
    }

    public getId(): TUser['id'] {
        return this.id;
    }

    public getCreatedAt(): TUser['createdAt'] {
        return this.createdAt;
    }

    public getUpdatedAt(): TUser['updatedAt'] {
        return this.updatedAt;
    }

    public getName(): TUser['name'] {
        return this.name;
    }

    public getPasswordHash(): TUser['passwordHash'] {
        return this.passwordHash;
    }

    public getPasswordSalt(): TUser['passwordSalt'] {
        return this.passwordSalt;
    }
}
