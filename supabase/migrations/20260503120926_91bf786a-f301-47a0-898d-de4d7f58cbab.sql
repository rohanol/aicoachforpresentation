-- Ensure handle_new_user inserts plan/usage defaults and is idempotent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, analyses_used)
  VALUES (NEW.id, 'free', 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any users created before the trigger existed
INSERT INTO public.profiles (id, plan, analyses_used)
SELECT id, 'free', 0 FROM auth.users
ON CONFLICT (id) DO NOTHING;