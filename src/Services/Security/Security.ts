import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import Config from 'src/Services/Config/Config';
import { createPublicKey, KeyObject } from 'node:crypto';

type TGCMBundle = {
    ct: Buffer;
    iv: Buffer;
    tag: Buffer;
};

export type TSerializedGCMBundle = {
    ct: string;
    iv: string;
    tag: string;
};

export type TEncryptedAccountKey = {
    version: 1;
    algorithm: 'AES-256-GCM';
    kdf: {
        algorithm: 'scrypt';
        salt: string;
        N: number;
        r: number;
        p: number;
        keyLength: number;
    };
    iv: string;
    authTag: string;
    encryptedKey: string;
};

export default class Security {
    public static hashString(password: string, salt: string): string {
        return bcryptjs.hashSync(password, salt);
    }

    public static encryptAesGCM(plaintext: string): TGCMBundle {
        const authConfig = Config.getAuthConfig();

        return Security.encryptAesGCMWithKey(
            Buffer.from(plaintext, 'utf8'),
            authConfig.aes256GcmKey
        );
    }

    public static decryptAesGCM(bundle: TGCMBundle): string {
        const authConfig = Config.getAuthConfig();

        const plaintext = Security.decryptAesGCMWithKey(
            bundle,
            authConfig.aes256GcmKey
        );

        return plaintext.toString('utf8');
    }

    public static encryptAesGCMWithKey(
        plaintext: Buffer,
        key: Buffer | string
    ): TGCMBundle {
        const normalizedKey = Security.normalizeAes256Key(key);

        const iv = crypto.randomBytes(12);

        const cipher = crypto.createCipheriv('aes-256-gcm', normalizedKey, iv);

        const ciphertext = Buffer.concat([
            cipher.update(plaintext),
            cipher.final(),
        ]);

        const tag = cipher.getAuthTag();

        return {
            ct: ciphertext,
            iv,
            tag,
        };
    }

    public static decryptAesGCMWithKey(
        bundle: TGCMBundle,
        key: Buffer | string
    ): Buffer {
        const normalizedKey = Security.normalizeAes256Key(key);

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            normalizedKey,
            bundle.iv
        );

        decipher.setAuthTag(bundle.tag);

        return Buffer.concat([decipher.update(bundle.ct), decipher.final()]);
    }

    public static serializeGCMBundle(bundle: TGCMBundle): TSerializedGCMBundle {
        return {
            ct: bundle.ct.toString('base64'),
            iv: bundle.iv.toString('base64'),
            tag: bundle.tag.toString('base64'),
        };
    }

    public static deserializeGCMBundle(
        bundle: TSerializedGCMBundle
    ): TGCMBundle {
        return {
            ct: Buffer.from(bundle.ct, 'base64'),
            iv: Buffer.from(bundle.iv, 'base64'),
            tag: Buffer.from(bundle.tag, 'base64'),
        };
    }

    public static createDigest(plaintext: string): Buffer {
        return crypto.createHash('sha256').update(plaintext).digest();
    }

    public static generateJWTSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    public static generateAesGCMKey(): string {
        return crypto.randomBytes(32).toString('base64');
    }

    public static generateSalt(): string {
        return bcryptjs.genSaltSync(12);
    }

    public static isValidPublicKeyPem(pem: string): boolean {
        try {
            const key: KeyObject = createPublicKey({
                key: pem,
                format: 'pem',
            });

            return key.type === 'public';
        } catch {
            return false;
        }
    }

    public static createEncryptedAccountKey(
        password: string
    ): TEncryptedAccountKey {
        if (!password) {
            throw new Error('Password is required');
        }

        const accountKey = crypto.randomBytes(32);

        const kdf: TEncryptedAccountKey['kdf'] = {
            algorithm: 'scrypt',
            salt: crypto.randomBytes(16).toString('base64'),
            N: 16384,
            r: 8,
            p: 1,
            keyLength: 32,
        };

        const wrappingKey = Security.deriveAccountKeyEncryptionKey(
            password,
            Buffer.from(kdf.salt, 'base64'),
            kdf.keyLength,
            kdf.N,
            kdf.r,
            kdf.p
        );

        const encryptedBundle = Security.encryptAesGCMWithKey(
            accountKey,
            wrappingKey
        );

        return {
            version: 1,
            algorithm: 'AES-256-GCM',
            kdf,
            iv: encryptedBundle.iv.toString('base64'),
            authTag: encryptedBundle.tag.toString('base64'),
            encryptedKey: encryptedBundle.ct.toString('base64'),
        };
    }

    public static decryptEncryptedAccountKey(
        password: string,
        encryptedAccountKey: TEncryptedAccountKey
    ): Buffer {
        if (!password) {
            throw new Error('Password is required');
        }

        if (!encryptedAccountKey || typeof encryptedAccountKey !== 'object') {
            throw new Error('Encrypted account key is required');
        }

        if (encryptedAccountKey.version !== 1) {
            throw new Error('Unsupported encrypted account key version');
        }

        if (encryptedAccountKey.algorithm !== 'AES-256-GCM') {
            throw new Error('Unsupported encrypted account key algorithm');
        }

        if (encryptedAccountKey.kdf.algorithm !== 'scrypt') {
            throw new Error('Unsupported account key KDF');
        }

        const wrappingKey = Security.deriveAccountKeyEncryptionKey(
            password,
            Buffer.from(encryptedAccountKey.kdf.salt, 'base64'),
            encryptedAccountKey.kdf.keyLength,
            encryptedAccountKey.kdf.N,
            encryptedAccountKey.kdf.r,
            encryptedAccountKey.kdf.p
        );

        const accountKey = Security.decryptAesGCMWithKey(
            {
                ct: Buffer.from(encryptedAccountKey.encryptedKey, 'base64'),
                iv: Buffer.from(encryptedAccountKey.iv, 'base64'),
                tag: Buffer.from(encryptedAccountKey.authTag, 'base64'),
            },
            wrappingKey
        );

        if (accountKey.length !== 32) {
            throw new Error('Invalid account key length');
        }

        return accountKey;
    }

    public static parseEncryptedAccountKey(
        encryptedAccountKey: string
    ): TEncryptedAccountKey {
        const parsed = JSON.parse(encryptedAccountKey) as TEncryptedAccountKey;

        if (!Security.isValidEncryptedAccountKey(parsed)) {
            throw new Error('Invalid encrypted account key');
        }

        return parsed;
    }

    public static stringifyEncryptedAccountKey(
        encryptedAccountKey: TEncryptedAccountKey
    ): string {
        if (!Security.isValidEncryptedAccountKey(encryptedAccountKey)) {
            throw new Error('Invalid encrypted account key');
        }

        return JSON.stringify(encryptedAccountKey);
    }

    public static isValidEncryptedAccountKey(
        encryptedAccountKey: unknown
    ): encryptedAccountKey is TEncryptedAccountKey {
        if (!encryptedAccountKey || typeof encryptedAccountKey !== 'object') {
            return false;
        }

        const value = encryptedAccountKey as Partial<TEncryptedAccountKey>;

        return (
            value.version === 1 &&
            value.algorithm === 'AES-256-GCM' &&
            typeof value.iv === 'string' &&
            typeof value.authTag === 'string' &&
            typeof value.encryptedKey === 'string' &&
            !!value.kdf &&
            value.kdf.algorithm === 'scrypt'
        );
    }

    private static deriveAccountKeyEncryptionKey(
        password: string,
        salt: Buffer,
        keyLength: number,
        N: number,
        r: number,
        p: number
    ): Buffer {
        return crypto.scryptSync(password, salt, keyLength, {
            N,
            r,
            p,
        });
    }

    private static normalizeAes256Key(key: Buffer | string): Buffer {
        const normalizedKey = Buffer.isBuffer(key)
            ? key
            : Buffer.from(key, 'base64');

        if (normalizedKey.length !== 32) {
            throw new Error('AES-256-GCM key must be 32 bytes');
        }

        return normalizedKey;
    }
}
