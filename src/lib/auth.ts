import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getSecret() {
  const jwt = process.env.JWT_SECRET;
  if (!jwt && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET muss in Produktion gesetzt sein!");
  }
  return new TextEncoder().encode(jwt || "dev-only-secret-not-for-production");
}

export type TokenPayload = {
  sub: string;
  role?: string;
  roleId?: string;
  type: "employee" | "admin";
};

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}
