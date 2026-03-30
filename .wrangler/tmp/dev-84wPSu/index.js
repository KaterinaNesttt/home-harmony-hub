var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
__name(json, "json");
function err(msg, status = 400) {
  return json({ error: msg }, status);
}
__name(err, "err");
async function signJwt(payload, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sigB64}`;
}
__name(signJwt, "signJwt");
async function verifyJwt(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const data = `${parts[0]}.${parts[1]}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}
__name(verifyJwt, "verifyJwt");
async function hashPassword(password) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + "hhh-salt-2024"));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function getUser(req, env) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifyJwt(auth.slice(7), env.JWT_SECRET || "dev-secret-change-me");
  if (!payload?.sub) return null;
  const row = await env.DB.prepare("SELECT id,email,display_name,avatar_url FROM users WHERE id=?").bind(payload.sub).first();
  return row || null;
}
__name(getUser, "getUser");
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    if (method === "OPTIONS") return new Response(null, { headers: CORS });
    if (path === "/api/auth/signup" && method === "POST") {
      const { email, password, display_name } = await req.json();
      if (!email || !password) return err("Email and password required");
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
      if (existing) return err("Email already registered", 409);
      const id = crypto.randomUUID();
      const hash = await hashPassword(password);
      await env.DB.prepare("INSERT INTO users (id,email,password_hash,display_name) VALUES (?,?,?,?)").bind(id, email, hash, display_name || email.split("@")[0]).run();
      const token = await signJwt({ sub: id, email, exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 30 }, env.JWT_SECRET || "dev-secret-change-me");
      return json({ token, user: { id, email, display_name: display_name || email.split("@")[0] } });
    }
    if (path === "/api/auth/signin" && method === "POST") {
      const { email, password } = await req.json();
      const hash = await hashPassword(password);
      const user = await env.DB.prepare("SELECT id,email,display_name,avatar_url FROM users WHERE email=? AND password_hash=?").bind(email, hash).first();
      if (!user) return err("Invalid credentials", 401);
      const token = await signJwt({ sub: user.id, email, exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 30 }, env.JWT_SECRET || "dev-secret-change-me");
      return json({ token, user });
    }
    if (path === "/api/profile" && method === "GET") {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      return json(user);
    }
    if (path === "/api/profile" && method === "PATCH") {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const updates = await req.json();
      const fields = [];
      const vals = [];
      if (updates.display_name !== void 0) {
        fields.push("display_name=?");
        vals.push(updates.display_name);
      }
      if (updates.avatar_url !== void 0) {
        fields.push("avatar_url=?");
        vals.push(updates.avatar_url);
      }
      if (fields.length === 0) return err("Nothing to update");
      fields.push("updated_at=?");
      vals.push((/* @__PURE__ */ new Date()).toISOString());
      vals.push(user.id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(",")} WHERE id=?`).bind(...vals).run();
      const updated = await env.DB.prepare("SELECT id,email,display_name,avatar_url FROM users WHERE id=?").bind(user.id).first();
      return json(updated);
    }
    if (path === "/api/tasks" && method === "GET") {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const rows = await env.DB.prepare("SELECT * FROM tasks WHERE user_id=? ORDER BY pinned DESC, created_at DESC").bind(user.id).all();
      return json(rows.results.map((r) => ({ ...r, pinned: r.pinned === 1 || r.pinned === true })));
    }
    if (path === "/api/tasks" && method === "POST") {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const t = await req.json();
      const id = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env.DB.prepare(
        "INSERT INTO tasks (id,user_id,title,description,status,priority,deadline,assignee,category,access,pinned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(id, user.id, t.title, t.description || null, t.status || "unseen", t.priority || "medium", t.deadline || null, t.assignee || "me", t.category || "\u0414\u0456\u043C", t.access || "shared", t.pinned ? 1 : 0, now, now).run();
      return json({ id, user_id: user.id, ...t, created_at: now, updated_at: now, pinned: !!t.pinned });
    }
    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const id = taskMatch[1];
      if (method === "PATCH") {
        const updates = await req.json();
        const fields = [];
        const vals = [];
        const allowed = ["title", "description", "status", "priority", "deadline", "assignee", "category", "access", "pinned"];
        for (const k of allowed) {
          if (k in updates) {
            fields.push(`${k}=?`);
            vals.push(k === "pinned" ? updates[k] ? 1 : 0 : updates[k]);
          }
        }
        if (fields.length === 0) return err("Nothing to update");
        fields.push("updated_at=?");
        vals.push((/* @__PURE__ */ new Date()).toISOString());
        vals.push(id);
        vals.push(user.id);
        await env.DB.prepare(`UPDATE tasks SET ${fields.join(",")} WHERE id=? AND user_id=?`).bind(...vals).run();
        const updated = await env.DB.prepare("SELECT * FROM tasks WHERE id=?").bind(id).first();
        return json({ ...updated, pinned: updated?.pinned === 1 || updated?.pinned === true });
      }
      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").bind(id, user.id).run();
        return json({ deleted: true });
      }
    }
    if (path === "/api/lists" && method === "GET") {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const lists = await env.DB.prepare("SELECT * FROM shopping_lists WHERE user_id=? ORDER BY pinned DESC, created_at DESC").bind(user.id).all();
      const allItems = await env.DB.prepare(
        `SELECT * FROM shopping_items WHERE list_id IN (SELECT id FROM shopping_lists WHERE user_id=?) ORDER BY created_at ASC`
      ).bind(user.id).all();
      const itemsByList = /* @__PURE__ */ new Map();
      for (const item of allItems.results) {
        const lid = item.list_id;
        if (!itemsByList.has(lid)) itemsByList.set(lid, []);
        itemsByList.get(lid).push({ ...item, bought: item.bought === 1 });
      }
      return json(lists.results.map((l) => ({
        ...l,
        pinned: l.pinned === 1 || l.pinned === true,
        items: itemsByList.get(l.id) || []
      })));
    }
    if (path === "/api/lists" && method === "POST") {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const l = await req.json();
      const id = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env.DB.prepare("INSERT INTO shopping_lists (id,user_id,title,type,category,access,pinned,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id, user.id, l.title, l.type || "daily", l.category || "\u0414\u0456\u043C", l.access || "shared", l.pinned ? 1 : 0, now).run();
      return json({ id, user_id: user.id, ...l, created_at: now, items: [], pinned: !!l.pinned });
    }
    const listMatch = path.match(/^\/api\/lists\/([^/]+)$/);
    if (listMatch) {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const id = listMatch[1];
      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM shopping_lists WHERE id=? AND user_id=?").bind(id, user.id).run();
        return json({ deleted: true });
      }
    }
    const itemsMatch = path.match(/^\/api\/lists\/([^/]+)\/items$/);
    if (itemsMatch && method === "POST") {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const listId = itemsMatch[1];
      const list = await env.DB.prepare("SELECT id FROM shopping_lists WHERE id=? AND user_id=?").bind(listId, user.id).first();
      if (!list) return err("List not found", 404);
      const item = await req.json();
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO shopping_items (id,list_id,name,quantity,bought,note,url) VALUES (?,?,?,?,0,?,?)").bind(id, listId, item.name, item.quantity || "1", item.note || null, item.url || null).run();
      return json({ id, list_id: listId, ...item, bought: false });
    }
    const itemMatch = path.match(/^\/api\/lists\/([^/]+)\/items\/([^/]+)$/);
    if (itemMatch) {
      const user = await getUser(req, env);
      if (!user) return err("Unauthorized", 401);
      const [, listId, itemId] = itemMatch;
      const list = await env.DB.prepare("SELECT id FROM shopping_lists WHERE id=? AND user_id=?").bind(listId, user.id).first();
      if (!list) return err("List not found", 404);
      if (method === "PATCH") {
        const { bought } = await req.json();
        await env.DB.prepare("UPDATE shopping_items SET bought=? WHERE id=? AND list_id=?").bind(bought ? 1 : 0, itemId, listId).run();
        return json({ updated: true });
      }
      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM shopping_items WHERE id=? AND list_id=?").bind(itemId, listId).run();
        return json({ deleted: true });
      }
    }
    return err("Not found", 404);
  }
};

// ../../home/codespace/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../home/codespace/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ca9BiX/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../home/codespace/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ca9BiX/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
