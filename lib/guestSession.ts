// lib/guestSession.ts

// Simple UUID-like generator — works in Edge runtime
export function generateGuestId(): string {
  return cryptoRandomString();
}

function cryptoRandomString(): string {
  // Edge-safe random string generator
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const GUEST_ID_COOKIE_NAME = "guest_id";
export const GUEST_ROOM_ID_COOKIE_NAME = "guest_room_id";

// New: store room code as well so we can route back correctly after OAuth
export const GUEST_ROOM_CODE_COOKIE_NAME = "guest_room_code";
