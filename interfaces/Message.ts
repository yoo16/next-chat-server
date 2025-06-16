export interface Message {
    room?: string;
    userId?: string;
    text: string;
    buffer?: ArrayBuffer;
    sender: string;
    date?: string;
}