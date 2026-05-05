const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
  realtime: {
    transport: ws,
  }
});

async function test() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, home_team:teams!home_team_id(color_primary, color_secondary), away_team:teams!away_team_id(color_primary, color_secondary)')
    .limit(1);
  console.log(error ? error : JSON.stringify(data, null, 2));
}

test();
