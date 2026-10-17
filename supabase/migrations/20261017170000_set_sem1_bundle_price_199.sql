-- Set the published Semester 1 BCA Vault bundle to the universal student price.
-- Safe to re-run: only published Semester 1 bundle rows are updated.
UPDATE public.bundles
SET price = 199
WHERE published = true
  AND title ILIKE '%sem%1%';
