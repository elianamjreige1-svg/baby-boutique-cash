# Optimize product photo uploads

## Where photos are stored today
- There is **no file storage** for product photos right now.
- When you pick a photo in the admin panel, the browser shrinks it to at most 900px, turns it into a JPEG (80% quality), and saves the **whole picture as text** in the product record in the database.
- The 4 starter photos are files bundled with the website.
- Downside: every photo makes the database bigger (text encoding adds about 33%), and the shop page loads all photo data along with the product list.

## What I propose
1. **Turn on Lovable Cloud file storage** for product photos (a public "product-images" folder, free tier). Only admins can upload, replace or delete files there; anyone can view them. No database table changes.
2. **Optimize in the browser before upload**:
   - Resize to fit within 1000 x 1000, keeping the shape.
   - Convert to WebP at 82% quality. If the file is still over about 200 KB, try again at slightly lower quality (down to 70%) and stop there to protect quality.
   - If the browser can't make WebP (some older iPhones), fall back to the original file type, still resized.
   - Phone photos taken sideways are rotated correctly.
3. **Preview before upload**: after you pick a photo you see the optimized image with its size (for example "1000x750 · 142 KB, was 3.8 MB"), plus "Upload" and "Choose another" buttons.
4. **Upload and errors**: a progress state while uploading; if it fails you see a clear message and a "Retry" button. Saving the product waits until the upload is done.
5. **Keep everything else as is**: existing products and their current photos (including ones saved as text) keep working untouched. Nothing is deleted. A new photo is used only when you upload one for a product. Design and other features unchanged.

## Testing
- I'll test with a JPG, a PNG, and a large (about 4000px, several MB) phone-style photo, and check the resulting size, preview, upload, and the photo appearing in the shop, on both phone and desktop screen sizes.

## Technical details
- Storage bucket `product-images` (public read) with storage policies: insert/update/delete only when `has_role(auth.uid(),'admin')`.
- Optimization via `createImageBitmap(file, { imageOrientation: 'from-image' })` + canvas `toBlob('image/webp', q)`; check returned blob type to detect WebP support; no new libraries.
- Upload with `supabase.storage.from('product-images').upload(uuid.webp)`, then store `getPublicUrl()` in the existing `image_url` column.
- Changes limited to the photo field in `src/routes/_authenticated/admin.tsx` plus one small image helper file with a unit test for the size/quality rules.
