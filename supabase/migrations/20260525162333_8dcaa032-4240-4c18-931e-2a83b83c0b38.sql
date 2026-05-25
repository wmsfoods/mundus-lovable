ALTER TABLE public.cuts ADD COLUMN IF NOT EXISTS bone_spec text NOT NULL DEFAULT 'Boneless';
ALTER TABLE public.cuts DROP CONSTRAINT IF EXISTS cuts_bone_spec_check;
ALTER TABLE public.cuts ADD CONSTRAINT cuts_bone_spec_check CHECK (bone_spec IN ('Bone-In','Boneless'));
UPDATE public.cuts SET bone_spec = 'Boneless' WHERE bone_spec IS NULL OR bone_spec NOT IN ('Bone-In','Boneless');