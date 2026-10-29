package com.daymark.routine;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Fullscreen Lockdown Shield Overlay.
 * Displayed instantly whenever a blocked app, floating window, or split-screen is caught.
 */
public class BlockOverlayActivity extends Activity {
    public static final String EXTRA_BLOCKED_PACKAGE = "extra_blocked_package";

    private TextView timerText;
    private TextView emergencyStatusText;
    private Button emergencyBtn;
    private CountDownTimer countDownTimer;
    private BlockerSessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on, full screen coverage
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.parseColor("#09090D"));
        getWindow().setNavigationBarColor(Color.parseColor("#09090D"));

        sessionManager = BlockerSessionManager.getInstance(this);
        String blockedPkg = getIntent().getStringExtra(EXTRA_BLOCKED_PACKAGE);
        if (blockedPkg == null) blockedPkg = "Distracting Application";

        // Build elegant dark UI programmatically
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#09090D"));
        int pad = dp(24);
        root.setPadding(pad, pad, pad, pad);

        // Shield Icon & Badge
        TextView shieldIcon = new TextView(this);
        shieldIcon.setText("🛡️");
        shieldIcon.setTextSize(54);
        shieldIcon.setGravity(Gravity.CENTER);
        root.addView(shieldIcon);

        // Title
        TextView title = new TextView(this);
        title.setText("DAYMARK FOCUS SHIELD");
        title.setTextSize(22);
        title.setTextColor(Color.parseColor("#FAF8FF"));
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(12), 0, dp(4));
        root.addView(title);

        // Subtitle
        TextView sub = new TextView(this);
        sub.setText("Access to this app is restricted to protect your deep focus commitment.");
        sub.setTextSize(13);
        sub.setTextColor(Color.parseColor("#94A3B8"));
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(dp(16), 0, dp(16), dp(24));
        root.addView(sub);

        // App Blocked Card Box
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.parseColor("#141320"));
        cardBg.setCornerRadius(dp(14));
        cardBg.setStroke(dp(1), Color.parseColor("#2A263D"));
        card.setBackground(cardBg);
        card.setPadding(dp(20), dp(18), dp(20), dp(18));

        TextView pkgLabel = new TextView(this);
        pkgLabel.setText("BLOCKED TARGET");
        pkgLabel.setTextSize(10);
        pkgLabel.setTextColor(Color.parseColor("#F59E0B"));
        pkgLabel.setTypeface(Typeface.DEFAULT_BOLD);
        pkgLabel.setLetterSpacing(0.12f);
        card.addView(pkgLabel);

        TextView pkgNameText = new TextView(this);
        pkgNameText.setText(getAppReadableName(blockedPkg));
        pkgNameText.setTextSize(18);
        pkgNameText.setTextColor(Color.WHITE);
        pkgNameText.setTypeface(Typeface.DEFAULT_BOLD);
        pkgNameText.setPadding(0, dp(4), 0, dp(12));
        card.addView(pkgNameText);

        timerText = new TextView(this);
        timerText.setTextSize(32);
        timerText.setTextColor(Color.parseColor("#38BDF8"));
        timerText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        timerText.setGravity(Gravity.CENTER);
        card.addView(timerText);

        TextView sessionRemainingLabel = new TextView(this);
        sessionRemainingLabel.setText("SESSION TIME REMAINING");
        sessionRemainingLabel.setTextSize(10);
        sessionRemainingLabel.setTextColor(Color.parseColor("#64748B"));
        sessionRemainingLabel.setLetterSpacing(0.1f);
        card.addView(sessionRemainingLabel);

        root.addView(card);

        // Emergency Pass Section
        LinearLayout emergencyBox = new LinearLayout(this);
        emergencyBox.setOrientation(LinearLayout.VERTICAL);
        emergencyBox.setGravity(Gravity.CENTER);
        emergencyBox.setPadding(0, dp(24), 0, dp(20));

        emergencyStatusText = new TextView(this);
        emergencyStatusText.setTextSize(11);
        emergencyStatusText.setTextColor(Color.parseColor("#CBD5E1"));
        emergencyStatusText.setGravity(Gravity.CENTER);
        emergencyStatusText.setPadding(0, 0, 0, dp(8));
        emergencyBox.addView(emergencyStatusText);

        emergencyBtn = new Button(this);
        GradientDrawable emBg = new GradientDrawable();
        emBg.setColor(Color.parseColor("#1E1B4B"));
        emBg.setCornerRadius(dp(8));
        emBg.setStroke(dp(1), Color.parseColor("#6366F1"));
        emergencyBtn.setBackground(emBg);
        emergencyBtn.setTextColor(Color.parseColor("#E0E7FF"));
        emergencyBtn.setText("⚡ Use 1x Emergency Pass (5 Min)");
        emergencyBtn.setTextSize(13);
        emergencyBtn.setTypeface(Typeface.DEFAULT_BOLD);
        emergencyBtn.setPadding(dp(16), dp(10), dp(16), dp(10));

        emergencyBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                boolean ok = sessionManager.useEmergencyPass();
                if (ok) {
                    Toast.makeText(BlockOverlayActivity.this, "⏱️ 5-Minute Emergency Pass Activated! Make it quick.", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    Toast.makeText(BlockOverlayActivity.this, "❌ Emergency pass is no longer available for this session.", Toast.LENGTH_SHORT).show();
                    updateEmergencyUI();
                }
            }
        });
        emergencyBox.addView(emergencyBtn);
        root.addView(emergencyBox);

        // Return Home Button
        Button homeBtn = new Button(this);
        GradientDrawable homeBg = new GradientDrawable();
        homeBg.setColor(Color.parseColor("#F59E0B"));
        homeBg.setCornerRadius(dp(8));
        homeBtn.setBackground(homeBg);
        homeBtn.setTextColor(Color.parseColor("#09090D"));
        homeBtn.setText("Return to Home Screen");
        homeBtn.setTextSize(14);
        homeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        homeBtn.setPadding(dp(24), dp(12), dp(24), dp(12));

        homeBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                goToHomeScreen();
            }
        });
        root.addView(homeBtn);

        setContentView(root);
        updateEmergencyUI();
        startTimer();
    }

    private void updateEmergencyUI() {
        if (sessionManager.isEmergencyPassAvailable()) {
            emergencyStatusText.setText("Need this app right now? You have 1 emergency pass available.");
            emergencyBtn.setVisibility(View.VISIBLE);
        } else {
            emergencyStatusText.setText("🔒 1x Emergency Pass has already been used for this session.");
            emergencyStatusText.setTextColor(Color.parseColor("#EF4444"));
            emergencyBtn.setVisibility(View.GONE);
        }
    }

    private void startTimer() {
        countDownTimer = new CountDownTimer(sessionManager.getRemainingSessionSeconds() * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                long sec = millisUntilFinished / 1000L;
                long h = sec / 3600;
                long m = (sec % 3600) / 60;
                long s = sec % 60;
                if (h > 0) {
                    timerText.setText(String.format("%02d:%02d:%02d", h, m, s));
                } else {
                    timerText.setText(String.format("%02d:%02d", m, s));
                }
            }

            @Override
            public void onFinish() {
                timerText.setText("00:00");
                Toast.makeText(BlockOverlayActivity.this, "🎉 Focus session complete! Apps unlocked.", Toast.LENGTH_LONG).show();
                finish();
            }
        }.start();
    }

    private void goToHomeScreen() {
        Intent startMain = new Intent(Intent.ACTION_MAIN);
        startMain.addCategory(Intent.CATEGORY_HOME);
        startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(startMain);
        finish();
    }

    @Override
    public void onBackPressed() {
        // Intercept back button and take directly to home screen
        goToHomeScreen();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }
    }

    private String getAppReadableName(String packageName) {
        if ("com.google.android.youtube".equals(packageName)) return "YouTube";
        if ("com.instagram.android".equals(packageName)) return "Instagram";
        if ("com.reddit.frontpage".equals(packageName)) return "Reddit";
        if ("com.twitter.android".equals(packageName)) return "X / Twitter";
        if ("com.facebook.katana".equals(packageName)) return "Facebook";
        if ("com.snapchat.android".equals(packageName)) return "Snapchat";
        if ("com.zhiliaoapp.musically".equals(packageName)) return "TikTok";
        if ("com.android.chrome".equals(packageName)) return "Google Chrome";
        try {
            CharSequence name = getPackageManager().getApplicationLabel(
                getPackageManager().getApplicationInfo(packageName, 0)
            );
            return name.toString();
        } catch (Exception e) {
            return packageName;
        }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }
}
