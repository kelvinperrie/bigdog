# Project Requirements & Specification Document: Expanding Word Web App

## 1. Project Overview
- **Project Name:** Expanding Word
- **Summary:** A minimal interactive web application displaying a single centered word that dynamically expands in font size upon user keyboard interaction.
- **Primary Goal / Value Proposition:** Provide an engaging, interactive typography experience driven entirely by keyboard controls to manipulate text scaling and animation speed in real time.

---

## 2. Core Display & Visual Layout
- **Visual Presentation:**
  - A clean, uncluttered interface where a single word is positioned at the exact center (horizontally and vertically) of the viewport.
  - The word must remain centered regardless of font size growth, viewport resizing, or screen resolution.
  - Overflow handling: The word can grow unbounded beyond viewport boundaries while preserving center alignment without causing jarring page layout shifts.
- **Initial Content:**
  - Default word: `"dog"`.
  - The word is configurable via the URL query parameter `?word=...` or the on-screen input in the HUD.
  - **Auto-start:** If the page is loaded with a custom word in the query string (e.g. `?word=cat`), the page starts off running immediately, as if the space bar had already been pressed. (Because the initial expansion speed is zero, the word will not grow until the expansion speed is increased.) Without a query-string word, the page starts in the "Ready" (not expanding) state.
- **Initial Font Size:**
  - Baseline size: **10pt**.

---

## 3. Interactive Keyboard Controls & Behavior

| Key Input | Action / Behavior |
| :--- | :--- |
| **Spacebar (`Space`)** | **Start / Pause Toggle (expansion and rotation):**<br>- As soon as the user presses the space bar, the animation starts (the word starts expanding in font size, and rotating if a rotation has been set).<br>- If pressed while running, it pauses both expansion and rotation at the current font size and angle.<br>- If pressed while paused, it resumes both expansion and rotation. |
| **Up Arrow (`ArrowUp`)** | **Increase Expansion Speed:** Increases the expansion speed by **10% of the base rate**. Starts the animation if it is currently stopped (ready or paused). |
| **Down Arrow (`ArrowDown`)** | **Decrease Expansion Speed:** Decreases the expansion speed by **10% of the base rate**. The speed can go below zero, in which case the word shrinks. Starts the animation if it is currently stopped (ready or paused). |
| **Enter (`Enter`)** | **Reset:** Returns the font to its original size (**10pt**), stops any rotation, and returns the text to horizontal (0°). |
| **Left Arrow (`ArrowLeft`)** | **Rotate Left:** Starts the word rotating to the left (counter-clockwise). Subsequent presses while rotating left increase the rotation speed by **+10%**. If the word is rotating right, each press of Left slows the rotation (see 4a) until it stops; the next press of Left then starts it rotating left at the base rotation speed. Starts the animation if it is currently stopped (ready or paused). |
| **Right Arrow (`ArrowRight`)** | **Rotate Right:** Starts the word rotating to the right (clockwise). Subsequent presses while rotating right increase the rotation speed by **+10%**. If the word is rotating left, each press of Right slows the rotation (see 4a) until it stops; the next press of Right then starts it rotating right at the base rotation speed. Starts the animation if it is currently stopped (ready or paused). |
| **W (`KeyW`)** | **Scroll Up:** If the text is taller than the screen can show, scrolls the view up by **10%** of the viewport height. |
| **S (`KeyS`)** | **Scroll Down:** If the text is taller than the screen can show, scrolls the view down by **10%** of the viewport height. |
| **A (`KeyA`)** | **Scroll Left:** If the text is wider than the screen can show, scrolls the view left by **10%** of the viewport width. |
| **D (`KeyD`)** | **Scroll Right:** If the text is wider than the screen can show, scrolls the view right by **10%** of the viewport width. |

---

## 4. Expansion & Animation Mechanics
- **Initial Expansion Speed:**
  - **Zero.** When the animation starts, the word does not grow until the user presses Up Arrow (or shrink until Down Arrow).
- **Base Rate (step reference):**
  - **1 font point every half second (500 ms)** (equivalent to 2 pt/second). Speed steps are 10% of this base rate.
- **Speed Adjustment Calculation:**
  - Each Up Arrow press adds 10% of the base rate (+0.2 pt/s, i.e. +0.10x multiplier).
  - Each Down Arrow press subtracts 10% of the base rate (-0.2 pt/s, i.e. -0.10x multiplier).
  - Steps are additive (not compounding) so the speed can pass through zero.
  - **No upper limit on expansion speed**—Up Arrow presses can keep increasing the speed indefinitely.
  - **No lower limit on expansion speed**—the speed can go to zero and below with no cap. A negative speed makes the word shrink.
- **Growth Bounds:**
  - **No maximum font size limit**—the word can expand indefinitely without an upper ceiling.
  - The font size cannot go below **0pt**; when shrinking, it stops at 0pt (the word becomes invisible) until the speed is made positive again or the page is reset.
- **Centering Preservation:**
  - Must remain strictly in the center of the page at all times during scaling (offset only by any W/A/S/D scrolling the user has applied).

---

## 4a. Rotation Mechanics
- **Base Rotation Speed:** 45 degrees per second.
- Rotation shares the start/pause state with expansion: Space pauses and resumes both together.
- Reset (Enter) stops rotation and returns the word to horizontal (0°).
- Pressing an arrow when the word is not rotating starts rotation in that direction at the base speed.
- Each subsequent press of the arrow matching the current rotation direction multiplies the rotation speed by `1.10` (+10%), with no upper limit.
- **Slowing / reversing:** Pressing the arrow opposite to the current rotation direction slows the rotation rather than reversing it immediately. Each press reduces the rotation speed by 10% of the current speed, or by 10% of the base speed (4.5°/s) if that is larger, so the rotation always reaches a stop in a finite number of presses (10 presses from the base speed). Once the rotation has stopped, the next press of that arrow starts rotation in the new direction at the base speed.
- The word rotates about its own center.

---

## 4b. Scrolling Mechanics
- Scrolling only applies on an axis where the (rotated) text is larger than the viewport; otherwise the key press has no effect.
- Each press moves the view by 10% of the viewport dimension on that axis (height for W/S, width for A/D).
- The view cannot scroll past the edges of the text; if the text later shrinks (e.g. on reset), the scroll offset is clamped back accordingly.

---

## 4c. HUD Metrics
- The HUD metrics area shows: **Font Size** (pt), **Growth Rate** (pt/s), **Multiplier**, and **Rotation** (current rotation speed in °/s, with ↻ for clockwise/right or ↺ for counter-clockwise/left; no arrow when not rotating).
- Metrics are laid out in a 2×2 grid.

## 4d. HUD Controls Legend
- The keyboard controls list shows Up / Down on a single line labelled **"Expansion speed ±10%"**, matching how Left / Right rotation is shown on a single line.
- Speed-related labels and notifications refer to "expansion speed" rather than just "speed".

---

## 5. Non-Functional & Technical Requirements
- **Technology Stack:**
  - HTML5, CSS3, and vanilla JavaScript (lightweight, zero-dependency, running directly in any modern web browser).
- **Smoothness & Precision:**
  - Animation loop (e.g., `requestAnimationFrame` with delta-time calculation or accurate timers) ensuring smooth continuous font size growth and responsive keyboard input handling.
- **Browser Event Handling:**
  - Prevent default browser scrolling behavior for `Space` and all arrow keys during interaction.
  - Keyboard shortcuts (including W/A/S/D) are ignored while typing in the word input field.
- **Browser Compatibility:**
  - Support modern evergreen browsers (Chrome, Firefox, Safari, Edge).

---

## 6. Future Considerations & Extensibility
- Optional visual HUD/indicator showing current font size (in pt) and speed multiplier.
- Custom fonts, colors, or theme configurations.

