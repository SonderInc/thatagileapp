# Embedding a company instance in another website

A company's instance (e.g. `https://thatagileapp.com/the-compassion-course`) can be embedded in another website using an iframe.

## Iframe embed code

Use the company's instance URL (path = company slug). Example:

```html
<iframe
  src="https://thatagileapp.com/the-compassion-course"
  title="Backlog"
  width="100%"
  height="800"
  style="border: 0;"
></iframe>
```

The parent site must use **HTTPS** for the iframe `src`.

## Optional: compact embed mode

Append `?embed=1` to the URL to show a compact top bar (logo + "Open in new tab") instead of the full navigation. This gives more space to the backlog/boards inside the iframe.

```html
<iframe
  src="https://thatagileapp.com/the-compassion-course?embed=1"
  title="Backlog"
  width="100%"
  height="800"
  style="border: 0;"
></iframe>
```

## Restricting who can embed

By default the app allows being framed by any origin (`frame-ancestors *` in `public/_headers`). To restrict embedding to specific sites, edit `public/_headers` and replace `*` with a space-separated list of origins, e.g.:

```
Content-Security-Policy: frame-ancestors 'self' https://thatagileapp.com https://example.com
```

Then redeploy.
