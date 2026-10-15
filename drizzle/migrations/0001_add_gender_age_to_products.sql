ALTER TABLE public.products ADD COLUMN gender text NOT NULL DEFAULT 'unisex';
ALTER TABLE public.products ADD COLUMN age_group text NOT NULL DEFAULT '0-3m';
COMMENT ON COLUMN public.products.gender IS 'boy | girl | unisex';
COMMENT ON COLUMN public.products.age_group IS 'Age range label, e.g. 0-3m, 3-6m, 6-12m, 1-2y, 2-4y';