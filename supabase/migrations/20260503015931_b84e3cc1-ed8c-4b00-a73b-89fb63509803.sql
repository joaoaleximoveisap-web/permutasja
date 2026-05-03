-- Make user_id nullable to allow guest access without a valid user record
ALTER TABLE public.import_sessions 
ALTER COLUMN user_id DROP NOT NULL;

-- Identify and drop the foreign key constraint that requires user_id to exist in a user/profile table
-- We use a DO block to find the constraint name dynamically if it follows common naming patterns
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'import_sessions' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Drop the constraint. Standard naming is usually [table]_[column]_fkey
        ALTER TABLE public.import_sessions DROP CONSTRAINT IF EXISTS import_sessions_user_id_fkey;
    END IF;
END $$;
