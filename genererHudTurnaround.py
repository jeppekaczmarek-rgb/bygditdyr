#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Regenererer hud-turnarounds (fjer/glat/skael) med Gemini image-til-image.
Model: gemini-3.1-flash-image (Nano Banana flash). Noegle laeses fra .env (GEMINI_API_KEY).
Koerer image-til-image paa de NEUTRALE turnarounds og bevarer pose/silhuet (stram bind-pose-laas).

Brug:
  python3 genererHudTurnaround.py one <skin> <input.png> <output.png>   # enkelt billede (test)
  python3 genererHudTurnaround.py run [maxN] [angle]                    # batch, genoptag-bar
      maxN = 0 -> alle resterende. angle = side|trekvart|front|bag (udeladt = alle vinkler)
"""
import os, sys, json, base64, time, urllib.request, urllib.error, shutil

REPO = os.path.dirname(os.path.abspath(__file__))
DYR = os.path.join(REPO, "assets", "dyr")
MODEL = "gemini-3.1-flash-image"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % MODEL

def load_key():
    with open(os.path.join(REPO, ".env"), encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("GEMINI_API_KEY mangler i .env")

KEY = load_key()

BASES = ["base1_generalist", "base2_slank", "base3_kraftig"]
ANGLES = ["side", "trekvart", "front", "bag"]

# Stram pose-laas: kun overflade aendres, silhuet/pose bevares 1:1.
KEEP = ("Image-to-image on this neutral grey turnaround. STRICT surface-only retexture: keep the EXACT "
        "same silhouette, outline, pose, body proportions, camera angle and framing as the input image. "
        "Do NOT move, raise or re-pose the tail, head, neck or legs. The tail stays straight and "
        "horizontal pointing backwards, exactly as in the input. The new surface lies flat against the "
        "existing body shape and must NOT change the outline of the animal. ")
POS = ("Photorealistic living wild animal, natural daylight wildlife photography, high detail, "
       "alert glossy eye with a bright catchlight, soft realistic shading, rich colour variation "
       "across the body. ")
NEG = ("Negative: no clay, no grey unpainted maquette, no ZBrush sculpt, no monochrome, no porcelain "
       "or ceramic glaze, no statue, no figurine, no matte primer, no flat uniform colour, no plastic, "
       "no change of pose, no raised tail, no spread wings.")

PROMPTS = {
 "fjer": KEEP + ("Cover the entire four-legged body in real bird plumage: short overlapping contour "
   "feathers lying flat across the torso, neck and legs, soft downy feathers on the belly. Vivid "
   "naturalistic plumage like a pheasant or Eurasian jay: a warm russet-and-chestnut body, a cream "
   "breast finely barred with black, and a brilliant iridescent blue-green sheen across the neck, "
   "shoulders and back that shifts with the light, with crisp dark feather tips. Individual feathers "
   "clearly visible with soft edges. This is a four-legged mammal-shaped animal COVERED in feathers - "
   "no wings, no beak, no bird feet. The feathers lie FLAT and smooth against the body and follow the "
   "existing outline; do NOT add wings, wing-shaped feather fans, raised crests or a long flowing tail "
   "plume - the tail keeps its original straight horizontal shape, just covered in short feathers. ")
   + POS + NEG + " Not dull, not muted.",
 "glat": KEEP + ("Give the whole body smooth, moist amphibian skin like a frog or fire salamander. "
   "Countershaded colour: deep olive-to-grass green along the back, fading to a pale yellow-cream belly, "
   "broken up by dark marbled blotches and a scatter of warm yellow-orange spots along the flanks. Wet, "
   "slightly glossy sheen with soft specular highlights along the spine. Smooth skin - no scales, no fur. ")
   + POS + NEG + " Not a uniform glaze.",
 "skael": KEEP + ("Cover the whole body in fine overlapping reptile scales like a monitor lizard or python. "
   "Naturalistic colour with clear variation: warm bronze-and-amber scales along the back with darker "
   "chocolate-brown dorsal banding and blotches, fading to a paler sandy-gold belly, plus a faint blue-green "
   "iridescent sheen catching the light on the larger back scales. Crisp scale texture, countershading. ")
   + POS + NEG + " Not flat uniform olive.",
}

def generate(skin, input_png, output_png, timeout=40):
    with open(input_png, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    body = {"contents": [{"role": "user", "parts": [
                {"text": PROMPTS[skin]},
                {"inline_data": {"mime_type": "image/png", "data": img_b64}}]}],
            "generationConfig": {"responseModalities": ["IMAGE"], "temperature": 0.35}}
    req = urllib.request.Request(ENDPOINT + "?key=" + KEY,
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            resp = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print("  HTTP-FEJL", e.code, e.read().decode()[:500]); return False
    except Exception as e:
        print("  FEJL", repr(e)[:300]); return False
    try:
        parts = resp["candidates"][0]["content"]["parts"]
    except Exception:
        open("/tmp/last_response.json", "w").write(json.dumps(resp)[:4000])
        print("  INTET CANDIDATE:", json.dumps(resp)[:400]); return False
    for p in parts:
        inl = p.get("inlineData") or p.get("inline_data")
        if inl and inl.get("data"):
            with open(output_png, "wb") as o:
                o.write(base64.b64decode(inl["data"]))
            return True
    fr = resp["candidates"][0].get("finishReason")
    open("/tmp/last_response.json", "w").write(json.dumps(resp)[:4000])
    print("  INTET BILLEDE (finishReason=%s) - dump i /tmp/last_response.json" % fr); return False

def jobs(angle=None):
    out = []
    for skin in ["fjer", "glat", "skael"]:
        for base in BASES:
            for ang in ANGLES:
                if angle and ang != angle:
                    continue
                out.append((skin, base, ang,
                            os.path.join(DYR, base, "turnaround", ang + ".png"),
                            os.path.join(DYR, base + "_" + skin, "turnaround", ang + ".png")))
    return out

def run(maxn, angle=None):
    prog = os.path.join(DYR, ".regen_progress.json")
    done = set(json.load(open(prog))) if os.path.exists(prog) else set()
    bdir = os.path.join(DYR, "_backup_turnarounds_15jun")
    n = 0
    alljobs = jobs(angle)
    for skin, base, ang, inp, outp in alljobs:
        key = "%s/%s/%s" % (skin, base, ang)
        if key in done:
            continue
        if maxn and n >= maxn:
            break
        if not os.path.exists(inp):
            print("MANGLER input", inp); continue
        if os.path.exists(outp):
            rel = os.path.join(bdir, base + "_" + skin); os.makedirs(rel, exist_ok=True)
            bpath = os.path.join(rel, ang + ".png")
            if not os.path.exists(bpath):
                shutil.copy2(outp, bpath)
        os.makedirs(os.path.dirname(outp), exist_ok=True)
        print("GEN", key, "...", end=" ", flush=True)
        t = time.time()
        if generate(skin, inp, outp):
            print("OK %.1fs" % (time.time() - t))
            done.add(key); json.dump(sorted(done), open(prog, "w")); n += 1
        else:
            print("-> sprunget over")
        time.sleep(0.4)
    print("FAERDIGE (denne kategori): %d/%d" % (len([k for k in done if not angle or k.endswith('/'+angle)]), len(alljobs)))

if __name__ == "__main__":
    if len(sys.argv) >= 5 and sys.argv[1] == "one":
        ok = generate(sys.argv[2], sys.argv[3], sys.argv[4])
        print("OK" if ok else "FEJL"); sys.exit(0 if ok else 1)
    elif len(sys.argv) >= 2 and sys.argv[1] == "run":
        maxn = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 0
        angle = sys.argv[3] if len(sys.argv) > 3 else None
        run(maxn, angle)
    else:
        print(__doc__)
