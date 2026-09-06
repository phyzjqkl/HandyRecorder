import argparse
import html
import json
import os
import time
import traceback
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from paddleocr import PaddleOCR


DEFAULT_DET_MODEL = "PP-OCRv5_mobile_det"
DEFAULT_REC_MODEL = "en_PP-OCRv5_mobile_rec"


def _as_list(v):
    if v is None:
        return []
    if hasattr(v, "tolist"):
        return v.tolist()
    return list(v)


def _result_dict(res):
    if isinstance(res, dict):
        return res
    try:
        return dict(res)
    except Exception:
        return {}


def run_ocr(image_path: Path, det_model: str, rec_model: str):
    os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    t0 = time.perf_counter()
    ocr = PaddleOCR(
        lang="en",
        text_detection_model_name=det_model,
        text_recognition_model_name=rec_model,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_rec_score_thresh=0.0,
    )
    create_ms = (time.perf_counter() - t0) * 1000.0

    t1 = time.perf_counter()
    results = ocr.predict(str(image_path))
    infer_ms = (time.perf_counter() - t1) * 1000.0

    d = _result_dict(results[0]) if results else {}
    texts = _as_list(d.get("rec_texts"))
    scores = _as_list(d.get("rec_scores"))
    boxes = _as_list(d.get("rec_boxes"))
    polys = _as_list(d.get("rec_polys"))

    items = []
    for i, text in enumerate(texts):
        score = float(scores[i]) if i < len(scores) else 0.0
        box = boxes[i] if i < len(boxes) else None
        poly = polys[i] if i < len(polys) else None
        if box is not None and len(box) >= 4:
            x1, y1, x2, y2 = [int(round(float(v))) for v in box[:4]]
        elif poly is not None and len(poly) >= 4:
            xs = [int(round(float(p[0]))) for p in poly]
            ys = [int(round(float(p[1]))) for p in poly]
            x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
        else:
            x1 = y1 = x2 = y2 = 0
        items.append(
            {
                "index": i + 1,
                "text": str(text),
                "score": score,
                "x": x1,
                "y": y1,
                "w": max(0, x2 - x1),
                "h": max(0, y2 - y1),
            }
        )

    return {
        "ok": True,
        "image": str(image_path),
        "det_model": det_model,
        "rec_model": rec_model,
        "create_ms": round(create_ms, 1),
        "infer_ms": round(infer_ms, 1),
        "count": len(items),
        "items": items,
    }


def write_marked(image_path: Path, result: dict, out_png: Path):
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font = ImageFont.load_default()

    for item in result["items"]:
        x, y, w, h = item["x"], item["y"], item["w"], item["h"]
        if w <= 0 or h <= 0:
            continue
        draw.rectangle([x, y, x + w, y + h], outline=(255, 0, 0), width=2)
        label = f"{item['index']} {item['score']:.2f}"
        draw.rectangle([x, max(0, y - 18), x + 72, y], fill=(255, 255, 180), outline=(180, 120, 0))
        draw.text((x + 2, max(0, y - 17)), label, fill=(0, 0, 0), font=font)

    img.save(out_png)


def write_html(result: dict, image_path: Path, marked_png: Path, out_html: Path):
    if not result.get("ok", False):
        doc = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>PaddleOCR Preview</title>
<style>
body{{font-family:Segoe UI,Arial,sans-serif;margin:14px;background:#f5f6f8;color:#20242a}}
.err{{padding:10px;background:#ffd6d6;border:1px solid #c44;margin-bottom:10px}}
pre{{white-space:pre-wrap;background:#101820;color:#e6edf3;padding:10px}}
</style></head>
<body>
<h1>PaddleOCR Preview</h1>
<div class="err">OCR failed</div>
<pre>{html.escape(result.get("error", ""))}</pre>
<h2>Traceback</h2>
<pre>{html.escape(result.get("traceback", ""))}</pre>
</body></html>"""
        out_html.write_text(doc, encoding="utf-8")
        return

    rows = []
    for item in result["items"]:
        rows.append(
            "<tr>"
            f"<td>{item['index']}</td>"
            f"<td>{html.escape(item['text'])}</td>"
            f"<td>{item['score']:.4f}</td>"
            f"<td>{item['x']},{item['y']},{item['w']},{item['h']}</td>"
            "</tr>"
        )

    text_joined = "\n".join([i["text"] for i in result["items"] if i["text"]])
    doc = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>PaddleOCR Preview</title>
<style>
body{{font-family:Segoe UI,Arial,sans-serif;margin:14px;background:#f5f6f8;color:#20242a}}
.msg{{padding:8px;background:#fff3b0;border:1px solid #d7b247;margin-bottom:10px}}
.row{{display:flex;gap:16px;align-items:flex-start}}
.pane{{background:white;border:1px solid #ccd3da;padding:8px;max-width:48vw;overflow:auto}}
img{{border:1px solid #333;max-width:none}}
table{{border-collapse:collapse;width:100%;background:white;margin-top:10px}}
td,th{{border:1px solid #ccd3da;padding:4px 6px;text-align:left}}
pre{{white-space:pre-wrap;background:#101820;color:#e6edf3;padding:8px}}
</style></head>
<body>
<h1>PaddleOCR Preview</h1>
<div class="msg">items={result['count']} create_ms={result['create_ms']} infer_ms={result['infer_ms']} det={html.escape(result.get('det_model', ''))} rec={html.escape(result.get('rec_model', ''))}</div>
<div class="row">
<div class="pane"><h2>Region</h2><div>{html.escape(str(image_path))}</div><img src="{image_path.name}?t={time.time()}"></div>
<div class="pane"><h2>Marked</h2><div>{html.escape(str(marked_png))}</div><img src="{marked_png.name}?t={time.time()}"></div>
</div>
<h2>Text</h2><pre>{html.escape(text_joined)}</pre>
<h2>Items</h2><table><thead><tr><th>#</th><th>Text</th><th>Score</th><th>x,y,w,h</th></tr></thead><tbody>
{''.join(rows)}
</tbody></table>
</body></html>"""
    out_html.write_text(doc, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--json", required=True)
    parser.add_argument("--marked", required=True)
    parser.add_argument("--html", required=True)
    parser.add_argument("--det-model", default=DEFAULT_DET_MODEL)
    parser.add_argument("--rec-model", default=DEFAULT_REC_MODEL)
    args = parser.parse_args()

    image_path = Path(args.image).resolve()
    out_json = Path(args.json).resolve()
    out_marked = Path(args.marked).resolve()
    out_html = Path(args.html).resolve()

    try:
        result = run_ocr(image_path, args.det_model, args.rec_model)
        write_marked(image_path, result, out_marked)
        out_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        write_html(result, image_path, out_marked, out_html)
        print(json.dumps({"ok": True, "count": result["count"], "html": str(out_html)}, ensure_ascii=False))
    except Exception as exc:
        result = {
            "ok": False,
            "image": str(image_path),
            "det_model": args.det_model,
            "rec_model": args.rec_model,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }
        out_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        write_html(result, image_path, out_marked, out_html)
        print(json.dumps({"ok": False, "error": str(exc), "html": str(out_html)}, ensure_ascii=False))
        raise SystemExit(2)


if __name__ == "__main__":
    main()
