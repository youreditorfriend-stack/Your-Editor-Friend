// POST /api/create-order  { itemId, uid }
// Creates a Razorpay order for the item (price looked up server-side).
import Razorpay from "razorpay";
import { findItem, json } from "./_lib";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json(res, 503, { error: "Razorpay not configured" });

  try {
    const { itemId, uid } = req.body || {};
    if (!itemId || !uid) return json(res, 400, { error: "itemId and uid are required" });

    const item = await findItem(itemId);
    if (!item) return json(res, 404, { error: "Item not found" });
    if (!item.price || item.price <= 0) return json(res, 400, { error: "Item is free — no payment needed" });

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: Math.round(item.price * 100), // paise
      currency: "INR",
      receipt: `${itemId}`.slice(0, 40),
      notes: { itemId, uid, itemName: item.name },
    });

    return json(res, 200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      itemName: item.name,
    });
  } catch (e: any) {
    console.error("create-order failed:", e);
    return json(res, 500, { error: "Failed to create order" });
  }
}
