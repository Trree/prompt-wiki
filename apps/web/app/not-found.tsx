import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <h1>Entry not found.</h1>
      <p>The requested route does not map to any generated content entry.</p>
      <Link className="entry-link" href="/">
        Back home
      </Link>
    </section>
  );
}

