# Accessibility Foundation

R3A adds accessibility foundations to the gated next shell without redesigning the product.

Implemented foundations:

- `#center-column` is assigned the main landmark role.
- Left and right panels remain complementary regions with accessible names.
- Route changes focus `#next-shell-route-heading`.
- A polite live region announces route changes.
- Three world hosts have accessible labels and a companion live status region.
- Product Hub cards and route controls are native buttons.
- Escape cancels active placement mode in the portable session state.
- `prefers-reduced-motion` is honored by CSS and reported in `ANCHOR_ACCESSIBILITY_DEBUG`.
- Focus-visible styling is explicit for the next shell and side panels.

This is not a claim of complete nonvisual 3D parity. Essential mission actions are available outside the canvas, but full screen-reader interaction with the 3D world remains future work.
