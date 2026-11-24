package app.murmur.voicenotes;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Make the app's pages "cross-origin isolated". That unlocks SharedArrayBuffer,
        // which lets Whisper run on several CPU cores (about 2-3x faster transcription).
        // All content is served locally from the APK, so these headers restrict nothing.
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = super.shouldInterceptRequest(view, request);
                if (response != null) {
                    Map<String, String> headers = response.getResponseHeaders() == null
                        ? new HashMap<>()
                        : new HashMap<>(response.getResponseHeaders());
                    headers.put("Cross-Origin-Opener-Policy", "same-origin");
                    headers.put("Cross-Origin-Embedder-Policy", "require-corp");
                    response.setResponseHeaders(headers);
                }
                return response;
            }
        });
    }
}
