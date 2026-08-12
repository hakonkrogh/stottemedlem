-- Focal point for the banner image: object-position percentages (0–100)
-- choosing which part of the banner stays in view when it is cropped to the
-- wide backdrop format. NULL means center (50/50).
ALTER TABLE organizations ADD COLUMN banner_focus_x INTEGER;
ALTER TABLE organizations ADD COLUMN banner_focus_y INTEGER;
