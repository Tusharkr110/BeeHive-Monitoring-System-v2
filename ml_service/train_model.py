"""
train_model.py
==============
Offline training script — mirrors the notebook exactly.

Usage:
    python train_model.py --data_dir ./beetogether_data --samples 5000

Outputs:
    models/hive_health_model.pkl
    models/hive_acoustic_scaler.pkl
"""

import os
import glob
import argparse
import numpy as np
import pandas as pd
import librosa
import joblib
from tqdm import tqdm
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report
from imblearn.over_sampling import SMOTE


# ── Label extractor ───────────────────────────────────────────────────────────
def extract_label(filename: str) -> str:
    fn = filename.lower()
    if "no_queen" in fn or "queenless" in fn or "no_queenbee" in fn:
        return "stressed_queenless"
    elif "active" in fn or "normal" in fn or "external_noise" in fn:
        return "normal"
    elif fn.startswith("0_") or "queenbee" in fn:
        return "normal"
    elif fn.startswith("1_"):
        return "stressed_anomaly"
    return "unknown"


# ── 54-dim feature extractor (same as notebook) ───────────────────────────────
def extract_features(file_path: str) -> np.ndarray | None:
    try:
        y, sr = librosa.load(file_path, sr=22050, duration=10)

        mfccs           = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
        mfccs_mean      = np.mean(mfccs.T, axis=0)          # 20
        mfccs_std       = np.std(mfccs.T, axis=0)           # 20

        spec_centroids  = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        centroid_mean   = np.mean(spec_centroids)            # 1
        centroid_std    = np.std(spec_centroids)             # 1

        chroma          = librosa.feature.chroma_stft(y=y, sr=sr)
        chroma_mean     = np.mean(chroma.T, axis=0)          # 12

        return np.hstack([mfccs_mean, mfccs_std, centroid_mean, centroid_std, chroma_mean])
    except Exception:
        return None


def main(data_dir: str, sample_size: int):
    os.makedirs("models", exist_ok=True)

    # ── 1. Discover audio files ───────────────────────────────────────────────
    print("Scanning dataset directory...")
    audio_exts  = (".wav", ".mp3", ".ogg", ".flac")
    all_files   = [f for f in glob.glob(f"{data_dir}/**/*", recursive=True)
                   if f.lower().endswith(audio_exts)]
    print(f"Found {len(all_files):,} audio files.")

    df = pd.DataFrame({
        "file_path"    : all_files,
        "filename"     : [os.path.basename(f) for f in all_files],
    })
    df["label"] = df["filename"].apply(extract_label)
    df          = df[df["label"] != "unknown"].reset_index(drop=True)

    # balanced sample
    df_balanced = (df.groupby("label", group_keys=False)
                     .apply(lambda g: g.sample(min(len(g), sample_size // 3), random_state=42))
                     .reset_index(drop=True))

    print("Label distribution after balancing:")
    print(df_balanced["label"].value_counts())

    # ── 2. Feature extraction ─────────────────────────────────────────────────
    X_list, y_list = [], []
    print("\nExtracting 54-dim features (MFCC + spectral centroid + chroma)...")
    for _, row in tqdm(df_balanced.iterrows(), total=len(df_balanced)):
        feat = extract_features(row["file_path"])
        if feat is not None:
            X_list.append(feat)
            y_list.append(row["label"])

    X = np.array(X_list)
    y = np.array(y_list)
    print(f"Feature matrix: {X.shape}")

    # ── 3. Train / test split + scaling ───────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)

    scaler      = StandardScaler()
    X_train_sc  = scaler.fit_transform(X_train)
    X_test_sc   = scaler.transform(X_test)

    # ── 4. SMOTE oversampling for minority class ───────────────────────────────
    sm          = SMOTE(random_state=42)
    X_res, y_res = sm.fit_resample(X_train_sc, y_train)

    # ── 5. Ensemble model (matches notebook final model) ──────────────────────
    rf  = RandomForestClassifier(n_estimators=200, max_depth=15,
                                  class_weight="balanced", random_state=42, n_jobs=-1)
    gb  = GradientBoostingClassifier(n_estimators=150, learning_rate=0.05,
                                      max_depth=5, random_state=42)
    model_final = VotingClassifier(
        estimators=[("rf", rf), ("gb", gb)], voting="soft")

    print("\nTraining ensemble model...")
    model_final.fit(X_res, y_res)

    # ── 6. Evaluate ───────────────────────────────────────────────────────────
    y_pred = model_final.predict(X_test_sc)
    print("\nClassification Report:\n")
    print(classification_report(y_test, y_pred))

    # ── 7. Save ───────────────────────────────────────────────────────────────
    joblib.dump(model_final, "models/hive_health_model.pkl")
    joblib.dump(scaler,      "models/hive_acoustic_scaler.pkl")
    print("\n✅  Saved  models/hive_health_model.pkl")
    print("✅  Saved  models/hive_acoustic_scaler.pkl")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="./beetogether_data")
    parser.add_argument("--samples",  type=int, default=5000)
    args = parser.parse_args()
    main(args.data_dir, args.samples)
