import { createClient } from '@supabase/supabase-js';

// Service role client (server‑side only)
const supabaseUrl = process.env.SUPABASE_URL || 'https://dmxegktlxqsxaysqwswa.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
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
    const { data: caller, error: callerErr } = await supabaseAdmin.auth.getUser(token);
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
    if (!full_name || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'full_name and email are required' }) };
    }

    // ----- Check if user already exists -----
    const { data: existingUser } = await supabaseAdmin.auth.api.getUserByEmail(email).catch(() => ({ data: null }));
    if (existingUser) {
      return { statusCode: 409, body: JSON.stringify({ error: 'User already exists' }) };
    }

    // ----- Create the auth user (invitation) -----
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      phone,
      user_metadata: { full_name, course, semester, notes: notes || '' },
      app_metadata: { role: 'student' },
    });
    if (createErr) {
      return { statusCode: 500, body: JSON.stringify({ error: createErr.message }) };
    }

    // ----- Insert/Update profile row -----
    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      user_id: newUser.id,
      full_name,
      email,
      phone: phone || null,
      course: course || null,
      semester: semester || null,
      status: 'active',
    });
    if (profileErr) {
      return { statusCode: 500, body: JSON.stringify({ error: profileErr.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ userId: newUser.id, email }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
