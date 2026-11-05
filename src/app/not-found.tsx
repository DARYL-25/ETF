import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-[60ch]">
      <h1 className="text-[2rem]">Page not found</h1>
      <p className="mt-2 text-muted">If you followed a link to an ETF, it is not in the database yet. Try the search box, or browse the <Link href="/screener" className="prose-link">screener</Link>.</p>
    </div>
  );
}
