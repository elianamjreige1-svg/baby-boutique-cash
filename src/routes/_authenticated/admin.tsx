import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSession } from "@/lib/use-session";
import { money } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Little Nest" },
      { name: "description", content: "Manage products, categories and orders." },
      { property: "og:title", content: "Admin — Little Nest" },
      { property: "og:description", content: "Little Nest admin dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function Admin() {
  const { isAdmin, ready } = useSession();
  if (!ready) return <p className="p-12 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <p className="p-12 text-center">You don't have admin access.</p>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-4xl font-semibold">Admin</h1>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="products"><Products /></TabsContent>
        <TabsContent value="categories"><Categories /></TabsContent>
      </Tabs>
    </div>
  );
}

function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
}

/* ---------------- Products ---------------- */
type Product = Tables<"products">;
const emptyProduct = { name: "", description: "", price: "0", image_url: "", category_id: "", sizes: "", stock: "0", active: true, gender: "unisex", age_group: "0-3m" };
const GENDER_OPTIONS = ["unisex", "boy", "girl"];
const AGE_OPTIONS = ["0-3m", "3-6m", "6-12m", "1-2y", "2-4y"];

function Products() {
  const qc = useQueryClient();
  const { data: cats = [] } = useCategories();
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(emptyProduct);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
  const openNew = () => { setEditing(null); setF(emptyProduct); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setF({ name: p.name, description: p.description, price: String(p.price), image_url: p.image_url ?? "", category_id: p.category_id ?? "", sizes: p.sizes.join(", "), stock: String(p.stock), active: p.active, gender: p.gender, age_group: p.age_group });
    setOpen(true);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const row = {
      name: f.name.trim(),
      description: f.description,
      price: Number(f.price) || 0,
      image_url: f.image_url.trim() || null,
      category_id: f.category_id || null,
      sizes: f.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      stock: parseInt(f.stock) || 0,
      active: f.active,
      gender: f.gender,
      age_group: f.age_group,
    };
    const { error } = editing
      ? await supabase.from("products").update(row).eq("id", editing.id)
      : await supabase.from("products").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success("Product saved");
    setOpen(false);
    refresh();
  };
  const del = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    refresh();
  };

  return (
    <div className="mt-4">
      <Button onClick={openNew} className="mb-4 rounded-full"><Plus className="h-4 w-4" /> New product</Button>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Product</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Visible</th><th className="p-3" /></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="flex items-center gap-3 p-3">
                  <div className="h-12 w-10 overflow-hidden rounded bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
                  {p.name}
                </td>
                <td className="p-3">{money(Number(p.price))}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.active ? "Yes" : "No"}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Price</Label><Input type="number" step="0.01" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div className="space-y-1"><Label>Stock</Label><Input type="number" min="0" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Image URL</Label><Input placeholder="https://…" value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
                <option value="">None</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>For</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
                  {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Age group</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.age_group} onChange={(e) => setF({ ...f, age_group: e.target.value })}>
                  {AGE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label>Sizes (comma separated)</Label><Input placeholder="0-3M, 3-6M" value={f.sizes} onChange={(e) => setF({ ...f, sizes: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><Label>Visible in shop</Label></div>
            <Button type="submit" className="w-full rounded-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Categories ---------------- */
function Categories() {
  const qc = useQueryClient();
  const { data: cats = [] } = useCategories();
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim() });
    if (error) { toast.error(error.message); return; }
    setName(""); refresh();
  };
  const rename = async (id: string, current: string) => {
    const n = prompt("New name", current);
    if (!n?.trim()) return;
    const { error } = await supabase.from("categories").update({ name: n.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this category? Products will stay but lose the category.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="mt-4 max-w-md">
      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {cats.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3">
            {c.name}
            <span>
              <Button variant="ghost" size="icon" onClick={() => rename(c.id, c.name)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Orders ---------------- */
function Orders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated"); refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  if (orders.length === 0) return <p className="mt-6 text-muted-foreground">No orders yet.</p>;
  return (
    <div className="mt-4 space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">#{o.id.slice(0, 8)} · {o.customer_name}</p>
              <p className="text-sm text-muted-foreground">{o.phone} · {o.address}, {o.city}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · Cash on delivery</p>
              {o.notes && <p className="mt-1 text-sm italic">“{o.notes}”</p>}
            </div>
            <div className="flex items-center gap-2">
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button variant="ghost" size="icon" onClick={() => del(o.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.quantity} × {i.product_name}{i.size ? ` (${i.size})` : ""}</span>
                <span>{money(Number(i.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-right font-semibold">Total {money(Number(o.total))}</p>
        </div>
      ))}
    </div>
  );
}
