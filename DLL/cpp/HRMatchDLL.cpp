// HRMatchDLL.cpp
// Lightweight HandyRecorder image matching prototype.
//
// Exports:
//   HRM_Version()
//   HRM_ImageSearch(x1, y1, right, bottom, imagePath, method, threshold, flags)
//   HRM_FindText(x1, y1, right, bottom, text, threshold, flags)
//
// Return:
//   found|x|y|w|h|score|second_score|reason|elapsed_ms
//
// method:
//   0 = mean absolute difference similarity
//   1 = normalized grayscale correlation
//   2 = edge normalized correlation
//
// flags:
//   bit 0 = invert grayscale values before matching

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <wincodec.h>
#include <stdint.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>

struct ImageGray {
    int w;
    int h;
    unsigned char* px;
};

static char g_result[512];

static unsigned char* AllocBytes(size_t count) {
    return (unsigned char*)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, count);
}

static void FreeImage(ImageGray* img) {
    if (!img) return;
    if (img->px) HeapFree(GetProcessHeap(), 0, img->px);
    img->px = 0;
    img->w = 0;
    img->h = 0;
}

static double NowMs() {
    LARGE_INTEGER freq;
    LARGE_INTEGER ticks;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&ticks);
    return (double)ticks.QuadPart * 1000.0 / (double)freq.QuadPart;
}

static void SetResult(int found, int x, int y, int w, int h, double score, double second, const char* reason, double elapsed) {
    snprintf(g_result, sizeof(g_result), "%d|%d|%d|%d|%d|%.6f|%.6f|%s|%.1f",
        found, x, y, w, h, score, second, reason ? reason : "", elapsed);
}

static wchar_t* ToWidePath(const char* s) {
    if (!s || !*s) return 0;
    int len = MultiByteToWideChar(CP_UTF8, 0, s, -1, 0, 0);
    UINT cp = CP_UTF8;
    if (len <= 0) {
        cp = CP_ACP;
        len = MultiByteToWideChar(cp, 0, s, -1, 0, 0);
    }
    if (len <= 0) return 0;
    wchar_t* out = (wchar_t*)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, len * sizeof(wchar_t));
    if (!out) return 0;
    if (MultiByteToWideChar(cp, 0, s, -1, out, len) <= 0) {
        HeapFree(GetProcessHeap(), 0, out);
        return 0;
    }
    return out;
}

static bool LoadImageFileGray(const char* path, ImageGray* out) {
    out->w = 0;
    out->h = 0;
    out->px = 0;

    wchar_t* wpath = ToWidePath(path);
    if (!wpath) return false;

    HRESULT hr = CoInitializeEx(0, COINIT_MULTITHREADED);
    bool coUninit = SUCCEEDED(hr);
    if (hr == RPC_E_CHANGED_MODE) coUninit = false;

    IWICImagingFactory* factory = 0;
    IWICBitmapDecoder* decoder = 0;
    IWICBitmapFrameDecode* frame = 0;
    IWICFormatConverter* converter = 0;
    BYTE* bgra = 0;
    bool ok = false;
    UINT w = 0;
    UINT h = 0;

    hr = CoCreateInstance(CLSID_WICImagingFactory, 0, CLSCTX_INPROC_SERVER, IID_IWICImagingFactory, (void**)&factory);
    if (FAILED(hr)) goto cleanup;
    hr = factory->CreateDecoderFromFilename(wpath, 0, GENERIC_READ, WICDecodeMetadataCacheOnLoad, &decoder);
    if (FAILED(hr)) goto cleanup;
    hr = decoder->GetFrame(0, &frame);
    if (FAILED(hr)) goto cleanup;
    hr = frame->GetSize(&w, &h);
    if (FAILED(hr) || w == 0 || h == 0 || w > 10000 || h > 10000) goto cleanup;
    hr = factory->CreateFormatConverter(&converter);
    if (FAILED(hr)) goto cleanup;
    hr = converter->Initialize(frame, GUID_WICPixelFormat32bppBGRA, WICBitmapDitherTypeNone, 0, 0.0, WICBitmapPaletteTypeCustom);
    if (FAILED(hr)) goto cleanup;

    bgra = AllocBytes((size_t)w * (size_t)h * 4);
    if (!bgra) goto cleanup;
    hr = converter->CopyPixels(0, w * 4, (UINT)((size_t)w * (size_t)h * 4), bgra);
    if (FAILED(hr)) goto cleanup;

    out->px = AllocBytes((size_t)w * (size_t)h);
    if (!out->px) goto cleanup;
    out->w = (int)w;
    out->h = (int)h;
    for (UINT i = 0; i < w * h; ++i) {
        BYTE b = bgra[i * 4 + 0];
        BYTE g = bgra[i * 4 + 1];
        BYTE r = bgra[i * 4 + 2];
        out->px[i] = (unsigned char)((77 * r + 150 * g + 29 * b) >> 8);
    }
    ok = true;

cleanup:
    if (bgra) HeapFree(GetProcessHeap(), 0, bgra);
    if (converter) converter->Release();
    if (frame) frame->Release();
    if (decoder) decoder->Release();
    if (factory) factory->Release();
    if (coUninit) CoUninitialize();
    HeapFree(GetProcessHeap(), 0, wpath);
    if (!ok) FreeImage(out);
    return ok;
}

static bool CaptureScreenGray(int x1, int y1, int right, int bottom, ImageGray* out) {
    out->w = 0;
    out->h = 0;
    out->px = 0;
    int w = right - x1;
    int h = bottom - y1;
    if (w <= 0 || h <= 0 || w > 30000 || h > 30000) return false;

    HDC screen = GetDC(0);
    if (!screen) return false;
    HDC mem = CreateCompatibleDC(screen);
    if (!mem) {
        ReleaseDC(0, screen);
        return false;
    }

    BITMAPINFO bi;
    ZeroMemory(&bi, sizeof(bi));
    bi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bi.bmiHeader.biWidth = w;
    bi.bmiHeader.biHeight = -h;
    bi.bmiHeader.biPlanes = 1;
    bi.bmiHeader.biBitCount = 32;
    bi.bmiHeader.biCompression = BI_RGB;

    void* bits = 0;
    HBITMAP dib = CreateDIBSection(screen, &bi, DIB_RGB_COLORS, &bits, 0, 0);
    if (!dib || !bits) {
        if (dib) DeleteObject(dib);
        DeleteDC(mem);
        ReleaseDC(0, screen);
        return false;
    }

    HGDIOBJ old = SelectObject(mem, dib);
    BOOL copied = BitBlt(mem, 0, 0, w, h, screen, x1, y1, SRCCOPY | CAPTUREBLT);
    out->px = AllocBytes((size_t)w * (size_t)h);
    if (copied && out->px) {
        BYTE* bgra = (BYTE*)bits;
        for (int i = 0; i < w * h; ++i) {
            BYTE b = bgra[i * 4 + 0];
            BYTE g = bgra[i * 4 + 1];
            BYTE r = bgra[i * 4 + 2];
            out->px[i] = (unsigned char)((77 * r + 150 * g + 29 * b) >> 8);
        }
        out->w = w;
        out->h = h;
    } else {
        FreeImage(out);
    }

    SelectObject(mem, old);
    DeleteObject(dib);
    DeleteDC(mem);
    ReleaseDC(0, screen);
    return copied && out->px;
}

static void InvertImage(ImageGray* img) {
    if (!img || !img->px) return;
    int n = img->w * img->h;
    for (int i = 0; i < n; ++i) img->px[i] = (unsigned char)(255 - img->px[i]);
}

static bool MakeEdgeImage(const ImageGray* src, ImageGray* dst) {
    dst->w = src->w;
    dst->h = src->h;
    dst->px = AllocBytes((size_t)src->w * (size_t)src->h);
    if (!dst->px) return false;
    for (int y = 1; y < src->h - 1; ++y) {
        for (int x = 1; x < src->w - 1; ++x) {
            int i = y * src->w + x;
            int gx = (int)src->px[i + 1] - (int)src->px[i - 1];
            int gy = (int)src->px[i + src->w] - (int)src->px[i - src->w];
            int mag = abs(gx) + abs(gy);
            dst->px[i] = (unsigned char)(mag > 255 ? 255 : mag);
        }
    }
    return true;
}

static void TemplateStats(const ImageGray* tpl, double* mean, double* norm) {
    int n = tpl->w * tpl->h;
    double sum = 0.0;
    for (int i = 0; i < n; ++i) sum += tpl->px[i];
    *mean = sum / (double)n;
    double var = 0.0;
    for (int i = 0; i < n; ++i) {
        double v = (double)tpl->px[i] - *mean;
        var += v * v;
    }
    *norm = sqrt(var);
}

static double ScoreMAD(const ImageGray* screen, const ImageGray* tpl, int sx, int sy) {
    double sum = 0.0;
    for (int y = 0; y < tpl->h; ++y) {
        const unsigned char* sp = screen->px + (sy + y) * screen->w + sx;
        const unsigned char* tp = tpl->px + y * tpl->w;
        for (int x = 0; x < tpl->w; ++x) sum += abs((int)sp[x] - (int)tp[x]);
    }
    return 1.0 - (sum / (double)(tpl->w * tpl->h) / 255.0);
}

static double ScoreNCC(const ImageGray* screen, const ImageGray* tpl, int sx, int sy, double tplMean, double tplNorm) {
    int n = tpl->w * tpl->h;
    double patchSum = 0.0;
    for (int y = 0; y < tpl->h; ++y) {
        const unsigned char* sp = screen->px + (sy + y) * screen->w + sx;
        for (int x = 0; x < tpl->w; ++x) patchSum += sp[x];
    }
    double patchMean = patchSum / (double)n;
    double dot = 0.0;
    double patchVar = 0.0;
    for (int y = 0; y < tpl->h; ++y) {
        const unsigned char* sp = screen->px + (sy + y) * screen->w + sx;
        const unsigned char* tp = tpl->px + y * tpl->w;
        for (int x = 0; x < tpl->w; ++x) {
            double sv = (double)sp[x] - patchMean;
            double tv = (double)tp[x] - tplMean;
            dot += sv * tv;
            patchVar += sv * sv;
        }
    }
    if (patchVar <= 0.000001 || tplNorm <= 0.000001) return -1.0;
    return dot / (sqrt(patchVar) * tplNorm);
}

extern "C" __declspec(dllexport) const char* __stdcall HRM_Version() {
    return "HRMatchDLL|0.1|GDI-WIC|ImageSearch+OCR-placeholder";
}

extern "C" __declspec(dllexport) const char* __stdcall HRM_FindText(
    int, int, int, int, const char*, double, int) {
    return "0|0|0|0|0|0.000000|0.000000|ocr_not_implemented|0.0";
}

extern "C" __declspec(dllexport) const char* __stdcall HRM_ImageSearch(
    int x1, int y1, int right, int bottom, const char* imagePath, int method, double threshold, int flags) {

    double t0 = NowMs();
    ImageGray tpl = {0, 0, 0};
    ImageGray screen = {0, 0, 0};
    ImageGray tplEdge = {0, 0, 0};
    ImageGray screenEdge = {0, 0, 0};

    if (!imagePath || !*imagePath) {
        SetResult(0, 0, 0, 0, 0, 0.0, 0.0, "empty_template_path", NowMs() - t0);
        return g_result;
    }
    if (threshold <= 0.0 || threshold > 1.0) threshold = 0.85;
    if (method < 0 || method > 2) method = 1;

    if (!LoadImageFileGray(imagePath, &tpl)) {
        SetResult(0, 0, 0, 0, 0, 0.0, 0.0, "template_load_failed", NowMs() - t0);
        return g_result;
    }
    if (!CaptureScreenGray(x1, y1, right, bottom, &screen)) {
        FreeImage(&tpl);
        SetResult(0, 0, 0, 0, 0, 0.0, 0.0, "screen_capture_failed", NowMs() - t0);
        return g_result;
    }
    if (tpl.w > screen.w || tpl.h > screen.h) {
        SetResult(0, 0, 0, tpl.w, tpl.h, 0.0, 0.0, "template_larger_than_region", NowMs() - t0);
        FreeImage(&tpl);
        FreeImage(&screen);
        return g_result;
    }

    if (flags & 1) {
        InvertImage(&tpl);
        InvertImage(&screen);
    }

    ImageGray* tplUse = &tpl;
    ImageGray* screenUse = &screen;
    if (method == 2) {
        if (!MakeEdgeImage(&tpl, &tplEdge) || !MakeEdgeImage(&screen, &screenEdge)) {
            SetResult(0, 0, 0, 0, 0, 0.0, 0.0, "edge_preprocess_failed", NowMs() - t0);
            FreeImage(&tpl);
            FreeImage(&screen);
            FreeImage(&tplEdge);
            FreeImage(&screenEdge);
            return g_result;
        }
        tplUse = &tplEdge;
        screenUse = &screenEdge;
    }

    double tplMean = 0.0;
    double tplNorm = 0.0;
    if (method == 1 || method == 2) TemplateStats(tplUse, &tplMean, &tplNorm);

    double best = -2.0;
    double second = -2.0;
    int bestX = 0;
    int bestY = 0;
    int maxY = screenUse->h - tplUse->h;
    int maxX = screenUse->w - tplUse->w;

    for (int y = 0; y <= maxY; ++y) {
        for (int x = 0; x <= maxX; ++x) {
            double s = (method == 0) ? ScoreMAD(screenUse, tplUse, x, y) : ScoreNCC(screenUse, tplUse, x, y, tplMean, tplNorm);
            if (s > best) {
                second = best;
                best = s;
                bestX = x;
                bestY = y;
            } else if (s > second) {
                second = s;
            }
        }
    }

    int found = best >= threshold ? 1 : 0;
    SetResult(found, x1 + bestX, y1 + bestY, tpl.w, tpl.h, best, second, found ? "ok" : "low_score", NowMs() - t0);

    FreeImage(&tpl);
    FreeImage(&screen);
    FreeImage(&tplEdge);
    FreeImage(&screenEdge);
    return g_result;
}

BOOL WINAPI DllMain(HINSTANCE, DWORD, LPVOID) {
    return TRUE;
}
