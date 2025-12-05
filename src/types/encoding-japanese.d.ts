declare module 'encoding-japanese' {
    export function detect(data: Uint8Array | number[]): string | boolean;
    export function convert(data: Uint8Array | number[], options: {
        to: string;
        from: string | boolean;
    }): number[];
    export function codeToString(code: number[]): string;
}
