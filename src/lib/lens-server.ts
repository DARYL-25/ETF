import { cookies } from "next/headers";
import { LENS_COOKIE, lensCountry } from "./lens";

export async function getLens() {
  return lensCountry((await cookies()).get(LENS_COOKIE)?.value);
}
