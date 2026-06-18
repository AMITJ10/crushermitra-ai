import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "../../../../../../lib/session";
import { planDefinitions } from "../../../../../../lib/plans";

const orderSchema = z.object({
  planCode: z.enum(["starter", "growth", "enterprise"])
});

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan selection." }, { status: 400 });
  }

  const plan = planDefinitions.find((item) => item.code === parsed.data.planCode);
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 404 });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      amount: plan.price * 100,
      currency: "INR",
      receipt: `crushermitra_${plan.code}_${Date.now()}`,
      notes: {
        planCode: plan.code,
        userId: session.userId,
        organisationId: session.organisationId
      }
    })
  });

  const body = (await response.json()) as unknown;
  if (!response.ok) {
    return NextResponse.json({ error: "Unable to create Razorpay order.", details: body }, { status: 502 });
  }

  return NextResponse.json(body);
}
