/**
 * lib/uuid.ts
 * Tiny UUID v4 generator — used to create client-side IDs for optimistic
 * Supabase inserts, avoiding a round-trip before navigation.
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
