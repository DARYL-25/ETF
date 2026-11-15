import { redirect } from "next/navigation";

/** The full list lives in the screener, which can sort and filter it. */
export default function DatabasePage() {
  redirect("/screener?sort=name&dir=asc");
}
