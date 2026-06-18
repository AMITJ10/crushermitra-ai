import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "../../../../../../lib/session";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  const parsed = verifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment verification payload." }, { status: 400 });
  }

  const payload = `${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`;
  const expected = createHmac("sha256", keySecret).update(payload).digest("hex");
  const actual = parsed.data.razorpay_signature;
  const valid =
    expected.length === actual.length &&
    timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(actual, "utf8"));

  if (!valid) {
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }

  return NextResponse.json({ verified: true });
}
