import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "crushermitra-web",
    status: "ok",
    version: "0.1.0"
  });
}

