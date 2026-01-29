# PWA Implementation Notes

This document explains the PWA (Progressive Web App) implementation for AutoApplyer, focusing on installability and basic offline support.

## Overview

AutoApplyer is configured as a Progressive Web App, enabling installation on mobile and desktop devices. The PWA implementation provides an app-like experience while maintaining the flexibility of a web application.

## Components

### 1. Web App Manifest

**Location:** `public/manifest.webmanifest`

The manifest defines the app's metadata for installation:

- **Name:** "AutoApplyer AI" (full name) / "AutoApplyer" (short name)
- **Description:** Automated job application tool for claimants
- **Start URL:** `/` (root)
- **Display Mode:** `standalone` (app-like experience without browser UI)
- **Theme Color:** `#0d8aff` (primary blue from design system)
- **Background Color:** `#ffffff` (white)
- **Icons:** Multiple sizes for different platforms (192x192, 512x512, 180x180)

**Icon Requirements:**
- Currently references both SVG and PNG formats
- **Note:** For full installability, PNG icons should be placed in `/public/icons/` or `/public/` directory
- Required sizes: 192x192, 512x512, 180x180 (Apple)
- Icons should be optimized and meet platform guidelines (maskable icons recommended)

**Maintenance:**
- Update manifest when app branding changes
- Ensure icon paths match actual icon files
- Update `start_url` if the app entry point changes
- Keep theme colors aligned with design system (`src/design/system.ts`)

### 2. Service Worker

**Location:** `public/sw.js`

The service worker provides offline support and asset caching:

**Features:**
- **Static Asset Caching:** Caches HTML, CSS, JS, images, and fonts
- **Network-First Strategy:** Always tries network first, falls back to cache
- **Offline Fallback:** Shows `/offline.html` for navigation requests when offline
- **Conservative Approach:** Does NOT cache API responses to preserve compliance logging integrity

**Caching Strategy:**
- Only caches successful responses (HTTP 200)
- Skips non-GET requests (POST, PUT, DELETE)
- Skips cross-origin requests
- Skips `/api/` endpoints entirely
- Caches static assets by destination type (document, script, style, image, font)

**Registration:**
- Registered in `src/main.tsx` with a production guard (`import.meta.env.PROD`)
- Only registers in production builds to avoid development issues

**Cache Versioning:**
- Cache name: `autoapplyer-v1`
- Update cache name version when making breaking changes to cached assets
- Old caches are automatically cleaned up on activation

**Limitations:**
- Job automation features still require full browser functionality
- API calls will fail when offline (by design, for compliance)
- Complex interactions may be limited when offline

### 3. Install Prompt UX

**Location:** `src/components/pwa/InstallPrompt.tsx`

A user-friendly banner that prompts users to install the app:

**Behavior:**
- Appears when browser supports installation (`beforeinstallprompt` event)
- Shows a subtle banner at bottom-right on desktop, bottom on mobile
- Respects user dismissal (stored in `localStorage` as `pwa-install-dismissed`)
- Automatically hides when app is already installed
- Only shows on supported platforms (Chrome, Edge, Safari iOS, etc.)

**Integration:**
- Integrated globally in `src/App.tsx`
- Component handles all logic internally (detection, dismissal, installation)

**User Flow:**
1. User visits the app on a supported browser
2. Browser fires `beforeinstallprompt` event if app meets PWA criteria
3. Banner appears prompting installation
4. User can click "Install" to trigger browser install prompt
5. User can dismiss, which hides the banner permanently
6. Once installed, banner never shows again

### 4. HTML Meta Tags

**Location:** `index.html`

Meta tags configured for PWA support:

- `theme-color`: `#0d8aff` (matches manifest)
- `apple-mobile-web-app-capable`: Enables iOS standalone mode
- `apple-mobile-web-app-status-bar-style`: Sets iOS status bar style
- `apple-mobile-web-app-title`: Sets iOS app title
- Icon links for various platforms (favicon, Apple touch icon)
- Manifest link pointing to `/manifest.webmanifest`

## Installation Criteria

For a PWA to be installable, it must meet these criteria:

1. **HTTPS Required** (except localhost for development)
2. **Valid Manifest** - `manifest.webmanifest` must be valid JSON
3. **Service Worker** - Must be registered and active
4. **Icons** - At least one icon of 192x192 and one of 512x512
5. **Start URL** - Must be within the scope defined in manifest
6. **Display Mode** - Should be `standalone` or `fullscreen`

## Testing Installability Locally

### Development Testing

```bash
npm run dev
```

**Note:** Service worker registration is disabled in development mode. To test PWA features:

1. Build the app: `npm run build`
2. Preview with: `npm run preview`
3. Test on HTTPS or localhost (required for service workers)

### Testing Checklist

1. **Manifest Validation:**
   - Open DevTools > Application > Manifest
   - Verify all fields are correct
   - Check for any validation errors

2. **Service Worker:**
   - Open DevTools > Application > Service Workers
   - Verify service worker is registered and active
   - Test offline mode (DevTools > Network > Offline)

3. **Install Prompt:**
   - Visit the app in Chrome/Edge
   - Check if install button appears in address bar
   - Test the install prompt component (should appear if installable)

4. **Offline Functionality:**
   - Enable offline mode in DevTools
   - Refresh the page
   - Verify offline.html is shown or cached content loads
   - Verify API calls fail gracefully (expected behavior)

5. **iOS Testing (Safari):**
   - Open the app on iOS device
   - Tap Share button > Add to Home Screen
   - Verify app launches in standalone mode
   - Check icons and theme color

## Browser Support

- **Chrome/Edge (Desktop):** Full support including install prompt
- **Chrome (Android):** Full support with install banner
- **Safari (iOS):** Limited support - Add to Home Screen via Share menu
- **Firefox:** Limited support - Installation via menu only
- **Safari (Desktop):** No install support (as of 2024)

## Limitations and Considerations

### Backend Dependencies

- **Job Automation:** Requires full browser functionality and cannot run in installed PWA context when fully offline
- **API Calls:** All API endpoints require network connectivity
- **Compliance Logging:** API responses are intentionally not cached to ensure compliance logs are accurate

### Offline Capabilities

The PWA provides limited offline functionality:

- ✅ **App Shell:** Basic UI structure loads from cache
- ✅ **Static Assets:** CSS, JS, images load from cache
- ✅ **Offline Page:** Friendly offline message shown when navigation fails
- ❌ **API Calls:** All API calls require network
- ❌ **Job Automation:** Requires network connectivity

### Security Considerations

- Service worker runs in a separate context with limited access
- API endpoints are excluded from caching for compliance reasons
- All network requests still go through the same security checks as the web app

## Deployment Checklist

Before deploying to production:

- [ ] Replace placeholder icons with final branded PNG icons
- [ ] Verify all icon sizes are present (192x192, 512x512, 180x180)
- [ ] Test manifest validation (DevTools > Application > Manifest)
- [ ] Verify service worker registration in production build
- [ ] Test offline functionality
- [ ] Verify install prompt appears on supported browsers
- [ ] Test on iOS devices (Add to Home Screen)
- [ ] Ensure HTTPS is properly configured
- [ ] Update cache version in `sw.js` if needed

## Future Enhancements

Potential improvements for future iterations:

- Background sync for offline actions (with user consent)
- Push notifications (with user consent and proper permissions)
- Advanced caching strategies for specific routes
- Update notifications when new version is available
- Analytics for PWA usage and installation rates
- App shortcuts integration
- Share target API for better integration

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Before Install Prompt Event](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent)

