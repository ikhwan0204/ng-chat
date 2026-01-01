# Chat2

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.1.

## Setup Supabase

Follow these steps to set up your Supabase backend:

1.  **Create a Supabase Project**:
    *   Go to [Supabase](https://supabase.com/) and sign up or log in.
    *   Click "New project" to create a new project. Choose an organization, enter a project name, set a database password, and select a region.

2.  **Obtain Supabase API Keys**:
    *   Once your project is created, navigate to "Project Settings" -> "API" in your Supabase dashboard.
    *   Locate your `Project URL` and `anon public` key. You will need these for your application's environment variables.

3.  **Configure Environment Variables**:
    *   This project uses environment variables for Supabase configuration.
    *   If you haven't already, generate your environment files using:
        ```bash
        ng g environments
        ```
    *   Open `src/environments/environment.development.ts` and `src/environments/environment.ts` and add your Supabase URL and key. For example:

        ```typescript
        export const environment = {
          production: false,
          supabaseUrl: 'YOUR_SUPABASE_URL',
          supabaseKey: 'YOUR_SUPABASE_ANON_KEY',
        };
        ```
    *   Replace `'YOUR_SUPABASE_URL'` and `'YOUR_SUPABASE_ANON_KEY'` with the actual values obtained from your Supabase project.

4.  **Database Schema Setup**:
    *   Go to the "SQL Editor" in your Supabase dashboard and run the following SQL queries to set up the necessary tables and policies for the chat application.

    *   **Step 1: Create the `users` table**
        This table will store public profile information for users. It is linked to Supabase's internal `auth.users` table.

        ```sql
        -- Create a table for public user profiles
        CREATE TABLE users (
          id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
          full_name TEXT,
          avatar_url TEXT,
          email TEXT
        );

        -- Set up Row Level Security (RLS)
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;

        -- Allow users to view all profiles
        CREATE POLICY "Public profiles are viewable by everyone." ON users
          FOR SELECT USING (true);

        -- Allow users to insert their own profile
        CREATE POLICY "Users can insert their own profile." ON users
          FOR INSERT WITH CHECK (auth.uid() = id);

        -- Allow users to update their own profile
        CREATE POLICY "Users can update own profile." ON users
          FOR UPDATE USING (auth.uid() = id);

        -- This trigger automatically creates a profile entry when a new user signs up
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.users (id, full_name, avatar_url, email)
          VALUES (
            new.id,
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'avatar_url',
            new.email
          );
          RETURN new;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        ```

    *   **Step 2: Create a function to ensure profile exists on login**
        This function handles cases where a user might exist in `auth.users` but not in `public.users` (e.g., if they signed up before the trigger was created). It's a safety net to ensure a profile always exists for a logged-in user.

        ```sql
        CREATE OR REPLACE FUNCTION public.ensure_user_profile()
        RETURNS void AS $$
        BEGIN
          INSERT INTO public.users (id, full_name, avatar_url, email)
          SELECT
            u.id,
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'avatar_url',
            u.email
          FROM auth.users u
          WHERE u.id = auth.uid()
          ON CONFLICT (id) DO NOTHING;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        ```

    *   **Step 3: Create the `chat` table**
        This table will store the chat messages.

        ```sql
        -- Create the chat table
        CREATE TABLE chat (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          text TEXT NOT NULL,
          sender UUID REFERENCES public.users NOT NULL,
          editable BOOLEAN DEFAULT false
        );

        -- Set up Row Level Security (RLS)
        ALTER TABLE chat ENABLE ROW LEVEL SECURITY;

        -- Allow authenticated users to read all messages
        CREATE POLICY "Allow read access to all authenticated users" ON chat
          FOR SELECT TO authenticated USING (true);

        -- Allow users to insert their own messages
        CREATE POLICY "Allow users to insert their own messages" ON chat
          FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender);

        -- Allow users to delete their own messages
        CREATE POLICY "Allow users to delete their own messages" ON chat
          FOR DELETE TO authenticated USING (auth.uid() = sender);

        -- Allow users to update their own messages
        CREATE POLICY "Allow users to update their own messages" ON chat
          FOR UPDATE TO authenticated USING (auth.uid() = sender);
        ```

    *   **Step 4: Enable Realtime**
        For the chat to update in realtime, you need to enable it for the `chat` table.
        *   In your Supabase dashboard, go to "Database" -> "Replication".
        *   Find the `chat` table and click the "Enable" button under the "Realtime" column.

## Development server

To start a local development server, run:

```bash
ng serve
```


FIX HANDLE USERS FOR AVATAR_URL :
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NEW.email
  );
  RETURN NEW;
END;

-- First, drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();