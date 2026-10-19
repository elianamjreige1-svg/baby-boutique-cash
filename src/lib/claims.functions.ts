import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emptyClaim, type ClaimData } from "./claim-fields";

const claimSchema = z.object({
  claimNo: z.string(),
  accidentDate: z.string(),
  insuredName: z.string(),
  insuredPolicyNo: z.string(),
  insuredVehicle: z.string(),
  insuredPlateNo: z.string(),
  otherName: z.string(),
  otherPolicyNo: z.string(),
  otherVehicle: z.string(),
  otherPlateNo: z.string(),
  amount: z.string(),
  responsibility: z.string(),
});

const INSTRUCTIONS = `You read photos of Lebanese vehicle accident reports (usually in Arabic, sometimes handwritten).
Extract the fields below and write every value in English (transliterate Arabic names into Latin letters, translate vehicle makes/models, keep plate and policy numbers exactly as written, using Western digits 0-9).
- claimNo: claim / file / reference number
- accidentDate: date of the accident as YYYY-MM-DD
- insuredName, insuredPolicyNo, insuredVehicle, insuredPlateNo: "our insured" party (first party / party A)
- otherName, otherPolicyNo, otherVehicle, otherPlateNo: the other party (second party / party B), insured or driver name
- amount: amount to settle, with currency if shown
- responsibility: the other party's responsibility percentage, number only (e.g. "100")
Use an empty string for anything not visible. Never guess.`;

export const extractClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (typeof input?.image !== "string" || !input.image.startsWith("data:image/")) throw new Error("Please choose a photo.");
    if (input.image.length > 8_000_000) throw new Error("Photo is too large.");
    return input;
  })
  .handler(async ({ data, context }): Promise<ClaimData> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions: INSTRUCTIONS,
        output: Output.object({ schema: claimSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the claim details from this accident report." },
              { type: "image", image: new URL(data.image) },
            ],
          },
        ],
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "medium",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      } as Parameters<typeof streamText>[0]);
      const out = (await (result as unknown as { output: Promise<unknown> }).output) as Partial<ClaimData>;
      return { ...emptyClaim(), ...out };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("extractClaim failed", status, e);
      if (status === 402) throw new Error("AI credits are used up. Please add credits to continue.");
      if (status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
      if (status === 403) throw new Error("AI access is blocked for this workspace.");
      throw new Error("Couldn't read the photo. You can still fill the form by hand.");
    }
  });
