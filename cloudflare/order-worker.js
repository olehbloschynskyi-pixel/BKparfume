export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(env.ALLOWED_ORIGIN || "*");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Method Not Allowed",
        },
        405,
        corsHeaders,
      );
    }

    let input;

    try {
      input = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid JSON payload",
        },
        400,
        corsHeaders,
      );
    }

    const storeEmail = env.STORE_EMAIL;
    if (!storeEmail) {
      return jsonResponse(
        {
          success: false,
          error: "STORE_EMAIL is not configured",
        },
        500,
        corsHeaders,
      );
    }

    const serverClientIp = detectClientIp(request);
    const browserClientIp = String(
      input.browser_client_ip || input.client_ip || "",
    ).trim();
    const message = appendIpInfo(
      input.message,
      serverClientIp,
      browserClientIp,
    );

    const payload = {
      _subject: String(input._subject || "Нове замовлення").trim(),
      name: String(input.name || "").trim(),
      email: storeEmail,
      phone: String(input.phone || "").trim(),
      np_branch: String(input.np_branch || "").trim(),
      client_ip: serverClientIp,
      browser_client_ip: browserClientIp,
      user_agent: String(
        input.user_agent || request.headers.get("user-agent") || "Невідомо",
      ).trim(),
      device_language: String(input.device_language || "Невідомо").trim(),
      device_platform: String(input.device_platform || "Невідомо").trim(),
      page_url: String(input.page_url || "").trim(),
      referrer: String(
        input.referrer || request.headers.get("referer") || "Прямий вхід",
      ).trim(),
      timezone: String(input.timezone || "Невідомо").trim(),
      message,
    };

    const pageUrl = normalizeUrl(
      payload.page_url,
      String(env.ALLOWED_ORIGIN || "").trim(),
    );
    const referer = normalizeUrl(payload.referrer, pageUrl);
    const origin = String(env.ALLOWED_ORIGIN || "").trim() || extractOrigin(pageUrl);

    const upstream = await fetch(`https://formsubmit.co/ajax/${storeEmail}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(origin ? { Origin: origin } : {}),
        ...(referer ? { Referer: referer } : {}),
      },
      body: JSON.stringify(payload),
    });

    const responseText = await upstream.text();
    let responseBody;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = {
        success: upstream.ok,
        raw: responseText,
      };
    }

    return jsonResponse(responseBody, upstream.status, corsHeaders);
  },
};

function buildCorsHeaders(allowedOrigin) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      ...corsHeaders,
    },
  });
}

function detectClientIp(request) {
  const candidates = [
    request.headers.get("CF-Connecting-IP"),
    request.headers.get("X-Forwarded-For"),
    request.headers.get("X-Real-IP"),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const parts = candidate
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (isValidIp(part)) {
        return part;
      }
    }
  }

  return "Не вдалося визначити";
}

function isValidIp(value) {
  const ipv4Pattern =
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const ipv6Pattern = /^[0-9a-f:]+$/i;

  return (
    ipv4Pattern.test(value) || (value.includes(":") && ipv6Pattern.test(value))
  );
}

function appendIpInfo(message, serverClientIp, browserClientIp) {
  const baseMessage = String(message || "").trim();
  const lines = [];

  if (baseMessage) {
    lines.push(baseMessage);
  }

  lines.push(`IP клієнта (server): ${serverClientIp}`);

  if (browserClientIp && browserClientIp !== serverClientIp) {
    lines.push(`IP клієнта (browser fallback): ${browserClientIp}`);
  }

  return lines.join("\n");
}

function extractOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function normalizeUrl(value, fallback = "") {
  const candidate = String(value || "").trim();

  if (extractOrigin(candidate)) {
    return candidate;
  }

  return String(fallback || "").trim();
}
