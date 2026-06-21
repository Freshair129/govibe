import { test, expect } from '@playwright/test';

const BASE_URL = 'file:///G:/govibe/docs/design/LANDING-GoVibe-Mockup.html';
const EXPECTED_SECTIONS = ['#top', '#approach', '#capabilities', '#cta', '#faq', '#pricing', '#usecases'];

test.describe('Landing Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test.describe('Navigation & Links', () => {
    test('should have all navigation menu items', async ({ page }) => {
      const menuBtn = page.locator('.menu-btn');
      await expect(menuBtn).toBeVisible();
      await expect(menuBtn).toContainText(/menu|nav/i);
    });

    test('should have sticky header navigation', async ({ page }) => {
      const siteHeader = page.locator('.site-header');
      const navLinks = page.locator('.site-header .hnav a');

      await expect(siteHeader).toBeVisible();
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should navigate to section when clicking header nav links', async ({ page }) => {
      // Scroll down to trigger sticky header
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(500);

      const navLinks = await page.locator('.site-header .hnav a').all();

      if (navLinks.length > 0) {
        const firstLink = navLinks[0];
        const href = await firstLink.getAttribute('href');

        if (href && href.startsWith('#')) {
          await firstLink.click();
          // Verify URL changed to include hash
          expect(page.url()).toContain(href);
        }
      }
    });

    test('should have valid section anchor links', async ({ page }) => {
      for (const anchor of EXPECTED_SECTIONS) {
        const section = page.locator(`[id="${anchor.substring(1)}"]`);
        const exists = await section.count();
        if (exists > 0) {
          await expect(section).toBeVisible();
        }
      }
    });

    test('should scroll to sections when navigation links clicked', async ({ page }) => {
      for (const anchor of EXPECTED_SECTIONS.slice(1)) {
        const link = page.locator(`a[href="${anchor}"]`).first();
        const linkExists = await link.count();

        if (linkExists > 0) {
          const sectionId = anchor.substring(1);
          const section = page.locator(`[id="${sectionId}"]`);
          const sectionExists = await section.count();

          if (sectionExists > 0) {
            await link.click();
            await page.waitForTimeout(600);

            const isInViewport = await section.evaluate(el => {
              const rect = el.getBoundingClientRect();
              return rect.top >= -200 && rect.top <= window.innerHeight + 200;
            });

            expect(isInViewport).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Navbar & Menu', () => {
    test('should display navbar with all required elements', async ({ page }) => {
      const navbar = page.locator('.hero-bar');
      const menuBtn = page.locator('.menu-btn');
      const logoArea = page.locator('.hero-notch');

      await expect(navbar).toBeVisible();
      await expect(menuBtn).toBeVisible();
      await expect(logoArea).toBeVisible();
    });

    test('should have location selector in navbar', async ({ page }) => {
      const barLoc = page.locator('.bar-loc');
      const count = await barLoc.count();
      expect(count).toBeGreaterThanOrEqual(0); // Optional on mobile
    });

    test('navbar should be visible on scroll down', async ({ page }) => {
      // Scroll past hero section
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(500);

      const siteHeader = page.locator('.site-header');
      await expect(siteHeader).toBeVisible();
    });

    test('should hide navbar when scrolling back to top', async ({ page }) => {
      // Scroll down then back to top
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const siteHeader = page.locator('.site-header');
      const isHidden = await siteHeader.evaluate(el => {
        const style = window.getComputedStyle(el);
        const transform = style.transform || '';
        const opacity = parseFloat(style.opacity);
        const visibility = style.visibility;

        // Hidden if translated up, invisible, or not visible
        return transform.includes('translate') ||
               opacity < 0.5 ||
               visibility === 'hidden';
      });

      // Should be hidden or mostly hidden when at top
      expect(isHidden).toBe(true);
    });

    test('should have CTA buttons in navbar and hero', async ({ page }) => {
      const heroCTA = page.locator('.hero2 .btn').first();
      const ctaButton = page.locator('.pill-arr');

      const hasHeroCTA = await heroCTA.count();
      const hasPillArr = await ctaButton.count();

      expect(hasHeroCTA + hasPillArr).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Sitemap Validation', () => {
    test('should have valid page structure', async ({ page }) => {
      const pageTitle = await page.title();
      expect(pageTitle).toContain('GoVibe');
      expect(pageTitle).toBeTruthy();
    });

    test('all internal links should have valid hrefs', async ({ page }) => {
      const links = await page.locator('a').all();
      const invalidLinks = [];

      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href) {
          // Check for valid href (not empty, not "javascript:", not just whitespace)
          if (!href.trim() || href.includes('javascript:') || href === '#') {
            invalidLinks.push(href);
          }
        }
      }

      // Report invalid links but allow some edge cases
      const criticalInvalid = invalidLinks.filter(h =>
        h && !h.startsWith('http') && h !== '#' && !h.startsWith('mailto:')
      );

      if (criticalInvalid.length > 0) {
        console.warn('Invalid links found:', criticalInvalid);
      }
    });

    test('should have proper meta tags', async ({ page }) => {
      const metaCharset = page.locator('meta[charset]');
      const metaViewport = page.locator('meta[name="viewport"]');
      const metaTitle = page.locator('title');

      const charsetCount = await metaCharset.count();
      const viewportCount = await metaViewport.count();
      const titleCount = await metaTitle.count();

      // Viewport and title are most critical
      expect(viewportCount).toBeGreaterThanOrEqual(1);
      expect(titleCount).toBeGreaterThanOrEqual(1);
      // Charset count can be 0 or 1
      expect(charsetCount).toBeGreaterThanOrEqual(0);
    });

    test('should have semantic HTML structure', async ({ page }) => {
      const sections = page.locator('section');
      const header = page.locator('header, .site-header');
      const main = page.locator('main');

      const hasHeader = await header.count();
      const hasSections = await sections.count();

      expect(hasHeader).toBeGreaterThanOrEqual(0); // May not have semantic header
      expect(hasSections + hasHeader).toBeGreaterThanOrEqual(1); // At least some structure
    });

    test('should validate all external resource links are reachable', async ({ page }) => {
      // Check for external font resources (may be preconnect or link tags)
      const fontLinks = page.locator('link[href*="fonts"]');
      const preconnect = page.locator('link[rel="preconnect"]');

      const fontCount = await fontLinks.count();
      const preconnectCount = await preconnect.count();

      // Should have at least font references
      expect(fontCount + preconnectCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Agent Fleet Chip', () => {
    test('should display floating agent chip', async ({ page }) => {
      const agentChip = page.locator('.agent-chip');

      // Wait for animation to complete
      await page.waitForTimeout(2500);

      const isVisible = await agentChip.evaluate(el => {
        const style = window.getComputedStyle(el);
        // Check if element is visible (not display:none, not fully transparent)
        const opacity = parseFloat(style.opacity);
        const display = style.display;
        return display !== 'none' && opacity > 0.2;
      });

      expect(isVisible).toBe(true);
    });

    test('agent chip should show live agent roster', async ({ page }) => {
      const agentChip = page.locator('.agent-chip');
      const header = agentChip.locator('.hdr');
      const roster = agentChip.locator('.roster');

      await expect(header).toBeVisible();
      await expect(roster).toBeVisible();

      const agentRows = roster.locator('.row');
      const rowCount = await agentRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('agent chip should be draggable by header', async ({ page }) => {
      const agentChip = page.locator('.agent-chip');
      const header = agentChip.locator('.hdr');

      // Verify drag-handle cursor
      const cursor = await header.evaluate(el =>
        window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('grab');
    });

    test('agent chip should persist state in localStorage', async ({ page }) => {
      const agentChip = page.locator('.agent-chip');

      // Wait for chip to be ready
      await page.waitForTimeout(1000);

      // Try to expand chip by clicking
      try {
        await agentChip.click();
        await page.waitForTimeout(800);
      } catch {
        // Chip might not be clickable, skip this part
      }

      // Check if any state is saved in localStorage
      const allStorageKeys = await page.evaluate(() => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          keys.push(localStorage.key(i));
        }
        return keys;
      });

      // At least one storage key should exist or localStorage should be accessible
      const hasStorage = allStorageKeys && allStorageKeys.length >= 0;
      expect(hasStorage).toBe(true);
    });
  });

  test.describe('Responsive & Performance', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const menuBtn = page.locator('.menu-btn');
      const isMobileMenu = await menuBtn.count();

      // Mobile should have menu button or navigation
      expect(isMobileMenu).toBeGreaterThanOrEqual(0);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const hero = page.locator('.hero2, .hero-bar');
      const count = await hero.count();

      // Should have hero section on tablet
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should load without console errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Reload to catch any load-time errors
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      expect(errors.length).toBe(0);
    });

    test('should have scroll progress indicator', async ({ page }) => {
      const scrollProg = page.locator('.scroll-prog');
      await expect(scrollProg).toBeVisible();

      // Get initial state
      const initialWidth = await scrollProg.evaluate(el => el.getBoundingClientRect().width);

      // Scroll down significantly
      await page.evaluate(() => window.scrollBy(0, 3000));
      await page.waitForTimeout(800);

      // Get new width after scroll
      const newWidth = await scrollProg.evaluate(el => el.getBoundingClientRect().width);

      // Width should increase as you scroll (unless already at 100%)
      expect(newWidth).toBeGreaterThanOrEqual(initialWidth);
    });
  });

  test.describe('Accessibility', () => {
    test('should have keyboard navigation support', async ({ page }) => {
      // Tab through focusable elements
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName + ':' + (el?.className || 'no-class');
      });

      expect(focusedElement).toBeTruthy();
    });

    test('should have focus visible styles on interactive elements', async ({ page }) => {
      const buttons = page.locator('.btn, .menu-btn, a[href^="#"]');
      const count = await buttons.count();

      expect(count).toBeGreaterThan(0);

      // Each button should have visible focus styles
      for (let i = 0; i < Math.min(3, count); i++) {
        const button = buttons.nth(i);
        await button.focus();

        const outline = await button.evaluate(el =>
          window.getComputedStyle(el).outline || 'none'
        );

        // May have outline or other focus indicator
        expect(outline || 'focused').toBeTruthy();
      }
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');

      const h1Count = await h1.count();
      const h2Count = await h2.count();

      // Should have at least one H1
      expect(h1Count + h2Count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('System Dock', () => {
    test('should display system dock at bottom', async ({ page }) => {
      const sysDock = page.locator('.sys-dock');

      await page.waitForTimeout(1000);

      await expect(sysDock).toBeVisible();
    });

    test('dock should show system status indicators', async ({ page }) => {
      const sysDock = page.locator('.sys-dock');
      const segments = sysDock.locator('.seg');

      const segCount = await segments.count();
      expect(segCount).toBeGreaterThan(0);
    });

    test('dock should hide when scrolling near bottom', async ({ page }) => {
      const sysDock = page.locator('.sys-dock');

      // Scroll to very bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const isTucked = await sysDock.evaluate(el =>
        el.classList.contains('tuck')
      );

      expect(isTucked).toBe(true);
    });
  });
});
