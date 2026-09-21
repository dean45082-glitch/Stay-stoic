package com.staystoic.app;

import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.WindowInsets;
import java.util.Locale;
import java.util.Set;
import android.speech.tts.Voice;

public class MainActivity extends Activity {
    private WebView webView;
    private TextToSpeech tts;
    private float speechRate = 0.90f;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(Locale.US);
                selectPreferredUsMaleVoice();
                tts.setSpeechRate(speechRate);
            }
        });

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowUniversalAccessFromFileURLs(true);

        webView.addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        webView.setWebViewClient(new WebViewClient());

        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            return insets;
        });

        setContentView(webView);
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    private void selectPreferredUsMaleVoice() {
        try {
            Set<Voice> voices = tts.getVoices();
            if (voices == null || voices.isEmpty()) return;

            Voice usFallback = null;
            Voice maleCandidate = null;
            for (Voice voice : voices) {
                Locale locale = voice.getLocale();
                if (locale == null) continue;
                boolean isUsEnglish = "en".equalsIgnoreCase(locale.getLanguage())
                        && "US".equalsIgnoreCase(locale.getCountry());
                if (!isUsEnglish) continue;

                if (usFallback == null) usFallback = voice;
                String descriptor = (voice.getName() + " " + voice.getFeatures()).toLowerCase(Locale.US);
                if (descriptor.contains("male")) {
                    maleCandidate = voice;
                    break;
                }
            }

            Voice selected = maleCandidate != null ? maleCandidate : usFallback;
            if (selected != null) tts.setVoice(selected);
        } catch (Exception ignored) {
            // Some TTS engines do not expose voice metadata; Locale.US remains the fallback.
        }
    }

    public class TtsBridge {
        @JavascriptInterface
        public void setSpeechRate(float rate) {
            runOnUiThread(() -> {
                speechRate = Math.max(0.6f, Math.min(1.4f, rate));
                if (tts != null) tts.setSpeechRate(speechRate);
            });
        }

        @JavascriptInterface
        public void speak(String text) {
            runOnUiThread(() -> {
                if (tts != null && text != null && !text.trim().isEmpty()) {
                    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "stay_stoic_tts");
                }
            });
        }
    }

    @Override protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
