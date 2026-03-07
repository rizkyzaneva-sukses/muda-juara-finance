import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://xlksjdhrzbkbenodgras.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsa3NqZGhyemJrYmVub2RncmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTg4NTYsImV4cCI6MjA4ODMzNDg1Nn0.GjpnPNnhQh5o5A4BL5r3NQrkRUkU8j5zWQzC6EV3Bl4'
)

// To alter constraint we need Postgres connection or SQL function.
// Or we can just use the supabase postgres connection string if available?
// Let's check environment variables for postgres.
