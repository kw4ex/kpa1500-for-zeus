# zeus-kpa1500

Zeus SDR community feature for the **Elecraft KPA1500** amplifier and its
built-in ATU. Operator guide: [`src/Kpa1500/README.md`](../src/Kpa1500/README.md).

Behaviour is ported from the hardware-proven `kpa1500_thetis_bridge.py` v2.9:
UDP on port 1500, `^FR` frequency tracking, Standby-on-Tune with a fresh mode
read and confirmed restore, `^AMI`/`^AMB` ATU switching, Wake-on-LAN power-on,
fan minimum control, and network discovery.

## Layout

```
src/Kpa1500/
  Kpa1500Plugin.cs   Zeus entry point + HTTP API for the panel
  AmpController.cs   link, poll loop, tracking, Standby-on-Tune, commands, safety
  TuneGuard.cs       Standby-on-Tune state machine (pure, tested)
  KpaProtocol.cs     ^…; formatting/parsing, fault table (pure, tested)
  KpaLink.cs         one-command-in-flight request/response over a stream
  Transports.cs      UDP (default) and USB serial
  TciClient.cs       optional read-only TCI listener for tune/trx
  FlexClient.cs      FlexRadio discovery (UDP 4992) + listen-only TCP 4992 client
  WebHost.cs         browser page: Kestrel on 127.0.0.1 (optionally the LAN), login, Host/Origin checks
  web/               browser page files, embedded in the DLL: index.html, help.html, login.html, react.js
  NetTools.cs        Wake-on-LAN + discovery
  PluginConfig.cs    settings, validation, sanitising
  ui/kpa1500.es.js   panel (plain ESM, React.createElement, Zeus tokens only)
  build-package.ps1  catalog packager, unmodified copy
tests/Kpa1500.Tests  fake KPA1500 (and a fake FlexRadio, TCI and web clients) over loopback UDP + unit tests
sdk/                 vendored Zeus plugin SDK snapshot (ABI 1 / 1.5.0) — do not edit
docs/preview/        panel renders against a mock backend (not hardware screenshots)
```

## Radio source and the browser page

- **Radio source** (`PluginConfig.RadioSource`): `zeus` (default) uses Zeus's
  radio state; `flex` makes `AmpController.TrackHz`, `TxLocked` and `TuneSignal`
  use `FlexClient` (slice `RF_frequency`/`tx`/`active`, `interlock state`,
  `transmit tune/mox`) because Zeus Link Flex reports a stale frequency to
  plugins. `FlexClient` only sends `sub slice|tx|radio all` and `ping`. The
  radio is found by serial through discovery; with none chosen it uses the only
  Flex, or the one this computer already has an open TCP 4992 connection to
  (`FlexClient.ConnectedTo`). The Flex has no receive level here, so the
  No-antenna check runs only if TCI is on (the Flex TCI port, normally 40002).
- **Browser page**: `WebHost` starts a second Kestrel app inside the plugin and
  maps the same `MapEndpoints` routes under `/api`, so the Zeus panel and the
  browser use one API. The panel module is served unchanged from the DLL
  (embedded resource `web/ui/kpa1500.es.js`) with `react` mapped by an import map
  to the bundled `web/react.js` (see `web/THIRD-PARTY.txt` for how it is built).
  Loopback visitors need no login; network visitors (opt-in `WebLan`) sign in
  with a PBKDF2-hashed password (`WebAuth`, own settings key `webauth`, never in
  `PluginConfig`) unless `WebRequirePassword` is off. Every request is checked
  for Host (loopback only) and Origin (changes only from the page itself).
- Gotcha: MSBuild treats `.es.` in a file name as a Spanish culture and moves
  the resource to a satellite assembly. The embedded `kpa1500.es.js` therefore
  sets `WithCulture="false"` in both csproj files.
- The web page needs no `fileSystemRead`: everything is served from the DLL.

## Build, test, package

Easiest: double-click **`BUILD.bat`** (Windows) or **`BUILD-mac.command`**
(macOS), or run **`./BUILD-linux.sh`** (Linux). Each checks for the tools, builds, runs the tests, makes the ZIP, and
writes everything to `build-log.txt`.

| Computer | Install file |
| --- | --- |
| Windows | `com.kw4ex.zeus.kpa1500-1.4.4.zip` |
| Mac with Apple silicon (M1–M4) | `com.kw4ex.zeus.kpa1500-1.4.4-osx-arm64.zip` |
| Intel Mac | `com.kw4ex.zeus.kpa1500-1.4.4-osx-x64.zip` |
| Linux PC (64-bit Intel/AMD) | `com.kw4ex.zeus.kpa1500-1.4.4-linux-x64.zip` |
| Raspberry Pi 4/5 (64-bit OS) | `com.kw4ex.zeus.kpa1500-1.4.4-linux-arm64.zip` |

The packages differ only in the bundled serial-port library (macOS adds
`libSystem.IO.Ports.Native.dylib`, Linux `libSystem.IO.Ports.Native.so`); the
UDP network connection is identical. `tools/package-unix.ps1` makes the macOS
and Linux ones (`BUILD-mac.command` / `BUILD-linux.sh` wrap it). CI builds all
five on every push and load-tests the Apple silicon, Linux x64 and Linux ARM64
packages on matching machines.

By hand — needs the .NET 10 SDK and PowerShell 7:

```powershell
dotnet build Zeus.Kpa1500.slnx -c Release
dotnet run --project tests/Kpa1500.Tests -c Release --no-build
pwsh src/Kpa1500/build-package.ps1 -ManagedDependency System.IO.Ports.dll
```

The ZIP lands in `artifacts/<id>/`. Install it in Zeus with
**Features → Community → Install local feature**. CI (`.github/workflows/ci.yml`)
does all three on every push and attaches the ZIP to `v*` tag releases.

## Before publishing

- `global.json` currently allows any .NET 10 SDK so local builds are easy. The
  catalog's rebuild check requires an exact pin with `"rollForward": "disable"`;
  set that to the SDK you build the release with before submitting.

- Feature ID is `com.kw4ex.zeus.kpa1500` (author KW4EX). It is permanent once
  listed; the `ROOT` class prefix at the top of the UI module must keep matching it.
- Community catalog notes: the optional TCI listener connects to Zeus's own TCI
  server, and the bundled `System.IO.Ports.dll` uses P/Invoke; both will draw
  reviewer attention under the catalog's rules. USB serial is kept on purpose:
  many stations reach the amp through a serial port or a virtual serial-port
  emulator. Raise both with the maintainers. See the catalog's `CONTRIBUTING.md`.

License: GPL-2.0-or-later.
