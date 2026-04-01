/**
 * Home Harmony Hub - Cloudflare Worker API
 * Replaces Supabase backend entirely.
 * DB: D1 (home-harmony-hub, id: 77b045c3-fe39-42d2-b279-9d02659c359a)
 */

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

type AccessControlledRow = {
  id: string;
  user_id: string;
  access: 'shared' | 'private';
};

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

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
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
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
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

async function getUser(req: Request, env: Env): Promise<UserRow | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = await verifyJwt(auth.slice(7), env.JWT_SECRET || 'dev-secret-change-me');
  if (!payload?.sub) return null;
  const row = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE id=?')
    .bind(payload.sub)
    .first<UserRow>();
  return row || null;
}

async function listHouseholdUsers(env: Env): Promise<UserRow[]> {
  const rows = await env.DB.prepare(
    'SELECT id, email, display_name, avatar_url FROM users ORDER BY display_name COLLATE NOCASE ASC LIMIT 2'
  ).all<UserRow>();
  return rows.results || [];
}

function normalizePinned<T extends { pinned?: number | boolean | null }>(row: T) {
  return { ...row, pinned: row.pinned === 1 || row.pinned === true };
}

function normalizeBought<T extends { bought?: number | boolean | null }>(row: T) {
  return { ...row, bought: row.bought === 1 || row.bought === true };
}

async function getAccessibleTask(env: Env, taskId: string): Promise<AccessControlledRow | null> {
  return env.DB.prepare('SELECT id, user_id, access FROM tasks WHERE id=?').bind(taskId).first<AccessControlledRow>();
}

async function getAccessibleList(env: Env, listId: string): Promise<AccessControlledRow | null> {
  return env.DB.prepare('SELECT id, user_id, access FROM shopping_lists WHERE id=?').bind(listId).first<AccessControlledRow>();
}

function canAccessRow(userId: string, row: AccessControlledRow | null) {
  return !!row && (row.user_id === userId || row.access === 'shared');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (path === '/api/auth/signup' && method === 'POST') {
      const { email, password, display_name } = await req.json<{ email: string; password: string; display_name: string }>();
      if (!email || !password) return err('Email and password required');
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
      if (existing) return err('Email already registered', 409);
      const id = crypto.randomUUID();
      const hash = await hashPassword(password);
      await env.DB.prepare('INSERT INTO users (id,email,password_hash,display_name) VALUES (?,?,?,?)')
        .bind(id, email, hash, display_name || email.split('@')[0])
        .run();
      const token = await signJwt(
        { sub: id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
        env.JWT_SECRET || 'dev-secret-change-me'
      );
      return json({ token, user: { id, email, display_name: display_name || email.split('@')[0] } });
    }

    if (path === '/api/auth/signin' && method === 'POST') {
      const { email, password } = await req.json<{ email: string; password: string }>();
      const hash = await hashPassword(password);
      const user = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE email=? AND password_hash=?')
        .bind(email, hash)
        .first<UserRow>();
      if (!user) return err('Invalid credentials', 401);
      const token = await signJwt(
        { sub: user.id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
        env.JWT_SECRET || 'dev-secret-change-me'
      );
      return json({ token, user });
    }

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
      const updated = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE id=?').bind(user.id).first<UserRow>();
      return json(updated);
    }

    if (path === '/api/users' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      return json(await listHouseholdUsers(env));
    }

    if (path === '/api/tasks' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const rows = await env.DB.prepare(`
        SELECT
          t.*,
          owner.display_name AS user_display_name,
          CASE
            WHEN t.assignee = 'both' THEN 'Обоє'
            WHEN t.assignee = 'me' THEN 'Я'
            WHEN t.assignee = 'partner' THEN 'Партнер'
            ELSE assignee.display_name
          END AS assignee_name
        FROM tasks t
        JOIN users owner ON owner.id = t.user_id
        LEFT JOIN users assignee ON assignee.id = t.assignee
        WHERE t.user_id = ? OR t.access = 'shared'
        ORDER BY t.pinned DESC, t.created_at DESC
      `).bind(user.id).all<Record<string, unknown>>();
      return json((rows.results || []).map(row => normalizePinned(row as { pinned?: number | boolean | null } & Record<string, unknown>)));
    }

    if (path === '/api/tasks' && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const task = await req.json<{
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        deadline?: string;
        assignee?: string;
        category?: string;
        access?: string;
        pinned?: boolean;
      }>();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO tasks (id,user_id,title,description,status,priority,deadline,assignee,category,access,pinned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(
        id,
        user.id,
        task.title,
        task.description || null,
        task.status || 'unseen',
        task.priority || 'medium',
        task.deadline || null,
        task.assignee || user.id,
        task.category || 'Дім',
        task.access || 'shared',
        task.pinned ? 1 : 0,
        now,
        now
      ).run();
      return json({
        id,
        user_id: user.id,
        user_display_name: user.display_name,
        assignee_name: task.assignee === 'both' ? 'Обоє' : undefined,
        ...task,
        assignee: task.assignee || user.id,
        created_at: now,
        updated_at: now,
        pinned: !!task.pinned,
      });
    }

    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const id = taskMatch[1];
      const taskRow = await getAccessibleTask(env, id);
      if (!canAccessRow(user.id, taskRow)) return err('Task not found', 404);

      if (method === 'PATCH') {
        const updates = await req.json<Record<string, unknown>>();
        const fields: string[] = [];
        const vals: unknown[] = [];
        const allowed = ['title', 'description', 'status', 'priority', 'deadline', 'assignee', 'category', 'access', 'pinned'];
        for (const key of allowed) {
          if (key in updates) {
            fields.push(`${key}=?`);
            vals.push(key === 'pinned' ? (updates[key] ? 1 : 0) : updates[key]);
          }
        }
        if (fields.length === 0) return err('Nothing to update');
        fields.push('updated_at=?'); vals.push(new Date().toISOString());
        vals.push(id);
        await env.DB.prepare(`UPDATE tasks SET ${fields.join(',')} WHERE id=?`).bind(...vals).run();
        const updated = await env.DB.prepare(`
          SELECT
            t.*,
            owner.display_name AS user_display_name,
            CASE
              WHEN t.assignee = 'both' THEN 'Обоє'
              WHEN t.assignee = 'me' THEN 'Я'
              WHEN t.assignee = 'partner' THEN 'Партнер'
              ELSE assignee.display_name
            END AS assignee_name
          FROM tasks t
          JOIN users owner ON owner.id = t.user_id
          LEFT JOIN users assignee ON assignee.id = t.assignee
          WHERE t.id=?
        `).bind(id).first<Record<string, unknown>>();
        return json(updated ? normalizePinned(updated as { pinned?: number | boolean | null } & Record<string, unknown>) : null);
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM tasks WHERE id=?').bind(id).run();
        return json({ deleted: true });
      }
    }

    if (path === '/api/lists' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const lists = await env.DB.prepare(`
        SELECT
          l.*,
          owner.display_name AS user_display_name
        FROM shopping_lists l
        JOIN users owner ON owner.id = l.user_id
        WHERE l.user_id = ? OR l.access = 'shared'
        ORDER BY l.pinned DESC, l.created_at DESC
      `).bind(user.id).all<Record<string, unknown>>();

      const allItems = await env.DB.prepare(`
        SELECT
          si.*,
          added_by.display_name AS added_by_name
        FROM shopping_items si
        JOIN shopping_lists l ON l.id = si.list_id
        LEFT JOIN users added_by ON added_by.id = si.added_by_user_id
        WHERE l.user_id = ? OR l.access = 'shared'
        ORDER BY si.created_at ASC
      `).bind(user.id).all<Record<string, unknown>>();

      const itemsByList = new Map<string, Record<string, unknown>[]>();
      for (const item of allItems.results || []) {
        const listId = (item as { list_id: string }).list_id;
        if (!itemsByList.has(listId)) itemsByList.set(listId, []);
        itemsByList.get(listId)!.push(normalizeBought(item as { bought?: number | boolean | null } & Record<string, unknown>));
      }

      return json((lists.results || []).map(list => ({
        ...normalizePinned(list as { pinned?: number | boolean | null } & Record<string, unknown>),
        items: itemsByList.get((list as { id: string }).id) || [],
      })));
    }

    if (path === '/api/lists' && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const list = await req.json<{ title: string; type?: string; category?: string; access?: string; pinned?: boolean }>();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare('INSERT INTO shopping_lists (id,user_id,title,type,category,access,pinned,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(id, user.id, list.title, list.type || 'daily', list.category || 'Дім', list.access || 'shared', list.pinned ? 1 : 0, now)
        .run();
      return json({ id, user_id: user.id, user_display_name: user.display_name, ...list, created_at: now, items: [], pinned: !!list.pinned });
    }

    const listMatch = path.match(/^\/api\/lists\/([^/]+)$/);
    if (listMatch) {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const id = listMatch[1];
      const listRow = await getAccessibleList(env, id);
      if (!canAccessRow(user.id, listRow)) return err('List not found', 404);
      if (method === 'DELETE') {
        if (listRow?.user_id !== user.id) return err('Only creator can delete the whole list', 403);
        await env.DB.prepare('DELETE FROM shopping_lists WHERE id=?').bind(id).run();
        return json({ deleted: true });
      }
    }

    const itemsMatch = path.match(/^\/api\/lists\/([^/]+)\/items$/);
    if (itemsMatch && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const listId = itemsMatch[1];
      const listRow = await getAccessibleList(env, listId);
      if (!canAccessRow(user.id, listRow)) return err('List not found', 404);
      const item = await req.json<{ name: string; quantity?: string; note?: string; url?: string }>();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO shopping_items (id,list_id,name,quantity,bought,note,url,added_by_user_id) VALUES (?,?,?,?,0,?,?,?)'
      ).bind(id, listId, item.name, item.quantity || '1', item.note || null, item.url || null, user.id).run();
      return json({
        id,
        list_id: listId,
        ...item,
        quantity: item.quantity || '1',
        bought: false,
        added_by_user_id: user.id,
        added_by_name: user.display_name,
      });
    }

    const itemMatch = path.match(/^\/api\/lists\/([^/]+)\/items\/([^/]+)$/);
    if (itemMatch) {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const [, listId, itemId] = itemMatch;
      const listRow = await getAccessibleList(env, listId);
      if (!canAccessRow(user.id, listRow)) return err('List not found', 404);
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
