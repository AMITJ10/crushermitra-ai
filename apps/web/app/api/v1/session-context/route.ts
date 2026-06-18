import { NextResponse } from "next/server";
import { plantSelectionSchema } from "@crushermitra/validation";
import { createSessionCookieValue, getCurrentSession, sessionCookieName } from "../../../../lib/session";

const plantNames = new Map([
  ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "Plant 1"],
  ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2", "Plant 2"],
  ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3", "Plant 3"]
]);

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  return NextResponse.json(session);
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const parsed = plantSelectionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plant selection" }, { status: 400 });
  }

  if (!session.allowedPlantIds.includes(parsed.data.plantId)) {
    return NextResponse.json({ error: "Plant access denied" }, { status: 403 });
  }

  const updatedSession = {
    ...session,
    activePlantId: parsed.data.plantId,
    activePlantName: plantNames.get(parsed.data.plantId) ?? "Selected plant"
  };
  const response = NextResponse.json(updatedSession);
  response.cookies.set(sessionCookieName, createSessionCookieValue(updatedSession), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}
