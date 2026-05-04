
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-media', 'live-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read live-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'live-media');

CREATE POLICY "Public upload live-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'live-media');

CREATE POLICY "Public update live-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'live-media');
