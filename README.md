# Xinyuan Shi — photography portfolio

Static bilingual (English/Chinese) photography portfolio for portrait enquiries in Abu Dhabi. Published at [shi-xinyuan2004.github.io](https://shi-xinyuan2004.github.io/). Open `index.html` locally, or serve this directory with a simple static server. No build or installation is required.

The homepage opens directly on a 28-photo selected gallery, then offers a 93-photo collection. Three filters cover landmarks, art and architecture, and water. The services page contains the supplied rates and an enquiry estimator. The language switch works on both pages and remembers an explicit choice when browser storage is available.

`travel-portraits.html` is the English-first international visitor entry, with selected portraits, an AED 300/hour private travel portrait offer, and a WhatsApp enquiry that carries preferred date, duration, party size and location. This is a separate experience from the existing services-page rates. The language switch also works on this page. The footer shows one shared, public page-view count across the three pages, using [Hits](https://hits.sh/) only on the published hostname; local previews do not increment it. The count starts when the badge is first loaded on the live site and represents image requests/page views, not unique people or historical visits.

`gallery-data.js` contains the image order, category, and English/Chinese captions. The visible gallery uses optimized 760-pixel thumbnails; the viewer opens 2000-pixel display copies from `portfolio-assets/work/`. Images display at their natural aspect ratio without a forced crop. Six source photos with EXIF rotation are normalized in the web copies; one source that `sips` renders black is exported through Chrome's canvas. The original high-resolution library remains untouched outside this checkout: it contains 122 approved single photographs, with collages and exact duplicates removed. The 29 photos previously grouped as “Other stories” are omitted from this site. Web copies have personal image metadata removed. The local, ignored `photo-index.csv` maps each photo to its original file and hash, and marks whether it is published in this local preview.

To regenerate image assets from the local approved library:

```sh
python3 scripts/import-real-portfolio.py /path/to/WeChat-stella-portfolio-HD
```

The photographs are supplied for this portfolio. The editorial photo titles and category labels were drafted from visual review and can be refined as preferred. The showcased work is portrait/travel photography. Company event and exhibition coverage is described as an enquiry opportunity, not represented as a completed case study.

The design is an original implementation inspired by the free Aside photography template. Work Sans is included under the OFL licence in `portfolio-assets/work-sans-OFL.txt`.
