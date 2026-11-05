# FlexControl Knob for Zeus 1.0.1

Use the **FlexRadio FlexControl** USB tuning knob with Zeus. Turning tunes VFO A; a press can switch the knob to AF volume, AGC gain, VFO B, RIT, XIT, tuning step or TX drive; twelve presses (the knob press and buttons 1 to 3, each as tap, double tap or long press) each run a function you choose in Settings.

Plug the knob into the computer that runs Zeus. The panel shows what turning does right now and what each press does.

This is a separate add-on from the Elecraft KPA1500 one, on its own release. The KPA1500 add-on is on the [Releases page](https://github.com/kw4ex/zeus-amp/releases/latest).

## Changes in 1.0.1
- The knob's serial lines (DTR/RTS) are switched on when it is opened, as the earlier bridge did, so more knobs start reliably.
- The knob's first messages are logged to help diagnose a knob that does not respond.

## How to download (no GitHub account needed)

1. Look at the **Assets** list at the bottom of this release page. If you only see a few files, click **Show all … assets**.
2. Click the file name for **your computer**:

   | Your computer | Click the file ending in |
   | --- | --- |
   | Windows PC | `-<version>.zip` (the one with no extra word, e.g. `…-1.0.1.zip`) |
   | Mac with Apple silicon (M1, M2, M3, M4) | `-osx-arm64.zip` |
   | Intel Mac | `-osx-x64.zip` |
   | Linux PC (64-bit) | `-linux-x64.zip` |
   | Raspberry Pi 4 or 5 (64-bit) | `-linux-arm64.zip` |

3. Your browser saves it, normally in your **Downloads** folder.
4. **Do not click "Source code (zip)" or "Source code (tar.gz)"**. Those are for programmers and Zeus cannot install them.
5. **Do not unzip the file.** Zeus opens the `.zip` itself.
6. In Zeus: **Features > Community > Install local feature**, pick the `.zip`, then restart Zeus.
7. Add the panel: **Add Panel > Controls > FlexControl Knob**. Plug the knob into the computer that runs Zeus.

Not sure which Mac you have? Apple menu > **About This Mac**: "Chip: Apple M…" means Apple silicon; "Processor: Intel" means Intel.

**Other versions:** to go back to an older version, open the [Releases page](https://github.com/kw4ex/zeus-amp/releases), find that version and download the same way. Installing a version replaces the one you have; there is nothing to remove first.

The `FlexControl-Knob-for-Zeus-guide.pdf` file in the Assets list is the illustrated "Read Me First" guide.

**No warranty. Use at your own risk.** This is shared free by one radio operator, "as is". It is not made, approved or supported by Elecraft, FlexRadio or the Zeus project.
