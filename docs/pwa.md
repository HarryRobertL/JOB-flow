# Progressive Web App (PWA) Implementation

This document describes the PWA features implemented in AutoApplyer and how to maintain them.

## Overview

AutoApplyer is configured as a Progressive Web App (PWA), making it installable on mobile and desktop devices. This provides users with an app-like experience while maintaining the flexibility of a web application.

## Implemented Features

### 1. Web App Manifest

**Location:** `public/manifest.json`

The manifest defines:
- App name and short name: "AutoApplyer"
- Theme color: `#0d8aff` (primary blue from design system)
- Background color: `#ffffff` (white)
- Display mode: `standalone` (app-like experience)
- Icons: 192x192, 512x512, and Apple touch icon (180x180)
- App shortcuts: Dashboard and Applications

**Maintenance:**
- Update `manifest.json` when app branding changes
- Ensure icon paths match actual icon files in `public/`
- Update `start_url` if the app entry point changes

### 2. Service Worker

**Location:** `public/sw.js`

The service worker provides:
- **Offline fallback**: Shows an offline page when network is unavailable
- **Asset caching**: Caches static assets (HTML, CSS, JS, images, fonts)
- **Network-first strategy**: Always tries network first, falls back to cache
- **API exclusion**: Does NOT cache API endpoints to preserve compliance logging integrity

**Key Features:**
- Conservative caching approach to avoid breaking compliance requirements
- Only caches successful responses (status 200)
- Skips non-GET requests (POST, PUT, DELETE)
- Skips cross-origin requests
- Skips `/api/` endpoints

**Maintenance:**
- Update `CACHE_NAME` version when making breaking changes to cached assets
- Test offline behavior after major updates
- Ensure API endpoints remain excluded from caching

### 3. Icons

**Location:** `public/icon-*.png`, `public/favicon-*.png`

Required icon sizes:
- 192x192: Standard Android icon
- 512x512: High-resolution Android icon
- 180x180: Apple touch icon
- 32x32: Standard favicon
- 16x16: Small favicon

**Icon Generation:**

Icons can be generated using the provided script:

```bash
node scripts/generate-icons.js
```

This script:
- Requires `sharp` package: `npm install --save-dev sharp`
- Generates all required icon sizes from `public/icon.svg`
- Creates placeholder icons if `sharp` is not available

**Maintenance:**
- Update `public/icon.svg` with new branding
- Run the icon generation script after design changes
- Ensure all icon files exist before deployment

### 4. Installation Prompt

**Location:** `src/components/pwa/InstallPrompt.tsx`

A user-friendly banner that:
- Appears when the browser supports installation
- Respects user choice (dismissal is remembered in localStorage)
- Automatically hides when the app is installed
- Only shows on supported platforms (Chrome, Edge, Safari, etc.)

**Behavior:**
- Shows bottom-right banner on desktop
- Shows bottom banner on mobile
- Dismisses permanently if user clicks "X"
- Remembers dismissal via `localStorage` key: `pwa-install-dismissed`

**Maintenance:**
- Update styling to match design system changes
- Adjust positioning if layout changes
- Test on various browsers and devices

### 5. HTML Meta Tags

**Location:** `index.html`

Meta tags configured:
- `theme-color`: Matches manifest theme color
- `apple-mobile-web-app-capable`: Enables iOS standalone mode
- `apple-mobile-web-app-status-bar-style`: Sets iOS status bar style
- Icon links for various platforms

**Maintenance:**
- Keep theme-color in sync with manifest.json
- Update description meta tag as needed

## Service Worker Registration

The service worker is registered in `index.html`:

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  });
}
```

## Build Configuration

**Location:** `vite.config.ts`

Vite is configured to:
- Copy `public/` directory contents to `dist/` during build
- Ensure service worker and manifest are included in the build output

## Testing PWA Features

### Local Testing

1. **Development:**
   ```bash
   npm run dev
   ```
   - Service worker may not work in dev mode (use HTTPS or localhost)
   - Test installation prompt in supported browsers

2. **Production Build:**
   ```bash
   npm run build
   npm run preview
   ```
   - Full PWA features available in preview mode
   - Test offline functionality
   - Test installation flow

### Browser Testing

**Chrome/Edge:**
- Install button appears in address bar
- Test offline mode: DevTools > Network > Offline
- Check service worker: DevTools > Application > Service Workers

**Safari (iOS):**
- Share button > Add to Home Screen
- Test in standalone mode
- Verify icons and theme color

**Firefox:**
- Limited PWA support
- Installation via menu: Tools > Install Site as App

### Offline Testing

1. Build the app: `npm run build`
2. Serve with a local server: `npm run preview`
3. Open DevTools > Network
4. Enable "Offline" checkbox
5. Refresh the page
6. Verify offline.html is shown or cached content loads

## Deployment Considerations

### HTTPS Requirement

PWAs require HTTPS (except localhost). Ensure:
- Production deployment uses HTTPS
- Service worker registration fails on HTTP (except localhost)

### Cache Invalidation

When updating the app:
1. Update `CACHE_NAME` in `sw.js` to force cache refresh
2. Users will get new service worker on next visit
3. Old cache is automatically cleaned up

### Icon Requirements

Before production:
- Replace placeholder icons with final branded icons
- Ensure all required sizes are present
- Test icons on actual devices

## Troubleshooting

### Service Worker Not Registering

- Check browser console for errors
- Ensure HTTPS (or localhost) is used
- Verify `sw.js` is accessible at `/sw.js`
- Check file paths are correct

### Icons Not Showing

- Verify icon files exist in `public/`
- Check manifest.json icon paths match actual files
- Clear browser cache and reinstall

### Installation Prompt Not Appearing

- Check browser support (Chrome, Edge, Safari iOS)
- Verify manifest.json is valid
- Ensure app meets PWA criteria (HTTPS, manifest, service worker)
- Check if already installed or previously dismissed

### Offline Mode Not Working

- Verify service worker is registered and active
- Check DevTools > Application > Service Workers
- Ensure assets are being cached (check Cache Storage)
- Verify network-first strategy is working

## Future Enhancements

Potential improvements:
- Background sync for offline actions
- Push notifications (with user consent)
- Advanced caching strategies for specific routes
- Update notifications when new version is available
- Analytics for PWA usage and installation rates

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

