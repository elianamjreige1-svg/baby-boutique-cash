import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useSession } from "@/lib/use-session";
import { extractClaim } from "@/lib/claims.functions";
import { emptyClaim, type Attachments, type ClaimData } from "@/lib/claim-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/admin_/claims")({
  head: () => ({
    meta: [
      { title: "Accident Claim Letter — CuddleKids Admin" },
      { name: "description", content: "Read an accident report photo and create a claim letter." },
      { property: "og:title", content: "Accident Claim Letter" },
      { property: "og:description", content: "Create motor claim letters from report photos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Claims,
});

async function photoToDataUrl(file: File, max = 1800): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL("image/jpeg", 0.85);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const FIELDS: { key: keyof ClaimData; label: string; group: string }[] = [
  { key: "claimNo", label: "Claim No.", group: "General" },
  { key: "accidentDate", label: "Accident date", group: "General" },
  { key: "insuredName", label: "Insured name", group: "Our insured" },
  { key: "insuredPolicyNo", label: "Policy No.", group: "Our insured" },
  { key: "insuredVehicle", label: "Vehicle", group: "Our insured" },
  { key: "insuredPlateNo", label: "Plate No.", group: "Our insured" },
  { key: "otherName", label: "Insured / Driver name", group: "Other party" },
  { key: "otherPolicyNo", label: "Policy No.", group: "Other party" },
  { key: "otherVehicle", label: "Vehicle", group: "Other party" },
  { key: "otherPlateNo", label: "Plate No.", group: "Other party" },
  { key: "amount", label: "Amount to settle", group: "Settlement" },
  { key: "responsibility", label: "Responsibility %", group: "Settlement" },
];

function Claims() {
  const { isAdmin, ready } = useSession();
  const extract = useServerFn(extractClaim);
  const [data, setData] = useState<ClaimData>(emptyClaim());
  const [att, setAtt] = useState<Attachments>({ discharge: false, bills: false, expert: true });
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [file, setFile] = useState<Blob | null>(null);

  if (!ready) return <p className="p-12 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <p className="p-12 text-center">You don't have admin access.</p>;

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    setFile(null);
    setReading(true);
    try {
      const url = await photoToDataUrl(f);
      setPreview(url);
      const res = await extract({ data: { image: url } });
      setData(res);
      toast.success("Report read — please check the details.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read the photo.");
    } finally {
      setReading(false);
    }
  };

  const createDoc = async () => {
    const { buildClaimDocx } = await import("@/lib/claim-docx");
    setFile(await buildClaimDocx(data, att));
  };
  const fileName = `Claim-${(data.claimNo || "letter").replace(/[^\w-]+/g, "_")}.docx`;

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Back to admin</Link>
      <h1 className="mb-2 mt-2 text-3xl font-semibold">Accident claim letter</h1>
      <p className="mb-6 text-muted-foreground">Take or choose a photo of the accident report. The details are filled in for you to check, then download the Word letter.</p>

      <div className="mb-8 rounded-lg border border-border p-4">
        <Label htmlFor="report">Report photo</Label>
        <Input id="report" type="file" accept="image/*" disabled={reading} className="mt-2"
          onChange={(e) => onPhoto(e.target.files?.[0])} />
        {reading && <p className="mt-3 text-sm text-muted-foreground">Reading the report… this can take up to a minute.</p>}
        {preview && <img src={preview} alt="Accident report" className="mt-4 max-h-80 rounded-md border border-border object-contain" />}
      </div>

      {groups.map((g) => (
        <section key={g} className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">{g}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.filter((f) => f.group === g).map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input id={f.key} value={data[f.key]} className="mt-1"
                  onChange={(e) => { setFile(null); setData({ ...data, [f.key]: e.target.value }); }} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Attached documents</h2>
        {([["discharge", "Signed Discharge"], ["bills", "Repairs & Spare Parts Bills"], ["expert", "Expert Report"]] as const).map(([k, l]) => (
          <label key={k} className="mb-2 flex items-center gap-2">
            <Checkbox checked={att[k]} onCheckedChange={(v) => { setFile(null); setAtt({ ...att, [k]: v === true }); }} />
            {l}
          </label>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button onClick={createDoc} disabled={reading}>Create Word letter</Button>
        {file && <Button variant="secondary" onClick={() => downloadBlob(file, fileName)}>Download {fileName}</Button>}
        <Button variant="ghost" onClick={() => { setData(emptyClaim()); setPreview(null); setFile(null); }}>Clear</Button>
      </div>
    </div>
  );
}
