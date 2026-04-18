from fastapi import FastAPI
from pydantic import BaseModel
import random
import math
from typing import List
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

app = FastAPI(title="ViksitYatra ML API")

# Initialize and train ML Models on Startup
df_size = 5000
np.random.seed(42)

# Generate synthetic dataset for training
modes = ['car', 'bike', 'walk', 'train', 'bus']
hours = np.random.randint(0, 24, df_size)
distances = np.random.uniform(0.5, 50.0, df_size)
is_weekends = np.random.choice([0, 1], df_size, p=[0.7, 0.3])
mode_choices = np.random.choice(modes, df_size)

traffic_mults = []
safety_scores = []

for h, d, w, m in zip(hours, distances, is_weekends, mode_choices):
    is_peak = (7 <= h <= 10) or (16 <= h <= 20)
    is_night = (h >= 22 or h <= 5)
    
    # Calculate target variables with realistic correlations
    tm = 1.0
    ss = 8.0
    
    if m == 'car':
        tm = 1.8 if is_peak else (1.2 if is_night else 1.0)
        tm += (d / 50) * 0.3
        ss = 7.5 if is_night else (8.2 if is_peak else 8.8)
    elif m == 'bike':
        tm = 1.1 + (0.2 if is_peak else 0.0)
        ss = 6.5 if is_night else (7.2 if is_peak else 7.8)
    elif m == 'walk':
        tm = 1.0
        ss = 8.5 if is_night else (9.0 if is_peak else 9.5)
    elif m == 'train':
        tm = 1.0
        ss = 9.5
    elif m == 'bus':
        tm = 1.3 if is_peak else 1.1
        ss = 8.0
        
    if w:
        tm *= 0.8
        ss += 0.5
        
    # Add natural variance
    traffic_mults.append(tm + np.random.normal(0, 0.1))
    safety_scores.append(max(1.0, min(10.0, ss + np.random.normal(0, 0.5))))

# Create dataframe
df = pd.DataFrame({
    'hour': hours,
    'distance': distances,
    'is_weekend': is_weekends,
    'mode': mode_choices,
    'traffic_multiplier': traffic_mults,
    'safety_score': safety_scores
})

# Encode mode
le_mode = LabelEncoder()
df['mode_encoded'] = le_mode.fit_transform(df['mode'])

# Train Models
X = df[['hour', 'distance', 'is_weekend', 'mode_encoded']]
y_traffic = df['traffic_multiplier']
y_safety = df['safety_score']

model_traffic = RandomForestRegressor(n_estimators=50, random_state=42)
model_traffic.fit(X, y_traffic)

model_safety = RandomForestRegressor(n_estimators=50, random_state=42)
model_safety.fit(X, y_safety)


class PathRequest(BaseModel):
    nodes: List[str]
    time_of_day: str # e.g., "HH:MM"

class RoutePrediction(BaseModel):
    traffic_multiplier: float
    safety_score: float

class EnhancedRouteRequest(BaseModel):
    source: str
    destination: str
    mode: str  # car, bike, walk, bus, train
    distance_km: float
    time_of_day: str
    is_weekend: bool = False

class EnhancedPrediction(BaseModel):
    traffic_multiplier: float
    safety_score: float
    comfort_score: float
    carbon_score: float
    reliability_score: float
    estimated_delay_minutes: int

class EVRequest(BaseModel):
    vehicle_id: str
    current_charge_percent: float

@app.get("/")
def read_root():
    return {"message": "ViksitYatra ML API is running"}

@app.post("/predict-traffic", response_model=RoutePrediction)
def predict_traffic(req: PathRequest):
    # Legacy endpoint for backward compatibility
    hour = int(req.time_of_day.split(":")[0])

    is_peak = (8 <= hour <= 10) or (17 <= hour <= 20)
    base_mult = 1.5 if is_peak else 1.0

    traffic_mult = base_mult + random.uniform(0.0, 0.4)
    safety_score = 9.0 if not (22 <= hour or hour <= 4) else random.uniform(4.0, 7.0)

    return {"traffic_multiplier": traffic_mult, "safety_score": safety_score}

@app.post("/predict-route", response_model=EnhancedPrediction)
def predict_route(req: EnhancedRouteRequest):
    """
    Enhanced ML prediction using trained Random Forest Models
    """
    hour = int(req.time_of_day.split(":")[0])
    
    # Feature encoding
    try:
        mode_encoded = le_mode.transform([req.mode.lower()])[0]
    except ValueError:
        mode_encoded = le_mode.transform(['car'])[0] # fallback
        
    X_pred = pd.DataFrame({
        'hour': [hour],
        'distance': [req.distance_km],
        'is_weekend': [1 if req.is_weekend else 0],
        'mode_encoded': [mode_encoded]
    })
    
    # Predict using models
    pred_traffic = model_traffic.predict(X_pred)[0]
    pred_safety = model_safety.predict(X_pred)[0]
    
    # Static calculations for secondary scores based on model outputs & inputs
    is_peak = (7 <= hour <= 10) or (16 <= hour <= 20)
    
    comfort_score = 7.0
    carbon_score = 5.0
    reliability_score = 8.0
    
    if req.mode == 'car':
        comfort_score, carbon_score, reliability_score = 9.0, 8.5, (7.5 if is_peak else 8.5)
    elif req.mode == 'bike':
        comfort_score, carbon_score, reliability_score = 6.5, 1.5, 8.0
    elif req.mode == 'walk':
        comfort_score, carbon_score, reliability_score = 7.0, 0.0, 9.0
    elif req.mode == 'train':
        comfort_score, carbon_score, reliability_score = 8.5, 2.0, (8.5 if is_peak else 9.0)
    elif req.mode == 'bus':
        comfort_score, carbon_score, reliability_score = 7.0, 3.5, (7.0 if is_peak else 8.0)

    # Estimate delays
    base_delay = 10 if is_peak else 5
    estimated_delay = int(base_delay * (11 - reliability_score) / 10) + np.random.randint(0, 5)

    return {
        "traffic_multiplier": round(float(pred_traffic), 2),
        "safety_score": round(float(pred_safety), 1),
        "comfort_score": comfort_score,
        "carbon_score": carbon_score,
        "reliability_score": reliability_score,
        "estimated_delay_minutes": estimated_delay
    }

@app.post("/predict-occupancy")
def predict_occupancy(bus_route: str, time_of_day: str):
    hour = int(time_of_day.split(":")[0])
    is_peak = (8 <= hour <= 10) or (17 <= hour <= 20)

    occupancy = random.uniform(80, 100) if is_peak else random.uniform(20, 60)
    return {"bus_route": bus_route, "estimated_occupancy_percent": round(occupancy, 1)}

@app.post("/predict-ev-range")
def predict_ev_range(req: EVRequest):
    # Simulated distance range left in km based on charge
    # EV max range ~250km
    max_range = 250
    estimated_range = (req.current_charge_percent / 100.0) * max_range
    # Real-world adjustment factor (AC, load, traffic) could reduce this
    adjusted_range = estimated_range * 0.85
    return {"current_charge": req.current_charge_percent, "estimated_range_km": round(adjusted_range, 1)}
