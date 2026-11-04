# Changelog: Elecraft KPA1500 for Zeus

Versions of the KPA1500 feature (`com.kw4ex.zeus.kpa1500`). Newest first.
No warranty; use at your own risk (see the README).

## 1.4.3
- Help: "Open in my web browser" now opens your default browser straight to the help page (served by the add-on's browser page), instead of failing inside Zeus. It needs the Browser page turned on (the default).

## 1.4.2
- Documentation: the in-panel Help, the browser help page, the PDF guide, the READMEs and this changelog now cover FlexRadio support, the small view, the browser page and network access. No behaviour change.

## 1.4.1
- The browser page's password is optional. *Ask for a password* is ticked by default; unticking it lets anyone on the network use the page (the settings warn about this).

## 1.4.0
- Other computers, tablets and phones can use the browser page (Settings → Browser page → *Allow other computers…*; off by default). Password sign-in, 12-hour session, lock-out after five wrong passwords, password stored only as a salted hash.

## 1.3.1
- The browser page fills the window; favicon route.

## 1.3.0
- New: browser page at `http://127.0.0.1:8081/` (this computer only) showing the same panel, plus a full help page at `/help`. Settings: on/off and port.

## 1.2.3
- Lit buttons keep readable text when the mouse hovers over them.

## 1.2.2
- FlexRadio: the receive level and the No-antenna check work when TCI is on (use the Flex TCI port, normally 40002).

## 1.2.1
- Number boxes in Settings accept typing only (no mouse-wheel or arrow-key changes).
- Clearer radio picker wording; the stale "TCI says…, ignored" note is hidden in Flex mode.

## 1.2.0
- New: *My radio is* → *A FlexRadio* reads a FlexRadio directly (frequency, mode, transmit/tune), following the Flex Zeus is connected to, with a picker when several FlexRadios are on the network. Fixes the amp not following the VFO on Zeus Link Flex.

## 1.1.13
- Fixed: a stale stored radio frequency no longer overrides Zeus's change events.

## 1.1.11 – 1.1.12
- New: built-in plain-language Help page; small two-line view (⇕), remembered per panel, with selectable items.
- Fixes to following the radio on Zeus builds that give plugins a stale frequency; a constant receive level no longer causes a false "No antenna?" warning.

## 1.1.10 and earlier
- The original feature: telemetry, controls, amp follows the VFO, Standby on Tune, "No antenna?" check, Wake-on-LAN, discovery, USB serial, with a no-warranty notice.
