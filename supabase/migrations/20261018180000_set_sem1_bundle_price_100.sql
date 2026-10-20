-- Set the published Semester 1 bundle to the current universal student price.
-- Safe to re-run; does not modify payment history or other bundles.
UPDATE public.bundles
SET price = 100
WHERE published = true
  AND title ILIKE '%sem%1%';
