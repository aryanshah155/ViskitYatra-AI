from fastapi import FastAPI
from pydantic import BaseModel
import random
import math
from typing import List

app = FastAPI(title="ViksitYatra ML API")

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
    Enhanced ML prediction for route characteristics
    """
    hour = int(req.time_of_day.split(":")[0])
    minute = int(req.time_of_day.split(":")[1])

    # Time-based factors
    is_peak = (7 <= hour <= 10) or (16 <= hour <= 20)
    is_night = hour >= 22 or hour <= 5
    is_off_peak = not (is_peak or is_night)

    # Mode-specific predictions
    if req.mode == 'car':
        # Traffic congestion based on time and distance
        base_traffic = 1.8 if is_peak else (1.2 if is_night else 1.0)
        distance_factor = min(req.distance_km / 50, 1)  # Longer routes have more traffic variability
        traffic_multiplier = base_traffic + random.uniform(-0.2, 0.4) + (distance_factor * 0.3)

        safety_score = 7.5 if is_night else (8.2 if is_peak else 8.8)
        comfort_score = 9.0
        carbon_score = 8.5
        reliability_score = 7.5 if is_peak else 8.5

    elif req.mode == 'bike':
        traffic_multiplier = 1.0 + random.uniform(0, 0.3)  # Less traffic impact
        safety_score = 6.5 if is_night else (7.2 if is_peak else 7.8)
        comfort_score = 6.5
        carbon_score = 1.5
        reliability_score = 8.0

    elif req.mode == 'walk':
        traffic_multiplier = 1.0  # No traffic impact
        safety_score = 8.5 if is_night else (9.0 if is_peak else 9.5)
        comfort_score = 7.0
        carbon_score = 0.0
        reliability_score = 9.0

    elif req.mode == 'train':
        # Trains are more reliable but can have delays
        traffic_multiplier = 1.0  # No traffic congestion
        safety_score = 9.5
        comfort_score = 8.5
        carbon_score = 2.0
        reliability_score = 8.5 if is_peak else 9.0

    elif req.mode == 'bus':
        # Buses can be affected by traffic
        traffic_multiplier = 1.3 if is_peak else 1.1
        safety_score = 8.0
        comfort_score = 7.0
        carbon_score = 3.5
        reliability_score = 7.0 if is_peak else 8.0

    else:
        # Default values
        traffic_multiplier = 1.2
        safety_score = 8.0
        comfort_score = 7.0
        carbon_score = 5.0
        reliability_score = 8.0

    # Weekend adjustments
    if req.is_weekend:
        traffic_multiplier *= 0.8  # Less traffic on weekends
        safety_score += 0.5
        reliability_score += 0.5

    # Distance-based adjustments
    if req.distance_km > 30:
        traffic_multiplier *= 1.1  # Longer routes have more variability
        reliability_score -= 0.5

    # Add some randomness to simulate real ML predictions
    traffic_multiplier += random.uniform(-0.1, 0.1)
    safety_score = max(1, min(10, safety_score + random.uniform(-0.5, 0.5)))
    comfort_score = max(1, min(10, comfort_score + random.uniform(-0.5, 0.5)))
    carbon_score = max(0, min(10, carbon_score + random.uniform(-0.2, 0.2)))
    reliability_score = max(1, min(10, reliability_score + random.uniform(-0.5, 0.5)))

    # Estimate delays based on reliability
    base_delay = 10 if is_peak else 5
    estimated_delay = int(base_delay * (11 - reliability_score) / 10)
    estimated_delay += random.randint(0, 5)  # Add some randomness

    return {
        "traffic_multiplier": round(traffic_multiplier, 2),
        "safety_score": round(safety_score, 1),
        "comfort_score": round(comfort_score, 1),
        "carbon_score": round(carbon_score, 1),
        "reliability_score": round(reliability_score, 1),
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
