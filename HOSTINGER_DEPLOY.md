# Hostinger `public_html` Deployment

Use this setup when deploying through Hostinger's plain Git deployment into `public_html`.

## What Hostinger should receive

The repository root now contains the static web files Hostinger expects:

- `index.html`
- `static/`
- `.htaccess`

In hPanel, use the Git deployment flow for the website and deploy this repository into the account root / `public_html`.

## Updating the deployed static files

When you change React source files, run:

```bash
npm run build:public_html
```

Then commit and push the changed root `index.html` and `static/` files.

## Static hosting limitation

The `public_html` method cannot run the Express backend. The app therefore uses demo login credentials and built-in dashboard data when the API is unavailable.
