# Heady Repo Builder v6.5.0 (Release)

This release provides a **release-ready wrapper** around the most recent integrated builder (v6.4.0 in this workspace) and post-applies the improvements generated in this project conversation.

## Highlights

- **One-command workflow**: run v6.5.0 exactly like the prior builder; it will automatically apply post-build improvements.
- **Deterministic artifacting**: optional checksum manifest generation and an idempotent improvements layer.
- **Operational readiness docs**: JWT rotation, load testing, compression, and structured logging guidance.
- **Optimization node scaffolding**: adaptive optimizer script and a dynamic feedback loop design doc.
- **Content intake UX**: simple link submission UI + server, plus CLI utilities.

## Usage

```bash
python3 build_heady_drupal_project_v6_5_0_release.py \
  --slug example --apex-domain example.com --out-dir ./example \
  --drupal-zip ./drupal-11.3.2_1.zip --force
```

To skip post-apply improvements:

```bash
python3 build_heady_drupal_project_v6_5_0_release.py ... --no-apply-improvements
```

To only apply improvements to an existing repo:

```bash
python3 build_heady_drupal_project_v6_5_0_release.py --apply-improvements-only --out-dir ./example
```

## Inputs

- Requires the v6.4.0 integrated builder to be co-located in the same directory as v6.5.0.
- Uses a local Drupal zip (recommended) for reproducible builds.

## Notes

This wrapper does **not** change your generated repo’s logic relative to v6.4.0; it standardizes and packages a safe improvements layer and release ergonomics.
