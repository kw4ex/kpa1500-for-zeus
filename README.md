# KW4EX — Zeus SDR features

Two add-ons ("community features") for **Zeus**, the SDR program for ANAN and
other openHPSDR radios. They are written for operators, not programmers: you
download one file and Zeus installs it.

| Feature | Latest | What it does |
| --- | --- | --- |
| **Elecraft KPA1500** | 1.4.4 | Meters and buttons for the KPA1500 amplifier and its ATU; the amp follows the VFO (including a FlexRadio read directly); Standby on Tune; "No antenna?" warning; small view and built-in help; a browser page for this or other computers, tablets and phones; power-on over the network. |
| **FlexControl Knob** | 1.0.1 | Use the FlexRadio FlexControl USB tuning knob with Zeus: VFO tuning, AF volume, AGC gain and more, every press programmable. |

## Download

**Start at the [Releases page](https://github.com/kw4ex/zeus-amp/releases).** The top
entry marked **Latest** is the newest version. Older versions stay listed below it,
each with its own download files.

How to download (no GitHub account needed):

1. On the Releases page, click the version you want (the newest is at the top).
2. Scroll to the **Assets** list at the bottom. If you only see a few files, click
   **Show all … assets**.
3. Click the file for **your computer** (table below). Your browser saves it, normally
   in your **Downloads** folder.
4. **Don't click "Source code (zip)" or "Source code (tar.gz)"** — those are for
   programmers. **Don't unzip** the file you downloaded; Zeus opens the `.zip` itself.
5. In Zeus: **Features → Community → Install local feature**, pick the `.zip`, then
   restart Zeus. The panel's top line shows the version.

| Your computer | File name ends in |
| --- | --- |
| Windows PC | `-<version>.zip` (no extra word) |
| Mac with Apple silicon (M1–M4) | `-osx-arm64.zip` |
| Intel Mac | `-osx-x64.zip` |
| Linux PC (64-bit) | `-linux-x64.zip` |
| Raspberry Pi 4/5 (64-bit OS) | `-linux-arm64.zip` |

Not sure which Mac you have? Apple menu → **About This Mac**: "Chip: Apple M…" is
Apple silicon, "Processor: Intel" is Intel.

To go back to an older version, scroll down the Releases page to it and download it
the same way. Installing a version replaces the one you have.

Another way (same files): the [builds branch](https://github.com/kw4ex/zeus-amp/tree/builds)
has a numbered folder per version. Open the folder, click the file, then click the
**download** button (↓, "Download raw file").

- **KPA1500, newest:** [builds/latest](https://github.com/kw4ex/zeus-amp/tree/builds/latest)
- **FlexControl Knob, newest:** [builds/flexknob/latest](https://github.com/kw4ex/zeus-amp/tree/builds/flexknob/latest)

## Install

1. In Zeus open **Features › Community › Install local feature**.
2. Pick the `.zip` file you downloaded and click **Open**. A newer version
   simply replaces the older one.
3. Close and restart Zeus, then add the panel: **Add Panel › Amplifiers ›
   KPA1500** or **Add Panel › Controls › FlexControl Knob**.

## Instructions

- **KPA1500:** [step-by-step guide (PDF)](docs/guides/KPA1500-for-Zeus-guide.pdf) —
  what you need, install on Windows, Mac, Linux and Raspberry Pi, first-time
  settings, what each button means, a safe first test and troubleshooting.
  Short reference: [src/Kpa1500/README.md](src/Kpa1500/README.md).
- **FlexControl Knob:** [src/FlexKnob/README.md](src/FlexKnob/README.md).

**Important:** only one program should control the amplifier. Close the
KPA1500 Thetis bridge (and Thetis) while Zeus is running. Standby on Tune and
the receive-level features need **TCI switched on in Zeus** (port 40001).

## No warranty — use at your own risk

These add-ons are shared by one radio operator, **as is**. There is **no
warranty of any kind**: no promise that they work, that they are safe, or that
they suit your equipment or purpose. Amplifiers, radios and antennas can be
damaged, and RF can be dangerous. You are responsible for checking that they
behave correctly with your own station, and for operating within your license.
The author is not liable for any damage or loss. They are not made, approved or
supported by Elecraft, FlexRadio or the Zeus project.

## For programmers

Building, testing and packaging: [docs/DEVELOPERS.md](docs/DEVELOPERS.md).

License: GPL-2.0-or-later. "Elecraft", "KPA1500", "FlexRadio" and "FlexControl"
are names of their owners; these are independent, community-made add-ons.
