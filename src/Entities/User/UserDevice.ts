export type TDBUserDevice = {
    id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string;
    client_device_id: string;
    public_key: string;
};

export type TUserDevice = {
    id: TDBUserDevice['id'];
    createdAt: TDBUserDevice['created_at'];
    updatedAt: TDBUserDevice['updated_at'];
    userId: TDBUserDevice['user_id'];
    clientDeviceId: TDBUserDevice['client_device_id'];
    publicKey: TDBUserDevice['public_key'];
};

export default class UserDevice {
    private readonly id: TUserDevice['id'];
    private readonly createdAt: TUserDevice['createdAt'];
    private readonly updatedAt: TUserDevice['updatedAt'];
    private readonly userId: TUserDevice['userId'];
    private readonly clientDeviceId: TUserDevice['clientDeviceId'];
    private readonly publicKey: TUserDevice['publicKey'];

    constructor(userDevice: TUserDevice) {
        this.id = userDevice.id;
        this.createdAt = userDevice.createdAt;
        this.updatedAt = userDevice.updatedAt;
        this.userId = userDevice.userId;
        this.clientDeviceId = userDevice.clientDeviceId;
        this.publicKey = userDevice.publicKey;
    }

    public getId(): TUserDevice['id'] {
        return this.id;
    }

    public getCreatedAt(): TUserDevice['createdAt'] {
        return this.createdAt;
    }

    public getUpdatedAt(): TUserDevice['updatedAt'] {
        return this.updatedAt;
    }

    public getUserId(): TUserDevice['userId'] {
        return this.userId;
    }

    public getClientDeviceId(): TUserDevice['clientDeviceId'] {
        return this.clientDeviceId;
    }

    public getPublicKey(): TUserDevice['publicKey'] {
        return this.publicKey;
    }
}
