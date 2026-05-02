INSERT INTO public.user_roles (user_id, role)
VALUES ('4af9b2a2-b735-475b-9031-390897896633', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;