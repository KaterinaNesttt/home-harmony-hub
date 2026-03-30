/**
 * Home Harmony Hub — Cloudflare Worker API
 * Replaces Supabase backend entirely.
 * DB: D1 (home-harmony-hub, id: 77b045c3-fe39-42d2-b279-9d02659c359a)
 */

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

// ─── JWT (HS256, no external lib) ────────────────────────────────────────────
async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sigB64}`;
}

async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const data = `${parts[0]}.${parts[1]}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + 'hhh-salt-2024'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getUser(req: Request, env: Env): Promise<{ id: string; email: string; display_name: string; avatar_url: string | null } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = await verifyJwt(auth.slice(7), env.JWT_SECRET || 'dev-secret-change-me');
  if (!payload?.sub) return null;
  const row = await env.DB.prepare('SELECT id,email,display_name,avatar_url FROM users WHERE id=?').bind(payload.sub).first<{ id: string; email: string; display_name: string; avatar_url: string | null }>();
  return row || null;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    // ── Auth ──
    if (path === '/api/auth/signup' && method === 'POST') {
      const { email, password, display_name } = await req.json<{ email: string; password: string; display_name: string }>();
      if (!email || !password) return err('Email and password required');
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
      if (existing) return err('Email already registered', 409);
      const id = crypto.randomUUID();
      const hash = await hashPassword(password);
      await env.DB.prepare('INSERT INTO users (id,email,password_hash,display_name) VALUES (?,?,?,?)').bind(id, email, hash, display_name || email.split('@')[0]).run();
      const token = await signJwt({ sub: id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, env.JWT_SECRET || 'dev-secret-change-me');
      return json({ token, user: { id, email, display_name: display_name || email.split('@')[0] } });
    }

    if (path === '/api/auth/signin' && method === 'POST') {
      const { email, password } = await req.json<{ email: string; password: string }>();
      const hash = await hashPassword(password);
      const user = await env.DB.prepare('SELECT id,email,display_name,avatar_url FROM users WHERE email=? AND password_hash=?').bind(email, hash).first<{ id: string; email: string; display_name: string; avatar_url: string | null }>();
      if (!user) return err('Invalid credentials', 401);
      const token = await signJwt({ sub: user.id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, env.JWT_SECRET || 'dev-secret-change-me');
      return json({ token, user });
    }

    // ── Profile ──
    if (path === '/api/profile' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      return json(user);
    }

    if (path === '/api/profile' && method === 'PATCH') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const updates = await req.json<{ display_name?: string; avatar_url?: string }>();
      const fields: string[] = [];
      const vals: unknown[] = [];
      if (updates.display_name !== undefined) { fields.push('display_name=?'); vals.push(updates.display_name); }
      if (updates.avatar_url !== undefined) { fields.push('avatar_url=?'); vals.push(updates.avatar_url); }
      if (fields.length === 0) return err('Nothing to update');
      fields.push('updated_at=?'); vals.push(new Date().toISOString());
      vals.push(user.id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=?`).bind(...vals).run();
      const updated = await env.DB.prepare('SELECT id,email,display_name,avatar_url FROM users WHERE id=?').bind(user.id).first();
      return json(updated);
    }

    // ── Tasks ──
    if (path === '/api/tasks' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const rows = await env.DB.prepare('SELECT * FROM tasks WHERE user_id=? ORDER BY pinned DESC, created_at DESC').bind(user.id).all();
      return json(rows.results.map(r => ({ ...r, pinned: r.pinned === 1 || r.pinned === true })));
    }

    if (path === '/api/tasks' && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const t = await req.json<{ title: string; description?: string; status?: string; priority?: string; deadline?: string; assignee?: string; category?: string; access?: string; pinned?: boolean }>();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO tasks (id,user_id,title,description,status,priority,deadline,assignee,category,access,pinned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, user.id, t.title, t.description || null, t.status || 'unseen', t.priority || 'medium', t.deadline || null, t.assignee || 'me', t.category || 'Дім', t.access || 'shared', t.pinned ? 1 : 0, now, now).run();
      return json({ id, user_id: user.id, ...t, created_at: now, updated_at: now, pinned: !!t.pinned });
    }

    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const id = taskMatch[1];
      if (method === 'PATCH') {
        const updates = await req.json<Record<string, unknown>>();
        const fields: string[] = [];
        const vals: unknown[] = [];
        const allowed = ['title', 'description', 'status', 'priority', 'deadline', 'assignee', 'category', 'access', 'pinned'];
        for (const k of allowed) {
          if (k in updates) {
            fields.push(`${k}=?`);
            vals.push(k === 'pinned' ? (updates[k] ? 1 : 0) : updates[k]);
          }
        }
        if (fields.length === 0) return err('Nothing to update');
        fields.push('updated_at=?'); vals.push(new Date().toISOString());
        vals.push(id); vals.push(user.id);
        await env.DB.prepare(`UPDATE tasks SET ${fields.join(',')} WHERE id=? AND user_id=?`).bind(...vals).run();
        const updated = await env.DB.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first();
        return json({ ...updated, pinned: updated?.pinned === 1 || updated?.pinned === true });
      }
      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM tasks WHERE id=? AND user_id=?').bind(id, user.id).run();
        return json({ deleted: true });
      }
    }

    // ── Shopping Lists ──
    if (path === '/api/lists' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const lists = await env.DB.prepare('SELECT * FROM shopping_lists WHERE user_id=? ORDER BY pinned DESC, created_at DESC').bind(user.id).all();
      const allItems = await env.DB.prepare(
        `SELECT * FROM shopping_items WHERE list_id IN (SELECT id FROM shopping_lists WHERE user_id=?) ORDER BY created_at ASC`
      ).bind(user.id).all();
      const itemsByList = new Map<string, unknown[]>();
      for (const item of allItems.results) {
        const lid = (item as { list_id: string }).list_id;
        if (!itemsByList.has(lid)) itemsByList.set(lid, []);
        itemsByList.get(lid)!.push({ ...item, bought: (item as { bought: number }).bought === 1 });
      }
      return json(lists.results.map(l => ({
        ...l,
        pinned: l.pinned === 1 || l.pinned === true,
        items: itemsByList.get((l as { id: string }).id) || [],
      })));
    }

    if (path === '/api/lists' && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const l = await req.json<{ title: string; type?: string; category?: string; access?: string; pinned?: boolean }>();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare('INSERT INTO shopping_lists (id,user_id,title,type,category,access,pinned,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.id, l.title, l.type || 'daily', l.category || 'Дім', l.access || 'shared', l.pinned ? 1 : 0, now).run();
      return json({ id, user_id: user.id, ...l, created_at: now, items: [], pinned: !!l.pinned });
    }

    const listMatch = path.match(/^\/api\/lists\/([^/]+)$/);
    if (listMatch) {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const id = listMatch[1];
      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM shopping_lists WHERE id=? AND user_id=?').bind(id, user.id).run();
        return json({ deleted: true });
      }
    }

    // ── Shopping Items ──
    const itemsMatch = path.match(/^\/api\/lists\/([^/]+)\/items$/);
    if (itemsMatch && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const listId = itemsMatch[1];
      const list = await env.DB.prepare('SELECT id FROM shopping_lists WHERE id=? AND user_id=?').bind(listId, user.id).first();
      if (!list) return err('List not found', 404);
      const item = await req.json<{ name: string; quantity?: string; note?: string; url?: string }>();
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO shopping_items (id,list_id,name,quantity,bought,note,url) VALUES (?,?,?,?,0,?,?)').bind(id, listId, item.name, item.quantity || '1', item.note || null, item.url || null).run();
      return json({ id, list_id: listId, ...item, bought: false });
    }

    const itemMatch = path.match(/^\/api\/lists\/([^/]+)\/items\/([^/]+)$/);
    if (itemMatch) {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const [, listId, itemId] = itemMatch;
      const list = await env.DB.prepare('SELECT id FROM shopping_lists WHERE id=? AND user_id=?').bind(listId, user.id).first();
      if (!list) return err('List not found', 404);
      if (method === 'PATCH') {
        const { bought } = await req.json<{ bought: boolean }>();
        await env.DB.prepare('UPDATE shopping_items SET bought=? WHERE id=? AND list_id=?').bind(bought ? 1 : 0, itemId, listId).run();
        return json({ updated: true });
      }
      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM shopping_items WHERE id=? AND list_id=?').bind(itemId, listId).run();
        return json({ deleted: true });
      }
    }

    return err('Not found', 404);
  },
};
