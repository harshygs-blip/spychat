package com.spychat.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.ContactsContract;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Enforce Android FLAG_SECURE: Blocks screenshots, screen recorders (blank black screen), and recent apps switcher leaks
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        super.onCreate(savedInstanceState);
        requestCallingPermissions();
    }

    private void requestCallingPermissions() {
        String[] requiredPermissions = new String[]{
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.MODIFY_AUDIO_SETTINGS,
            Manifest.permission.READ_CONTACTS
        };

        List<String> permissionsToRequest = new ArrayList<>();
        for (String perm : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(perm);
            }
        }

        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toArray(new String[0]),
                PERMISSION_REQUEST_CODE
            );
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            
            // Enable unblocked WebRTC audio & video autoplay and Geolocation on Android
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setAllowFileAccess(true);
            settings.setDomStorageEnabled(true);

            // Register bridge to allow screenshare bypass of black screen (FLAG_SECURE)
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void setSecure(boolean secure) {
                    runOnUiThread(() -> {
                        if (secure) {
                            getWindow().setFlags(
                                WindowManager.LayoutParams.FLAG_SECURE,
                                WindowManager.LayoutParams.FLAG_SECURE
                            );
                        } else {
                            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                        }
                    });
                }
            }, "AndroidSecureScreen");

            // Register bridge for user-consented Contact Backup & Cloud Sync
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public boolean hasContactPermission() {
                    return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
                }

                @android.webkit.JavascriptInterface
                public void requestContactsPermission() {
                    runOnUiThread(() -> {
                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.READ_CONTACTS},
                            PERMISSION_REQUEST_CODE
                        );
                    });
                }

                @android.webkit.JavascriptInterface
                public String getContactsJson() {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                        return "[]";
                    }

                    JSONArray contactsArray = new JSONArray();
                    ContentResolver cr = getContentResolver();
                    Cursor cursor = null;
                    try {
                        String[] projection = new String[]{
                            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                            ContactsContract.CommonDataKinds.Phone.NUMBER
                        };

                        cursor = cr.query(
                            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                            projection,
                            null, null,
                            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
                        );

                        if (cursor != null && cursor.moveToFirst()) {
                            int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                            int numIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);

                            while (!cursor.isAfterLast()) {
                                String name = nameIdx != -1 ? cursor.getString(nameIdx) : "";
                                String number = numIdx != -1 ? cursor.getString(numIdx) : "";

                                if (number != null && !number.trim().isEmpty()) {
                                    String cleanNum = number.replaceAll("[^0-9+]", "");
                                    if (cleanNum.length() >= 5) {
                                        JSONObject obj = new JSONObject();
                                        obj.put("name", (name != null && !name.trim().isEmpty()) ? name.trim() : "Contact");
                                        obj.put("phoneNumber", cleanNum);
                                        contactsArray.put(obj);
                                    }
                                }
                                cursor.moveToNext();
                            }
                        }
                        android.util.Log.d("SPYCHAT_CONTACTS", "Fetched contacts count: " + contactsArray.length());
                    } catch (Exception e) {
                        android.util.Log.e("SPYCHAT_CONTACTS", "Error fetching contacts", e);
                    } finally {
                        if (cursor != null) {
                            cursor.close();
                        }
                    }

                    return contactsArray.toString();
                }
            }, "AndroidContactsBridge");

            // Register bridge for Hardware Audio Routing (Loudspeaker, Earpiece, Bluetooth)
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void setAudioMode(String mode) {
                    runOnUiThread(() -> {
                        try {
                            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                            if (audioManager == null) return;

                            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);

                            if ("speaker".equalsIgnoreCase(mode)) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    audioManager.clearCommunicationDevice();
                                    AudioDeviceInfo[] devices = audioManager.getAvailableCommunicationDevices().toArray(new AudioDeviceInfo[0]);
                                    for (AudioDeviceInfo d : devices) {
                                        if (d.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                                            audioManager.setCommunicationDevice(d);
                                            break;
                                        }
                                    }
                                }
                                audioManager.setSpeakerphoneOn(true);
                                android.util.Log.d("SPYCHAT_AUDIO", "Switched to Speaker (Loudspeaker)");
                            } else if ("earpiece".equalsIgnoreCase(mode)) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    audioManager.clearCommunicationDevice();
                                    AudioDeviceInfo[] devices = audioManager.getAvailableCommunicationDevices().toArray(new AudioDeviceInfo[0]);
                                    for (AudioDeviceInfo d : devices) {
                                        if (d.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                                            audioManager.setCommunicationDevice(d);
                                            break;
                                        }
                                    }
                                }
                                audioManager.setSpeakerphoneOn(false);
                                android.util.Log.d("SPYCHAT_AUDIO", "Switched to Earpiece");
                            } else if ("bluetooth".equalsIgnoreCase(mode)) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    audioManager.clearCommunicationDevice();
                                    AudioDeviceInfo[] devices = audioManager.getAvailableCommunicationDevices().toArray(new AudioDeviceInfo[0]);
                                    for (AudioDeviceInfo d : devices) {
                                        if (d.getType() == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || d.getType() == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP) {
                                            audioManager.setCommunicationDevice(d);
                                            break;
                                        }
                                    }
                                }
                                audioManager.setSpeakerphoneOn(false);
                                audioManager.startBluetoothSco();
                                audioManager.setBluetoothScoOn(true);
                                android.util.Log.d("SPYCHAT_AUDIO", "Switched to Bluetooth");
                            } else {
                                // Reset to normal
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    audioManager.clearCommunicationDevice();
                                }
                                audioManager.setSpeakerphoneOn(true);
                            }
                        } catch (Exception e) {
                            android.util.Log.e("SPYCHAT_AUDIO", "Failed to switch audio mode", e);
                        }
                    });
                }
            }, "AndroidAudioBridge");
        }
    }
}
