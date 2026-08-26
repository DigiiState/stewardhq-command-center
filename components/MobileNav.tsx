import Link from "next/link";

export function MobileNav() {
  return (
    <nav className="mobileNav">
      <Link href="/">Home</Link>
      <Link href="/businesses">Business</Link>
      <Link href="/agents">Agents</Link>
      <Link href="/reviews">Review</Link>
      <a href="#command">AI</a>
    </nav>
  );
}
