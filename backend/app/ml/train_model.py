import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from app.ml.generate_dataset import generate_synthetic_dataset

def train_and_evaluate_model():
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "synthetic_transactions.csv")
    
    if not os.path.exists(data_path):
        df = generate_synthetic_dataset(num_samples=600, output_path=data_path)
    else:
        df = pd.read_csv(data_path)

    # Feature definitions
    num_features = [
        "amount", 
        "retry_count", 
        "customer_previous_successes", 
        "customer_previous_failures", 
        "customer_lifetime_value", 
        "checkout_duration", 
        "checkout_abandoned"
    ]
    cat_features = ["payment_method", "failure_reason"]
    
    X = df[num_features + cat_features]
    y = df["recovered"]

    # 80/20 Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Preprocessor pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", num_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_features)
        ]
    )

    # Full Model Pipeline
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42))
        ]
    )

    # Fit pipeline
    pipeline.fit(X_train, y_train)

    # Predict on held-out test set
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    # Metrics calculation
    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))

    # Feature importances extraction
    ohe_cols = pipeline.named_steps["preprocessor"].named_transformers_["cat"].get_feature_names_out(cat_features)
    all_feature_names = num_features + list(ohe_cols)
    importances = pipeline.named_steps["classifier"].feature_importances_
    
    feature_importance_dict = {
        name: round(float(imp), 4) for name, imp in zip(all_feature_names, importances)
    }

    metrics = {
        "model_name": "RandomForestRecoveryScorer_v1.0",
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "total_samples": len(df),
        "test_samples": len(X_test),
        "feature_importance": feature_importance_dict
    }

    # Save artifacts
    model_path = os.path.join(current_dir, "recovery_model.joblib")
    metrics_path = os.path.join(current_dir, "metrics.json")
    
    joblib.dump(pipeline, model_path)
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Model successfully trained & saved to {model_path}")
    print(f"Metrics: Accuracy={accuracy:.2%}, Precision={precision:.2%}, Recall={recall:.2%}, F1={f1:.2%}")
    
    return pipeline, metrics

if __name__ == "__main__":
    train_and_evaluate_model()
