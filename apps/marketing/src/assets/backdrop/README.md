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
