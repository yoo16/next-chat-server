export interface AuthUser {
    userId: string;
    token: string;
    password?: string;
    profile?: string;
    image?: string;
}