import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import Config from 'src/Services/Config/Config';

type TGCMBundle = {
    ct: Buffer;
    iv: Buffer;
    tag: Buffer;
};

export default class Security {
    public static hashString(password: string, salt: string): string {
        return bcryptjs.hashSync(password, salt);
    }

    public static encryptAesGCM(plaintext: string): TGCMBundle {
        const authConfig = Config.getAuthConfig();

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(
            'aes-256-gcm',
            authConfig.aes256GcmKey,
            iv
        );
        const ciphertext = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();

        return {
            ct: ciphertext,
            iv: iv,
            tag: tag,
        };
    }

    public static decryptAesGCM(bundle: TGCMBundle): string {
        const authConfig = Config.getAuthConfig();

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            authConfig.aes256GcmKey,
            bundle.iv
        );
        decipher.setAuthTag(bundle.tag);

        const plaintext = Buffer.concat([
            decipher.update(bundle.ct),
            decipher.final(),
        ]);

        return plaintext.toString('utf8');
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
}
