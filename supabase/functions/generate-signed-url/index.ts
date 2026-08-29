import { createClient } from '@supabase/supabase-js';

// Service role client (server‑side only)
const supabaseUrl = process.env.SUPABASE_URL || 'https://dmxegktlxqsxaysqwswa.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
}
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

/**
 * Edge Function: generate-signed-url
 * Expected body: { noteId }
 * Returns: { signedUrl }
 */
export const handler = async (event: any) => {
  try {
    // ----- Authenticate caller -----
    const authHeader = event.headers?.authorization || '';
    const token = authHeader.replace('Bearer', '').trim();
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing auth token' }) };
    }
    const { data: user, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid auth token' }) };
    }
    const payload = JSON.parse(event.body || '{}');
    const { noteId } = payload;
    if (!noteId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'noteId required' }) };
    }
    // ----- Fetch note and related bundle -----
    const { data: note, error: noteErr } = await supabaseAdmin
      .from('notes')
      .select('id,storage_bucket,storage_path,bundle_id,published')
      .eq('id', noteId)
      .single();
    if (noteErr || !note) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Note not found' }) };
    }
    if (!note.published) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Note not published' }) };
    }
    // ----- Verify access permission -----
    const { data: permission, error: permErr } = await supabaseAdmin
      .from('access_permissions')
      .select('id,status')
      .eq('user_id', user.id)
      .eq('bundle_id', note.bundle_id)
      .eq('status', 'active')
      .maybeSingle();
    if (permErr || !permission) {
      return { statusCode: 403, body: JSON.stringify({ error: 'No active access permission' }) };
    }
    // ----- Generate signed URL -----
    const bucket = note.storage_bucket || 'bca-notes';
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(note.storage_path, 300); // 5 minutes
    if (signErr) {
      return { statusCode: 500, body: JSON.stringify({ error: signErr.message }) };
    }
    return { statusCode: 200, body: JSON.stringify({ signedUrl: signed?.signedUrl }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
