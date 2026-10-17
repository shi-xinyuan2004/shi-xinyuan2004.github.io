#!/usr/bin/env python3
"""Build web-sized portfolio copies from the approved, collage-free HD library.

Run with: python3 scripts/import-real-portfolio.py /path/to/WeChat-stella-portfolio-HD
The original photographs are only read, never modified.
"""

import base64
import csv
import json
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "portfolio-assets" / "work"
# These source JPEGs carry a left-rotated EXIF orientation. Rotate the web
# pixels before removing metadata, so browsers show the people upright.
ROTATE_COUNTERCLOCKWISE = {83, 84, 85, 86, 88, 109}
# Image 87 becomes a black frame in macOS sips/ImageIO, although Chrome reads
# the original correctly. Export its web copies through a browser canvas.
BROWSER_RENDER = 87
# Selected Work leads with prominent, front-facing portraits; profiles,
# sunglasses, back views, and distant scenes follow later in the sequence.
FEATURED = [104, 62, 39, 3, 97, 83, 29, 88, 95, 93,
            54, 1, 53, 70, 64, 32, 33, 75, 117, 56,
            5, 140, 2, 112, 134, 116, 101, 78]

MUSEUM = set([3, 4, 34, 35, 36, 37, 75, 76, 77, 78, 80, 84, 85, 86, 88,
              101, 103, 104, 112, 113, 114, 115, 116, 138, 139, 140])
MOSQUE = set([31, 32, 33, 55, 56, 57, 62, 63, 64, 66, 67, 70, 71, 72, 73,
              81, 89, 90, 92, 98, 99, 105, 108, 109, 117, 118, 119, 120,
              130, 131, 132, 134])
PALACE = set([5, 6, 7, 8, 10, 11, 28, 29, 30, 58, 60, 61, 106, 111])
WATER = set([0, 1, 2, 19, 21, 23, 24, 25, 26, 38, 39, 40, 41, 45, 53, 54,
             83, 87, 93, 94, 95, 96, 97, 102])
DESERT = set([82, 121, 122, 123, 125])
FALCON = set([141, 142, 143, 144, 145, 146, 147])

DESCRIPTIONS = {
    76: ("Yellow by the water", "水畔一抹明黄", "Woman in a yellow dress beside the water and patterned museum dome", "身着黄色长裙的人站在水边，身后是博物馆的镂空穹顶"),
    63: ("Under the arches", "拱廊之间", "Portrait beneath the mosque arches beside a blue reflecting pool", "蓝色水池旁，人物立于清真寺的拱廊下"),
    1: ("A quiet crossing", "水上片刻", "Woman in a white dress seated on the stern of a boat above turquoise water", "身着白裙的人坐在游艇船尾，身下是碧蓝的海水"),
    122: ("At the desert edge", "沙海之间", "Portrait beside a turquoise pool with the desert beyond", "碧蓝泳池与沙漠交界处的人像"),
    32: ("Colonnade", "长廊光影", "Woman in white framed by a long row of mosque columns and lanterns", "白衣人物站在清真寺长廊中，两侧立柱与吊灯层层延伸"),
    75: ("Lines of light", "线条与光", "Woman in yellow beside a museum railing under a patterned dome", "黄裙人物倚着博物馆栏杆，身后是镂空穹顶"),
    54: ("Sea breeze", "海风轻拂", "Portrait in a pale green dress at the shoreline", "浅绿色长裙人物站在海浪边"),
    117: ("Blue hour", "蓝调时分", "Portrait in dark embroidered clothing before the mosque at twilight", "蓝调暮色中，黑色刺绣服饰人物站在清真寺前"),
    97: ("Window light", "窗边光影", "Seated portrait beside orchids in soft window light", "人物坐在兰花旁，柔和的窗光落在肩上"),
    49: ("A bold backdrop", "红色背景", "Portrait in front of a red sports car display", "人物站在红色跑车展品前"),
    62: ("The reflecting pool", "水池映像", "Close portrait in white embroidered clothing beside a blue reflecting pool", "白色刺绣服饰人物站在蓝色倒影池边"),
    83: ("Waterside portrait", "水边肖像", "Portrait by bright water in a white halter dress", "白色系带长裙人物坐在明亮的水边"),
    78: ("A view through glass", "隔窗望海", "Woman in yellow by a floor-to-ceiling museum window overlooking the sea", "黄裙人物站在博物馆落地窗前，向海面眺望"),
    93: ("Golden afternoon", "午后暖光", "Portrait on a terrace with water and palms behind", "暖阳下的人物站在露台上，身后是水面与棕榈树"),
    145: ("The falcon encounter", "与猎隼相遇", "Portrait holding a falcon indoors", "室内近景，人物手臂上停着一只猎隼"),
    39: ("Evening tide", "海边日落", "Portrait with waves and a soft sunset behind", "人物站在海边，远处是柔和的落日"),
    29: ("Palace glow", "宫廷暖光", "Portrait in warm light beneath an ornate interior arch", "华丽室内拱门下的暖光人像"),
    104: ("Under the dome", "穹顶之下", "Close portrait beside turquoise water and the museum dome", "人物在蓝绿色水边，身后是博物馆穹顶"),
    121: ("Desert dusk", "沙漠暮色", "Portrait holding a woven hat as the desert sunset fades", "沙漠夕照里，人物手持编织帽"),
    56: ("After dark", "夜色将至", "Close portrait in traditional clothing with illuminated mosque domes behind", "清真寺灯光亮起时的传统服饰近景人像"),
    88: ("By the museum", "博物馆外", "Portrait beside blue water with a latticed museum dome in view", "蓝色水面旁的人像，远处可见镂空穹顶"),
    3: ("In the open air", "庭院里的光", "Portrait in white against a pale museum wall", "浅色博物馆外墙前的白衣人像"),
    147: ("A small moment", "偶然一刻", "Portrait seated at a table holding a drink", "人物坐在桌边，手中端着一杯饮品"),
    64: ("Before the lights", "华灯初上", "Woman in white before the mosque domes at dusk", "暮色中，白衣人物站在清真寺圆顶前"),
    95: ("Terrace portrait", "露台留影", "Portrait on a sunlit terrace with palms in the distance", "阳光下的露台人像，远处是棕榈树"),
    33: ("Among the columns", "廊柱之间", "Side portrait among white mosque columns and hanging lanterns", "清真寺白色廊柱与吊灯之间的侧面人像"),
    82: ("The last light", "日暮沙丘", "Woman in a red dress seated by a desert cabana at sunset", "红裙人物坐在沙漠帐篷旁，天色渐暗"),
    70: ("A quieter frame", "静谧一隅", "Close portrait in a cream headscarf beside blue water", "浅色头巾人物倚在蓝色水池旁"),
    16: ("Night arrival", "夜色抵达", "Portrait in a burgundy dress beside a car at night", "夜色中，酒红色礼服人物站在车旁"),
    140: ("Light and reflection", "光与倒影", "Seated portrait inside the museum facing a bright window", "人物坐在博物馆明亮的窗前"),
    101: ("Looking at art", "观画的人", "Woman viewing a painting inside a gallery", "人物在展厅中观看一幅画作"),
    5: ("In the mirror", "镜中身影", "Portrait reflected in a mirror inside an ornate room", "华丽室内，人物与镜中倒影同框"),
    53: ("On the shore", "逐浪而行", "Portrait in a pale green dress near breaking waves", "浅绿色长裙人物站在海浪边"),
    142: ("With the falcons", "猎隼相伴", "Portrait between two perched falcons", "人物站在两只停栖的猎隼之间"),
    2: ("Across the water", "驶向海面", "Portrait seated on a small boat with Abu Dhabi in the distance", "人物坐在小艇上，远处是阿布扎比的海岸线"),
    112: ("A pause at the museum", "博物馆小憩", "Seated portrait inside a museum gallery", "博物馆展厅中的坐姿人像"),
}


def classify(index):
    if index in MUSEUM:
        return "art", "Louvre Abu Dhabi", "阿布扎比卢浮宫", "Portrait in and around the Louvre Abu Dhabi"
    if index in MOSQUE:
        return "landmarks", "Grand Mosque", "谢赫扎耶德大清真寺", "Portrait at the Sheikh Zayed Grand Mosque"
    if index in PALACE:
        return "landmarks", "Palace light", "宫殿光影", "Portrait in a palace setting in Abu Dhabi"
    if index in WATER:
        return "water", "By the water", "水边时光", "Portrait beside the water in Abu Dhabi"
    if index in DESERT:
        return "stories", "Desert light", "沙漠余晖", "Portrait in a desert setting at sunset"
    if index in FALCON:
        return "stories", "Falcon encounter", "与猎隼相遇", "Portrait with a falcon indoors"
    return "stories", "City moments", "城中片刻", "Lifestyle portrait in Abu Dhabi"


def make_copy(source, destination, longest_edge, quality, rotation=0):
    destination.parent.mkdir(parents=True, exist_ok=True)
    intermediate = destination.with_name(f".{destination.stem}-pre-rotate.jpg") if rotation else destination
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality),
                    "-Z", str(longest_edge), "--out", str(intermediate), str(source)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if rotation:
        try:
            subprocess.run(["sips", "-r", str(rotation), "--out", str(destination), str(intermediate)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        finally:
            intermediate.unlink(missing_ok=True)
    strip_metadata(destination)


def render_browser_pair(source, index):
    """Preserve a source that sips renders black; canvas also applies EXIF rotation."""
    chrome = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    if not chrome.is_file():
        raise RuntimeError("Google Chrome is required to render source photo 087")
    source_uri = "data:image/jpeg;base64," + base64.b64encode(source.read_bytes()).decode("ascii")
    html = ('<!doctype html><html><meta charset="utf-8"><img id="source" src="'
            + source_uri + '" hidden><pre id="display">WAIT</pre><pre id="thumb">WAIT</pre>'
            + '''<script>window.addEventListener('load',()=>{
                const image=document.getElementById('source');
                for(const [name,edge,quality] of [['display',2000,.8],['thumb',760,.72]]){
                    const scale=edge/Math.max(image.naturalWidth,image.naturalHeight);
                    const canvas=document.createElement('canvas');
                    canvas.width=Math.round(image.naturalWidth*scale);
                    canvas.height=Math.round(image.naturalHeight*scale);
                    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
                    document.getElementById(name).textContent=canvas.toDataURL('image/jpeg',quality);
                }
            });</script></html>''')
    with tempfile.TemporaryDirectory(prefix="portfolio-render-") as temp:
        temp_dir = Path(temp)
        page = temp_dir / "render.html"
        page.write_text(html, encoding="utf-8")
        result = subprocess.run([
            str(chrome), "--headless=new", "--disable-gpu", "--no-first-run",
            "--disable-background-networking", f"--user-data-dir={temp_dir / 'chrome-profile'}",
            "--virtual-time-budget=10000", "--dump-dom", page.as_uri()
        ], check=True, capture_output=True, text=True, timeout=60)
        for subdir in ("display", "thumb"):
            match = re.search(rf'<pre id="{subdir}">(.*?)</pre>', result.stdout, re.S)
            if not match or not match.group(1).startswith("data:image/jpeg;base64,"):
                raise RuntimeError(f"Chrome could not render source photo {index:03} ({subdir})")
            destination = OUT / subdir / f"{index:03}.jpg"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(base64.b64decode(match.group(1).split(",", 1)[1]))
            strip_metadata(destination)


def strip_metadata(path):
    """Remove EXIF/XMP/IPTC/comment segments from a generated JPEG copy."""
    data = path.read_bytes()
    if data[:2] != b"\xff\xd8":
        raise ValueError(f"Not a JPEG: {path}")
    output = bytearray(data[:2])
    position = 2
    while position < len(data):
        if data[position] != 0xff:
            raise ValueError(f"Unexpected JPEG marker offset in {path}")
        start = position
        while data[position] == 0xff:
            position += 1
        marker = data[position]
        position += 1
        if marker == 0xda:  # Start of Scan: the rest is compressed image data.
            output.extend(data[start:])
            break
        if marker == 0xd9:
            output.extend(data[start:position])
            break
        if marker in range(0xd0, 0xd8) or marker == 0x01:
            output.extend(data[start:position])
            continue
        length = int.from_bytes(data[position:position + 2], "big")
        end = position + length
        if length < 2 or end > len(data):
            raise ValueError(f"Invalid JPEG marker length in {path}")
        # Keep JFIF/ICC/Adobe color data; discard metadata and extra APP segments.
        if marker not in range(0xe1, 0xf0) and marker != 0xfe:
            output.extend(data[start:end])
        elif marker in (0xe2, 0xee):
            output.extend(data[start:end])
        position = end
    path.write_bytes(output)


def main():
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] != "--metadata-only"):
        raise SystemExit("Usage: python3 scripts/import-real-portfolio.py /path/to/approved-HD-library [--metadata-only]")
    library = Path(sys.argv[1]).resolve()
    with (library / "manifest.csv").open(newline="", encoding="utf-8") as stream:
        approved = {row["file"]: row for row in csv.DictReader(stream)}
    prior_index = ROOT / "photo-index.csv"
    if prior_index.exists():
        with prior_index.open(newline="", encoding="utf-8") as stream:
            indexed = [(int(row["id"].removeprefix("frame-")), row["original"])
                       for row in csv.DictReader(stream) if row["original"] in approved]
    else:
        # One-time import map from the original visual audit.
        with Path("/private/tmp/wechat-stella-collage-audit/map.csv").open(newline="", encoding="utf-8") as stream:
            indexed = [(int(row["index"]), row["file"]) for row in csv.DictReader(stream)
                       if row["file"] in approved]
    if len(indexed) != 122:
        raise SystemExit(f"Expected 122 approved single photos, found {len(indexed)}")
    missing = set(FEATURED) - {index for index, _ in indexed}
    if missing:
        raise SystemExit(f"Featured photos missing from approved collection: {sorted(missing)}")
    public_indexed = [(index, filename) for index, filename in indexed
                      if classify(index)[0] != "stories"]
    if len(public_indexed) != 93:
        raise SystemExit(f"Expected 93 public photographs, found {len(public_indexed)}")

    def copy_pair(pair):
        index, filename = pair
        source = library / filename
        if index == BROWSER_RENDER:
            render_browser_pair(source, index)
        else:
            rotation = 270 if index in ROTATE_COUNTERCLOCKWISE else 0
            make_copy(source, OUT / "thumb" / f"{index:03}.jpg", 760, 72, rotation)
            make_copy(source, OUT / "display" / f"{index:03}.jpg", 2000, 80, rotation)
        return index

    if len(sys.argv) == 2:
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(copy_pair, public_indexed))
    elif any(not (OUT / subdir / f"{index:03}.jpg").is_file()
             for index, _ in public_indexed for subdir in ("thumb", "display")):
        raise SystemExit("Cannot update metadata: some web image assets are missing")
    public_ids = {index for index, _ in public_indexed}
    for subdir in ("thumb", "display"):
        for image in (OUT / subdir).glob("*.jpg"):
            if image.stem.isdigit() and int(image.stem) not in public_ids:
                image.unlink()  # Generated web copy only; original HD library is untouched.

    order = {index: position for position, index in enumerate(FEATURED)}
    indexed.sort(key=lambda pair: (0, order[pair[0]]) if pair[0] in order else (1, pair[0]))
    records = []
    mapping = []
    for index, filename in indexed:
        category, scene, scene_zh, alt = classify(index)
        row = approved[filename]
        mapping.append({"id": f"frame-{index:03}", "original": filename,
                        "sha256": row["sha256"], "category": category,
                        "featured": index in order, "published": index in public_ids})
        if index not in public_ids:
            continue
        title, title_zh, image_alt, alt_zh = DESCRIPTIONS.get(
            index, (f"{scene} / {index:03}", f"{scene_zh} / {index:03}",
                    f"{alt}, frame {index:03}", f"{scene_zh}人像，第 {index:03} 幅"))
        width, height = int(row["width"]), int(row["height"])
        if index in ROTATE_COUNTERCLOCKWISE or index == BROWSER_RENDER:
            width, height = height, width
        records.append({
            "id": f"frame-{index:03}",
            "src": f"portfolio-assets/work/display/{index:03}.jpg",
            "thumb": f"portfolio-assets/work/thumb/{index:03}.jpg",
            "title": title, "titleZh": title_zh,
            "alt": image_alt, "altZh": alt_zh,
            "category": category, "featured": index in order,
            "width": width, "height": height,
        })
    (ROOT / "gallery-data.js").write_text(
        "// Web-sized copies of the owner's approved, collage-free photograph library.\n"
        + "window.PORTFOLIO_IMAGES = " + json.dumps(records, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8")
    with (ROOT / "photo-index.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=["id", "original", "sha256", "category", "featured", "published"])
        writer.writeheader()
        writer.writerows(mapping)
    print(f"Imported {len(records)} photos; {len(FEATURED)} featured.")


if __name__ == "__main__":
    main()
