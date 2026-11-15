import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, makeT, pickLang } from "./index";

/** The request's translator. Cached, so every server component in one request shares it. */
export const getT = cache(async () => makeT(pickLang((await cookies()).get(LANG_COOKIE)?.value, (await headers()).get("accept-language"))));
