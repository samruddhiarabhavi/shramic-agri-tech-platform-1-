import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score

# ── 1. Load ────────────────────────────────────────────────────────────────────
yield_df   = pd.read_csv(r"C:\Users\HP\Downloads\shramic\soil\crop_yield.csv")
soil_df    = pd.read_csv(r"C:\Users\HP\Downloads\shramic\soil\state_soil_data.csv")
weather_df = pd.read_csv(r"C:\Users\HP\Downloads\shramic\soil\state_weather_data_1997_2020.csv")

# ── 2. Clean ───────────────────────────────────────────────────────────────────
yield_df["season"] = yield_df["season"].str.strip()
yield_df["state"]  = yield_df["state"].str.strip()
soil_df["state"]   = soil_df["state"].str.strip()
weather_df["state"] = weather_df["state"].str.strip()

# ── 3. Merge ───────────────────────────────────────────────────────────────────
df = yield_df.merge(soil_df,    on="state",            how="left")
df = df.merge(weather_df,       on=["state", "year"],  how="left")

print(f"Merged shape: {df.shape}")
print(f"Null counts after merge:\n{df.isnull().sum()}\n")

# Fill any unmatched soil/weather rows with column medians
for col in ["N", "P", "K", "pH", "avg_temp_c", "total_rainfall_mm", "avg_humidity_percent"]:
    df[col] = df[col].fillna(df[col].median())

# ── 4. Encode categoricals ─────────────────────────────────────────────────────
le_crop   = LabelEncoder()
le_season = LabelEncoder()
le_state  = LabelEncoder()

df["crop_enc"]   = le_crop.fit_transform(df["crop"])
df["season_enc"] = le_season.fit_transform(df["season"])
df["state_enc"]  = le_state.fit_transform(df["state"])

# ── 5. Features & target ───────────────────────────────────────────────────────
FEATURES = [
    "crop_enc", "season_enc", "state_enc",
    "year", "area", "fertilizer", "pesticide",
    "N", "P", "K", "pH",
    "avg_temp_c", "total_rainfall_mm", "avg_humidity_percent",
]
TARGET = "yield"

X = df[FEATURES]
y = df[TARGET]

# ── 6. Split ───────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── 7. Train ───────────────────────────────────────────────────────────────────
model = GradientBoostingRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    random_state=42,
)
model.fit(X_train, y_train)

# ── 8. Evaluate ────────────────────────────────────────────────────────────────
preds = model.predict(X_test)
mae   = mean_absolute_error(y_test, preds)
r2    = r2_score(y_test, preds)

cv_r2 = cross_val_score(model, X, y, cv=5, scoring="r2")
print(f"Test MAE      : {mae:.4f}")
print(f"Test R²       : {r2:.4f}")
print(f"5-Fold CV R²  : {cv_r2.mean():.4f} ± {cv_r2.std():.4f}")

# Feature importances
importances = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
print(f"\nTop features:\n{importances.head(8)}")

# ── 9. Save ────────────────────────────────────────────────────────────────────
with open("yield_model.pkl", "wb") as f:
    pickle.dump(model, f)
with open("yield_encoders.pkl", "wb") as f:
    pickle.dump({"crop": le_crop, "season": le_season, "state": le_state}, f)

print("\nSaved: yield_model.pkl, yield_encoders.pkl")