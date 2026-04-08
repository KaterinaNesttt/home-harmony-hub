/**
 * Home Harmony Hub - Cloudflare Worker API
 * DB: D1 (home-harmony-hub)
 */

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  WARDROBE_BUCKET?: R2Bucket;
  ANTHROPIC_API_KEY?: string;
}

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  event_type: 'shared_list_created' | 'task_assigned';
  title: string;
  body: string;
  entity_id: string;
  entity_type: 'list' | 'task';
  link: string;
  read_at: string | null;
  created_at: string;
};

type AccessControlledRow = {
  id: string;
  user_id: string;
  access: 'shared' | 'private';
};

type WardrobeItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  seasons: string;
  colors: string | null;
  temp_min: number | null;
  temp_max: number | null;
  description: string | null;
  photo_key: string | null;
  created_at: string;
};

type WardrobeSuggestion = {
  outfit: string[];
  explanation: string;
};

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar_url: string | null;
  event_type: string;
  title: string;
  body: string;
  entity_id: string | null;
  entity_type: string | null;
  link: string | null;
  created_at: string;
};

type NotificationPayload = {
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  event_type: string;
  title: string;
  body: string;
  entity_id: string;
  entity_type: string;
  link: string;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const DRESS_REGEX = /сукн|платт|dress/i;
const SUNDRESS_REGEX = /сарафан/i;
const HEELS_REGEX = /підбор|каблук|heels?|stiletto/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

function extFromContentType(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

function itemPhotoUrl(req: Request, itemId: string) {
  return `${new URL(req.url).origin}/api/wardrobe/photo/${itemId}`;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function normalizePinned<T extends { pinned?: number | boolean | null }>(row: T) {
  return { ...row, pinned: row.pinned === 1 || row.pinned === true };
}

function normalizeBought<T extends { bought?: number | boolean | null }>(row: T) {
  return { ...row, bought: row.bought === 1 || row.bought === true };
}

function canAccessRow(userId: string, row: AccessControlledRow | null) {
  return !!row && (row.user_id === userId || row.access === 'shared');
}

function currentSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month === 12 || month <= 2) return 'Зима';
  if (month >= 3 && month <= 5) return 'Весна';
  if (month >= 6 && month <= 8) return 'Літо';
  return 'Осінь';
}

function isDressLike(item: Pick<WardrobeItemRow, 'name' | 'category'>) {
  return DRESS_REGEX.test(item.name) || DRESS_REGEX.test(item.category);
}

function isSundressLike(item: Pick<WardrobeItemRow, 'name' | 'category'>) {
  return SUNDRESS_REGEX.test(item.name) || SUNDRESS_REGEX.test(item.category);
}

function isHeelsLike(item: Pick<WardrobeItemRow, 'name' | 'description'>) {
  return HEELS_REGEX.test(item.name) || HEELS_REGEX.test(item.description || '');
}

function wardrobeItemToResponse(req: Request, row: WardrobeItemRow) {
  return {
    ...row,
    seasons: parseJsonArray(row.seasons),
    photo_url: row.photo_key ? itemPhotoUrl(req, row.id) : null,
  };
}

function isSeasonAllowed(item: WardrobeItemRow, season: string) {
  const seasons = parseJsonArray(item.seasons);
  return seasons.length === 0 || seasons.includes(season);
}

function isTempAllowed(item: WardrobeItemRow, temp: number) {
  if (item.temp_min !== null && temp < item.temp_min) return false;
  if (item.temp_max !== null && temp > item.temp_max) return false;
  return true;
}

function scoreForTemp(item: WardrobeItemRow, temp: number) {
  const min = item.temp_min ?? temp;
  const max = item.temp_max ?? temp;
  return Math.abs((min + max) / 2 - temp);
}

function chooseBest(items: WardrobeItemRow[], temp: number, predicate?: (item: WardrobeItemRow) => boolean) {
  const filtered = predicate ? items.filter(predicate) : items;
  return filtered.sort((a, b) => scoreForTemp(a, temp) - scoreForTemp(b, temp))[0] ?? null;
}

function buildFallbackSuggestion(
  items: WardrobeItemRow[],
  temp: number,
  tempMin: number,
  tempMax: number,
  weatherDesc: string,
  precip: number,
  windSpeed: number,
  season: string,
) {
  const available = items.filter((item) => {
    if (!isSeasonAllowed(item, season)) return false;
    if (!isTempAllowed(item, temp)) return false;
    if (isHeelsLike(item)) return false;
    if (isDressLike(item)) return false;
    if (isSundressLike(item) && !(temp > 22 && season === 'Літо')) return false;
    return true;
  });

  const outerwearRequired = temp < 15 || precip > 40;
  const winterJacketOnly = temp < 3;
  const deepWinter = temp < 0;
  const outerwear = outerwearRequired
    ? chooseBest(available, temp, (item) => {
        if (item.category !== 'Верхній одяг') return false;
        const lower = `${item.name} ${item.description || ''}`.toLowerCase();
        if (winterJacketOnly) return /куртк|пуховик/.test(lower);
        if (temp >= 15 && temp <= 19) return /пальт|тренч/.test(lower);
        if (temp >= 10 && temp <= 14) return /куртк|пальт|тренч/.test(lower);
        if (temp >= 4 && temp <= 6) return /куртк/.test(lower);
        return true;
      })
    : null;

  const top = chooseBest(available, temp, (item) => item.category === 'Светр/кофта' || item.category === 'Футболка');
  const bottom = chooseBest(available, temp, (item) => item.category === 'Штани/джинси' || (temp > 25 && item.category === 'Спідниця'));
  const shoes = chooseBest(available, temp, (item) => item.category === 'Взуття');
  const accessory = chooseBest(available, temp, (item) => item.category === 'Аксесуар');

  const selected = [outerwear, top, bottom, shoes, accessory].filter((item): item is WardrobeItemRow => !!item);
  const explanation = [
    `Зараз ${temp}°C, вдень від ${tempMin}°C до ${tempMax}°C.`,
    weatherDesc ? `Погода: ${weatherDesc}.` : '',
    outerwear
      ? deepWinter
        ? 'Для цього сценарію потрібна саме зимова куртка.'
        : outerwearRequired
          ? `Верхній шар додано через ${precip > 40 ? 'ризик опадів' : 'прохолоду'}.`
          : ''
      : outerwearRequired
        ? 'У гардеробі не знайшла ідеального верхнього шару під цю погоду.'
        : '',
    windSpeed > 10 ? 'Через вітер варто додати шарф або хустку.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    available,
    suggestion: {
      outfit: selected.map((item) => item.id),
      explanation,
    },
  };
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
    ['sign'],
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
      ['verify'],
    );
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
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
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getUser(req: Request, env: Env): Promise<UserRow | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = await verifyJwt(auth.slice(7), env.JWT_SECRET || 'dev-secret-change-me');
  if (!payload?.sub) return null;
  const row = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE id=?').bind(payload.sub).first<UserRow>();
  return row || null;
}

async function listHouseholdUsers(env: Env): Promise<UserRow[]> {
  const rows = await env.DB.prepare(
    'SELECT id, email, display_name, avatar_url FROM users ORDER BY display_name COLLATE NOCASE ASC LIMIT 2',
  ).all<UserRow>();
  return rows.results || [];
}

async function createNotifications(env: Env, recipients: UserRow[], payload: NotificationPayload) {
  if (!recipients.length) return;

  const statements = recipients.map((recipient) => env.DB.prepare(
    `INSERT INTO notifications (
      id,
      recipient_user_id,
      actor_id,
      actor_name,
      actor_avatar_url,
      event_type,
      title,
      body,
      entity_id,
      entity_type,
      link,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    recipient.id,
    payload.actor_id,
    payload.actor_name,
    payload.actor_avatar_url,
    payload.event_type,
    payload.title,
    payload.body,
    payload.entity_id,
    payload.entity_type,
    payload.link,
    new Date().toISOString(),
  ));

  await env.DB.batch(statements);
}

async function getAccessibleTask(env: Env, taskId: string): Promise<AccessControlledRow | null> {
  return env.DB.prepare('SELECT id, user_id, access FROM tasks WHERE id=?').bind(taskId).first<AccessControlledRow>();
}

async function getAccessibleList(env: Env, listId: string): Promise<AccessControlledRow | null> {
  return env.DB.prepare('SELECT id, user_id, access FROM shopping_lists WHERE id=?').bind(listId).first<AccessControlledRow>();
}

async function getWardrobeItem(env: Env, itemId: string) {
  return env.DB.prepare(
    'SELECT id, user_id, name, category, seasons, colors, temp_min, temp_max, description, photo_key, created_at FROM wardrobe_items WHERE id=?',
  ).bind(itemId).first<WardrobeItemRow>();
}

function extractJsonObject(text: string): WardrobeSuggestion | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed.outfit) || typeof parsed.explanation !== 'string') return null;
    return {
      outfit: parsed.outfit.filter((id: unknown): id is string => typeof id === 'string'),
      explanation: parsed.explanation,
    };
  } catch {
    return null;
  }
}

async function callAnthropicSuggestion(
  apiKey: string,
  temp: number,
  tempMin: number,
  tempMax: number,
  weatherDesc: string,
  availableItems: Array<ReturnType<typeof wardrobeItemToResponse>>,
) {
  const prompt = `Ти стиліст для жінки 30 років. Зараз ${temp}°C, ${weatherDesc}, протягом дня від ${tempMin}°C до ${tempMax}°C.

Доступний гардероб:
${JSON.stringify(availableItems)}

Правила:
- НЕ рекомендуй сукні та плаття
- НЕ рекомендуй взуття на підборах
- Сарафани тільки при T > +22°C
- При T < +5°C обов'язково тепла куртка, НЕ пальто
- При T від +10°C до +19°C — пальто або тренч
- Обери 1 образ: верх + низ + взуття + аксесуари (опційно)
- Поверни ТІЛЬКИ JSON: { "outfit": [id1, id2, id3], "explanation": "короткий текст чому" }`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`);
  }

  const data = await response.json<{ content?: Array<{ type: string; text?: string }> }>();
  const text = data.content?.find((part) => part.type === 'text')?.text || '';
  return extractJsonObject(text);
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
        env.JWT_SECRET || 'dev-secret-change-me',
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
        env.JWT_SECRET || 'dev-secret-change-me',
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
      const values: unknown[] = [];
      if (updates.display_name !== undefined) {
        fields.push('display_name=?');
        values.push(updates.display_name);
      }
      if (updates.avatar_url !== undefined) {
        fields.push('avatar_url=?');
        values.push(updates.avatar_url);
      }
      if (fields.length === 0) return err('Nothing to update');
      fields.push('updated_at=?');
      values.push(new Date().toISOString(), user.id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=?`).bind(...values).run();
      const updated = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE id=?').bind(user.id).first<UserRow>();
      return json(updated);
    }

    if (path === '/api/users' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      return json(await listHouseholdUsers(env));
    }

    if (path === '/api/notifications' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);

      const since = url.searchParams.get('since') || new Date(0).toISOString();
      const rows = await env.DB.prepare(`
        SELECT
          id,
          recipient_user_id,
          actor_id,
          actor_name,
          actor_avatar_url,
          event_type,
          title,
          body,
          entity_id,
          entity_type,
          link,
          created_at
        FROM notifications
        WHERE recipient_user_id = ? AND created_at > ?
        ORDER BY created_at ASC
      `).bind(user.id, since).all<NotificationRow>();

      return json((rows.results || []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        link: row.link,
        created_at: row.created_at,
      })));
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
      return json((rows.results || []).map((row) => normalizePinned(row as { pinned?: number | boolean | null } & Record<string, unknown>)));
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
        'INSERT INTO tasks (id,user_id,title,description,status,priority,deadline,assignee,category,access,pinned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
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
        now,
      ).run();

      if (task.assignee && task.assignee !== 'both' && task.assignee !== user.id) {
        const recipient = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE id=?')
          .bind(task.assignee)
          .first<UserRow>();
        if (recipient) {
          await createNotifications(env, [recipient], {
            actor_id: user.id,
            actor_name: user.display_name,
            actor_avatar_url: user.avatar_url,
            event_type: 'task_assigned',
            title: 'Нова призначена задача',
            body: `${user.display_name} призначив(-ла) вам задачу: ${task.title}`,
            entity_id: id,
            entity_type: 'task',
            link: `/?tab=tasks&taskId=${id}`,
          });
        }
      }
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
        const values: unknown[] = [];
        const allowed = ['title', 'description', 'status', 'priority', 'deadline', 'assignee', 'category', 'access', 'pinned'];
        for (const key of allowed) {
          if (key in updates) {
            fields.push(`${key}=?`);
            values.push(key === 'pinned' ? (updates[key] ? 1 : 0) : updates[key]);
          }
        }
        if (fields.length === 0) return err('Nothing to update');
        fields.push('updated_at=?');
        values.push(new Date().toISOString(), id);
        await env.DB.prepare(`UPDATE tasks SET ${fields.join(',')} WHERE id=?`).bind(...values).run();
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

      return json((lists.results || []).map((list) => ({
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
      if ((list.access || 'shared') === 'shared') {
        const household = await listHouseholdUsers(env);
        const recipients = household.filter((person) => person.id !== user.id);
        if (recipients.length) {
          await createNotifications(env, recipients, {
            actor_id: user.id,
            actor_name: user.display_name,
            actor_avatar_url: user.avatar_url,
            event_type: 'shared_list_created',
            title: 'РќРѕРІРёР№ СЃРїРёСЃРѕРє',
            body: `${user.display_name} СЃС‚РІРѕСЂРёРІ(-Р»Р°) СЃРїРёСЃРѕРє: ${list.title}`,
            entity_id: id,
            entity_type: 'list',
            link: `/?tab=shopping&listId=${id}`,
          });
        }
      }
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
        'INSERT INTO shopping_items (id,list_id,name,quantity,bought,note,url,added_by_user_id) VALUES (?,?,?,?,0,?,?,?)',
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

    if (path === '/api/wardrobe' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const rows = await env.DB.prepare(
        'SELECT id, user_id, name, category, seasons, colors, temp_min, temp_max, description, photo_key, created_at FROM wardrobe_items WHERE user_id=? ORDER BY created_at DESC',
      ).bind(user.id).all<WardrobeItemRow>();
      return json((rows.results || []).map((row) => wardrobeItemToResponse(req, row)));
    }

    if (path === '/api/wardrobe' && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const payload = await req.json<{
        name: string;
        category: string;
        seasons?: string[];
        colors?: string | null;
        temp_min?: number | null;
        temp_max?: number | null;
        description?: string | null;
        photo_key?: string | null;
      }>();
      if (!payload.name?.trim()) return err('Name is required');
      if (!payload.category?.trim()) return err('Category is required');
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO wardrobe_items (id,user_id,name,category,seasons,colors,temp_min,temp_max,description,photo_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      ).bind(
        id,
        user.id,
        payload.name.trim(),
        payload.category.trim(),
        JSON.stringify(payload.seasons || []),
        payload.colors || null,
        payload.temp_min ?? null,
        payload.temp_max ?? null,
        payload.description || null,
        payload.photo_key || null,
        new Date().toISOString(),
      ).run();
      const created = await getWardrobeItem(env, id);
      return json(created ? wardrobeItemToResponse(req, created) : null);
    }

    if (path === '/api/wardrobe/photo' && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      if (!env.WARDROBE_BUCKET) return err('Wardrobe bucket is not configured', 500);
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) return err('File is required');
      const contentType = file.type || 'image/jpeg';
      const key = `wardrobe/${user.id}/${crypto.randomUUID()}.${extFromContentType(contentType)}`;
      await env.WARDROBE_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType },
      });
      return json({ photo_key: key });
    }

    const photoMatch = path.match(/^\/api\/wardrobe\/photo\/([^/]+)$/);
    if (photoMatch && method === 'GET') {
      const item = await getWardrobeItem(env, photoMatch[1]);
      if (!item?.photo_key || !env.WARDROBE_BUCKET) return new Response('Not found', { status: 404, headers: CORS });
      const object = await env.WARDROBE_BUCKET.get(item.photo_key);
      if (!object) return new Response('Not found', { status: 404, headers: CORS });
      const headers = new Headers(CORS);
      headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=3600');
      return new Response(object.body, { headers });
    }

    if (path === '/api/wardrobe/suggest' && method === 'GET') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const temp = Number(url.searchParams.get('temp') || '0');
      const tempMin = Number(url.searchParams.get('tempMin') || temp);
      const tempMax = Number(url.searchParams.get('tempMax') || temp);
      const precip = Number(url.searchParams.get('precip') || '0');
      const windSpeed = Number(url.searchParams.get('windSpeed') || '0');
      const weatherDesc = url.searchParams.get('weatherDesc') || 'без уточнення';
      const season = url.searchParams.get('season') || currentSeason();

      const rows = await env.DB.prepare(
        'SELECT id, user_id, name, category, seasons, colors, temp_min, temp_max, description, photo_key, created_at FROM wardrobe_items WHERE user_id=? ORDER BY created_at DESC',
      ).bind(user.id).all<WardrobeItemRow>();

      const fallback = buildFallbackSuggestion(rows.results || [], temp, tempMin, tempMax, weatherDesc, precip, windSpeed, season);
      const availableItems = fallback.available.map((item) => wardrobeItemToResponse(req, item));

      let suggestion = fallback.suggestion;
      let source: 'ai' | 'fallback' = 'fallback';

      if (env.ANTHROPIC_API_KEY && availableItems.length > 0) {
        try {
          const aiSuggestion = await callAnthropicSuggestion(
            env.ANTHROPIC_API_KEY,
            temp,
            tempMin,
            tempMax,
            weatherDesc,
            availableItems,
          );
          if (aiSuggestion?.outfit.length) {
            suggestion = aiSuggestion;
            source = 'ai';
          }
        } catch {
          source = 'fallback';
        }
      }

      const selectedItems = availableItems.filter((item) => suggestion.outfit.includes(item.id));
      return json({
        source,
        outfit: suggestion.outfit,
        items: selectedItems,
        explanation: suggestion.explanation,
        available_count: availableItems.length,
      });
    }

    if (path === '/api/wardrobe/outfit/save' && method === 'POST') {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const payload = await req.json<{ item_ids: string[]; weather_temp?: number | null }>();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO wardrobe_outfits (id,user_id,item_ids,suggested_at,weather_temp,created_at) VALUES (?,?,?,?,?,?)',
      ).bind(id, user.id, JSON.stringify(payload.item_ids || []), now, payload.weather_temp ?? null, now).run();
      return json({ id, saved: true });
    }

    const wardrobeMatch = path.match(/^\/api\/wardrobe\/([^/]+)$/);
    if (wardrobeMatch) {
      const user = await getUser(req, env);
      if (!user) return err('Unauthorized', 401);
      const itemId = wardrobeMatch[1];
      const current = await getWardrobeItem(env, itemId);
      if (!current || current.user_id !== user.id) return err('Wardrobe item not found', 404);

      if (method === 'PUT') {
        const payload = await req.json<{
          name?: string;
          category?: string;
          seasons?: string[];
          colors?: string | null;
          temp_min?: number | null;
          temp_max?: number | null;
          description?: string | null;
          photo_key?: string | null;
        }>();
        const fields: string[] = [];
        const values: unknown[] = [];
        if (payload.name !== undefined) {
          fields.push('name=?');
          values.push(payload.name.trim());
        }
        if (payload.category !== undefined) {
          fields.push('category=?');
          values.push(payload.category.trim());
        }
        if (payload.seasons !== undefined) {
          fields.push('seasons=?');
          values.push(JSON.stringify(payload.seasons));
        }
        if (payload.colors !== undefined) {
          fields.push('colors=?');
          values.push(payload.colors);
        }
        if (payload.temp_min !== undefined) {
          fields.push('temp_min=?');
          values.push(payload.temp_min);
        }
        if (payload.temp_max !== undefined) {
          fields.push('temp_max=?');
          values.push(payload.temp_max);
        }
        if (payload.description !== undefined) {
          fields.push('description=?');
          values.push(payload.description);
        }
        if (payload.photo_key !== undefined) {
          fields.push('photo_key=?');
          values.push(payload.photo_key);
        }
        if (fields.length === 0) return err('Nothing to update');
        values.push(itemId);
        await env.DB.prepare(`UPDATE wardrobe_items SET ${fields.join(',')} WHERE id=?`).bind(...values).run();
        const updated = await getWardrobeItem(env, itemId);
        return json(updated ? wardrobeItemToResponse(req, updated) : null);
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM wardrobe_items WHERE id=?').bind(itemId).run();
        if (current.photo_key && env.WARDROBE_BUCKET) {
          await env.WARDROBE_BUCKET.delete(current.photo_key);
        }
        return json({ deleted: true });
      }
    }

    return err('Not found', 404);
  },
};
