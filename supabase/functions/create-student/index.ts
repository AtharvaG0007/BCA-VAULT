import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Service role client (server‑side only)
const supabaseUrl = Deno.env.get("SUPABASE_URL") || 'https://dmxegktlxqsxaysqwswa.supabase.co';
const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || '') as string;
if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
}
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

/**
 * Edge Function: create‑student
 * Expected body: { full_name, email, phone?, course?, semester?, notes? }
 * Returns: { userId, email }
 */
export const handler = async (event: any) => {
  try {
    // ----- Authenticate caller (must be superadmin) -----
    const authHeader = event.headers?.authorization || '';
    const token = authHeader.replace('Bearer', '').trim();
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing auth token' }) };
    }
    const { data: { user: caller } = { user: null }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !caller) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid auth token' }) };
    }
    const { data: adminProfile, error: adminErr } = await supabaseAdmin
      .from('admin_profiles')
      .select('role,status')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (adminErr || !adminProfile || adminProfile.role !== 'superadmin' || adminProfile.status !== 'active') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // ----- Parse and validate payload -----
    const payload = JSON.parse(event.body || '{}');
    const { full_name, email, phone, course, semester, notes } = payload;
    let password = payload.password ? String(payload.password).trim() : "";
    if (!password) {
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      password = Array.from(array, (b) => charset[b % charset.length]).join("");
    }

    if (!full_name || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'full_name and email are required' }) };
    }

    // ----- Create or update the auth user with password -----
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, course, semester, notes: notes || '' },
      app_metadata: { role: 'student' },
    });

    let userId: string;
    if (createErr) {
      const { data: existingProfile } = await supabaseAdmin.from('profiles').select('user_id').eq('email', email).maybeSingle();
      if (existingProfile?.user_id) {
        await supabaseAdmin.auth.admin.updateUserById(existingProfile.user_id, {
          password,
          email_confirm: true,
          user_metadata: { full_name, course, semester, notes: notes || '' },
        });
        userId = existingProfile.user_id;
      } else {
        return { statusCode: 400, body: JSON.stringify({ error: createErr.message }) };
      }
    } else {
      userId = newUser.user.id;
    }

    // ----- Insert/Update profile row -----
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      user_id: userId,
      full_name,
      email,
      phone: phone || null,
      course: course || null,
      semester: semester || null,
      status: 'active',
    }, { onConflict: 'user_id' });
    if (profileErr) {
      return { statusCode: 500, body: JSON.stringify({ error: profileErr.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ userId, email, temporary_password: password }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
