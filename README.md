# MCS class-file user guide (website)

A static teaching site generated from the class-file user guide. It is documentation only.

**Do not copy `output/mcs_class.dta` or `output/mcs_class.csv` into this folder.** The file remains UK Data Service End User Licence data.

## Sources

The site reads these files at build time and does not keep a second authored copy of the prose:

- `../docs/mcs_class_user_guide.md`
- `../docs/class_file_frequencies.md`
- `../scripts/recode_spec.csv`

Edit the guide or regenerate frequencies, then rebuild.

## Run locally

Needs Node.js 20.3 or newer.

```bash
cd site
npm install
npm test
npm run dev
```

Open http://localhost:4321/crim521-mcs-guide

```bash
npm run build
npm run preview
```

`npm run build` refuses to finish if a class dataset file has landed in `dist/`.

## What students can do here

- See the licence and how to cite the deposits
- Pick an outcome age and get the recommended weight plus R/Stata design statements
- Search class names, original names (`fcstol00`), and question text
- Browse the dictionary by age or domain

## Hosting

Live site: https://siyangni.github.io/crim521-mcs-guide/

This public repo is the **guide only**. Never publish the class dataset.
