ALTER TABLE public.cuts DROP CONSTRAINT IF EXISTS cuts_bone_spec_check;
ALTER TABLE public.cuts ADD CONSTRAINT cuts_bone_spec_check CHECK (bone_spec IN ('Bone-In','Boneless','Offals'));