import { z } from "zod";

export const positionsSchema = z.array(z.object({ key: z.string().min(3).max(40), quantity: z.number().positive().max(1e12) })).min(1).max(60);
const snapshot = z.object({ fee: z.number().nullable(), size: z.number().nullable(), name: z.string().max(300), seen_on: z.string().max(10) });
export const watchSchema = z.array(z.object({ key: z.string().min(3).max(40), seen: snapshot.optional() })).max(300);
