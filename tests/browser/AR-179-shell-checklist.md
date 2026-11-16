# AR-179 admin frame: checklist for the real site

Automatic parts: `npm test` (map, search, addresses), PHPUnit `tests/AdminShellTest.php`
(light boot, links filter, body class with a renamed menu), and `tests/browser/AR-179-shell.html`
(the frame, bell, search and jump on WordPress's own scripts; see its header for how to run it).

This list is what those cannot see: the logged-in admin of a real site, with real notices and
other plugins. Check it in the owner's Chrome on `http://localhost/tts`, with Pro 4.0.0 active and
once with Pro deactivated. Leave no setting changed.

## Frame (1440, 1100, 900, 768, 375 px wide)

- [ ] `admin.php?page=ar-vr-3d-model-try-on` fills the window under the admin bar; the WordPress
      page does not scroll at 783 px and wider (only the pane does); no footer.
- [ ] Side menu: Products, Setup (only while the wizard is not done), groups 3D models / Shop
      display / Look after, icons; the current screen is marked.
- [ ] 1100 px: icons only, a tooltip names each. 900 px: search is an icon. 768 and 375 px: the
      menu button opens the slide-in menu; focus moves in, Tab stays in, Escape closes it and focus
      returns to the menu button; the page scrolls, the top bar, Save bar and status bar stay.
- [ ] With Pro: brand "AtlasAR" with a PRO badge and "4.0.0 · AtlasAR 3.x". Without Pro: no badge,
      the menu ends with "See AtlasAR Pro".
- [ ] Status bar: products with 3D, models in the 3D Library, AtlasAR Cloud state; each opens its place.

## Notices bell

- [ ] A notice from WordPress or another plugin (e.g. deactivate and reactivate a plugin, or a
      WooCommerce notice) is not above the app: the bell shows the count, "Notices: n, n error(s)"
      is its name; opening it shows the real notice; its own dismiss button works and the count drops.
- [ ] Nothing is lost: closing the bell keeps the notices in the page (`.atlas-ar-notices-holder`).

## Search (Ctrl+K / ⌘K / "/")

- [ ] Ctrl+K opens AtlasAR's search, not WordPress's command palette; "/" does too, but not while typing in a field.
- [ ] "border" → Enter: Appearance › Size and frame opens, "Border (px)" is focused and marked for
      about 2 s. "border colour" with border 0: lands on "Border (px)" and says the colour shows above 0.
- [ ] Arrows move the active result; Enter opens it; Escape closes, then clears, then leaves.
- [ ] Screen reader (NVDA): the box is a combobox, results count is read, the picked place is read.
- [ ] "meshy" finds Integrations; "qr" finds Placement; "xyz" shows "Nothing matches" and Open Help.
- [ ] Reduced motion on (Windows: Settings › Accessibility › Visual effects › Animation effects off):
      the mark is a still outline; the menu does not slide.

## Appearance (the converted screen)

- [ ] Tabs Look · Starting view · Size and frame · AR button; arrow keys move between tabs;
      Quick styles above; the live preview stays in view; Save changes in the footer.
- [ ] Change a value on each tab, Save: "All changes saved"; reload: the values are kept;
      Get started ticks "Make it look like your shop". Put the values back.
- [ ] Deep link `…#appearance:frame/look.radius` opens the tab and focuses Rounded corners.
- [ ] Leaving with unsaved changes still asks (browser warning).

## Unchanged screens and links

- [ ] Products, Placement, Try-on, Integrations, Analytics, Settings, Help look as before inside the pane.
- [ ] Old links work: `#integrations` from the 3D Library and from Pro; Back returns to the previous screen.
- [ ] Setup wizard (`&setup=1`) works as before (Look step shows Background, button text, button colour).
- [ ] 3D Library page: the same frame; upload, select, details, picker from a product still work.
      With Pro 4.0.0: "Make with AI" and "Optimise in bulk" still there; the page is full-window
      (the fixed body-class bug).
- [ ] An Author on the 3D Library: only "3D Library" in the menu, no settings in the search.
- [ ] Product edit screen: the AtlasAR panel and its Pro tabs work and save as before.
- [ ] `wp-content/debug.log`: no new notice or error after visiting every screen.
