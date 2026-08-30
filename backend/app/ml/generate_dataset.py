import os
import random
import pandas as pd
import numpy as np

def generate_synthetic_dataset(num_samples=600, output_path=None):
    """
    Generates a realistic synthetic transaction dataset for Razorpay AI Buildathon.
    Fields match Requirement #11 of the specification.
    """
    random.seed(42)
    np.random.seed(42)

    payment_methods = ["upi", "card", "netbanking", "wallet"]
    failure_reasons = [
        "bank_network_error", 
        "insufficient_funds", 
        "auth_failed", 
        "checkout_abandoned", 
        "user_cancelled"
    ]

    first_names = ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Rahul", "Sneha", "Karan", "Pooja", "Aman", "Divya", "Siddharth", "Ishita", "Aditya"]
    last_names = ["Sharma", "Verma", "Patel", "Gupta", "Rao", "Nair", "Singh", "Reddy", "Mehta", "Joshi", "Kulkarni", "Das", "Chopra", "Bhat"]

    data = []
    
    for i in range(1, num_samples + 1):
        txn_id = f"TXN_{1000 + i}"
        cust_id = f"CUST_{(i % 120) + 1}"
        cust_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        cust_email = f"{cust_name.lower().replace(' ', '.')}@example.com"
        
        amount = round(random.choice([
            random.randint(199, 999),
            random.randint(1499, 4999),
            random.randint(5000, 14999),
            random.randint(15000, 49999)
        ]), 2)
        
        currency = "INR"
        payment_method = random.choice(payment_methods)
        failure_reason = random.choice(failure_reasons)
        retry_count = random.choice([0, 0, 0, 1, 1, 2, 3])
        
        previous_successes = random.randint(0, 15)
        previous_failures = random.randint(0, 4)
        ltv = round(previous_successes * random.uniform(1500, 4500), 2)
        
        checkout_duration = random.randint(10, 300)
        checkout_abandoned = 1 if failure_reason == "checkout_abandoned" else 0
        
        # Calculate realistic ground truth recovery likelihood:
        # High previous successes, low retry count, bank network error -> high recovery probability
        # High amount, insufficient funds, user cancelled -> low recovery probability
        score = 0.5
        score += (previous_successes * 0.04)
        score -= (previous_failures * 0.05)
        score -= (retry_count * 0.12)
        
        if failure_reason == "bank_network_error":
            score += 0.25
        elif failure_reason == "checkout_abandoned":
            score += 0.15
        elif failure_reason == "insufficient_funds":
            score -= 0.30
        elif failure_reason == "user_cancelled":
            score -= 0.35
            
        if amount > 15000:
            score -= 0.15
            
        score = max(0.05, min(0.95, score))
        
        recovered = 1 if random.random() < score else 0
        recovered_amount = amount if recovered == 1 else 0.0
        
        if failure_reason == "bank_network_error":
            action = "retry_payment"
        elif failure_reason == "checkout_abandoned":
            action = "create_payment_link"
        elif amount > 10000 or retry_count >= 2:
            action = "escalate_to_human"
        else:
            action = "create_payment_link"

        row = {
            "transaction_id": txn_id,
            "customer_id": cust_id,
            "customer_name": cust_name,
            "customer_email": cust_email,
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
            "failure_reason": failure_reason,
            "retry_count": retry_count,
            "customer_previous_successes": previous_successes,
            "customer_previous_failures": previous_failures,
            "customer_lifetime_value": ltv,
            "checkout_duration": checkout_duration,
            "checkout_abandoned": checkout_abandoned,
            "recovery_attempted": 1,
            "recovery_action": action,
            "recovery_probability": round(score, 4),
            "recovered": recovered,
            "recovered_amount": recovered_amount
        }
        data.append(row)

    df = pd.DataFrame(data)
    
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Generated {num_samples} synthetic transaction samples at {output_path}")

    return df

if __name__ == "__main__":
    csv_file = os.path.join(os.path.dirname(__file__), "synthetic_transactions.csv")
    generate_synthetic_dataset(600, csv_file)
