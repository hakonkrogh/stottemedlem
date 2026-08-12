# Backdrop images

Drop the hero-collage photos here — a range of activities, sports, and
community life (korps, kor, idrett, dugnad, …).

Every `*.jpg / *.jpeg / *.png / *.webp / *.avif` file in this folder is picked
up automatically by `src/components/HeroBackdrop.astro`; no registration step.
Files are laid out in filename order, so prefix with numbers (`01-…`, `02-…`)
to control the composition order.

After the images land, per-image focal points go in the `focalPoints` map in
`HeroBackdrop.astro` (filename → CSS `object-position`) so crops keep the
subject in frame.

## Sources

Images 26–32 are Unsplash photos (standard Unsplash license), downloaded at
640px width. Unsplash photo ids, for provenance:

| File | Unsplash id |
|------|-------------|
| 26-ski-school-kids | d3Lm40Dn9rA |
| 27-ice-hockey-kids | fwnG5gpi1BA |
| 28-gymnastics-balance | kzPJuTb2a5Q |
| 29-gym-trampoline-girls | M6_W4IpYNEQ |
| 30-kids-stage-costumes | fRpxx7ODvjk |
| 31-volleyball-match | FcuE1a_pOA0 |
| 32-flag-parade | ubbW_oRlIi8 |

Images 33–38 were hand-picked downloads (Unsplash originals, ids not
recorded), re-encoded to the same 640px/EXIF-stripped convention.
