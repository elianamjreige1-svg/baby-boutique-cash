import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/cart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Little Nest — Soft Baby Clothes, Cash on Delivery" },
      { name: "description", content: "Shop organic bodysuits, pajamas and knits for babies. Pay cash when it arrives." },
      { property: "og:title", content: "Little Nest — Soft Baby Clothes" },
      { property: "og:description", content: "Organic baby clothes delivered to your door. Cash on delivery." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const [cat, setCat] = useState<string | null>(null);
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () =>
      (await supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false })).data ?? [],
  });
  const shown = cat ? products.filter((p) => p.category_id === cat) : products;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-12 rounded-3xl bg-accent px-8 py-14 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Cash on delivery</p>
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold text-accent-foreground md:text-6xl">
          Gentle clothes for tiny humans
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Organic cotton, soft knits, honest prices. Pay only when it reaches your door.
        </p>
      </section>

      <div className="mb-8 flex flex-wrap gap-2">
        {[{ id: null, name: "All" }, ...categories].map((c) => (
          <button
            key={c.id ?? "all"}
            onClick={() => setCat(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">No products yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {shown.map((p) => (
            <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                )}
              </div>
              <h3 className="mt-3 text-lg">{p.name}</h3>
              <p className="text-sm font-semibold text-primary">{money(Number(p.price))}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
