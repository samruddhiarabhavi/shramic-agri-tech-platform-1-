import pandas as pd
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

# Load data
df = pd.read_csv("Crop_recommendation.csv")
X = df.drop("label", axis=1)
y = df["label"]

# Encode labels
le = LabelEncoder()
y_enc = le.fit_transform(y)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)

# Train
model = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

# Evaluate
preds = model.predict(X_test)
print(f"Test Accuracy : {accuracy_score(y_test, preds):.4f}")

cv = cross_val_score(model, X, y_enc, cv=5, scoring="accuracy")
print(f"5-Fold CV     : {cv.mean():.4f} ± {cv.std():.4f}")

print("\n", classification_report(y_test, preds, target_names=le.classes_))

# Save
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)
with open("label_encoder.pkl", "wb") as f:
    pickle.dump(le, f)

print("Saved: model.pkl, label_encoder.pkl")