# Cloudflare Worker Setup

1. Install Wrangler:

```bash
npm install -g wrangler
```

2. Log in to Cloudflare:

```bash
wrangler login
```

3. Deploy the Worker from the project root:

```bash
wrangler deploy
```

Alternative: deploy via GitHub Actions.

Create these repository secrets in GitHub:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Then run the workflow from the Actions tab, or push to `main`.

4. Copy the deployed Worker URL from Wrangler output.

5. Paste that URL into [js/site-config.js](js/site-config.js) as the value of `orderWorkerEndpoint`.

Example:

```js
window.BK_CONFIG = {
  orderWorkerEndpoint: "https://bkparfume-order.example-subdomain.workers.dev",
};
```

6. Deploy the website files to hosting.

7. Make a test order and verify that the email contains:

```text
IP клієнта (server): ...
```

Notes:

- If you use a custom Worker domain instead of `workers.dev`, update `orderWorkerEndpoint` in [js/site-config.js](js/site-config.js).
- If the Worker is temporarily unavailable, the frontend falls back to direct FormSubmit submission.
