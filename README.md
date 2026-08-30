# RecoverAI 🚀
<img width="1610" height="1639" alt="Screenshot_30-8-2026_154852_localhost" src="https://github.com/user-attachments/assets/0df1c659-a0c1-4d69-9e47-26cd1595a95a" />



> *"An autonomous AI agent that detects, diagnoses, and recovers merchant revenue lost through failed payments, checkout abandonment, and payment degradation."*

---


## 📌 Executive Summary & Problem Statement

Merchants lose billions annually not merely because payments fail, but because failed payments are not intelligently recovered. Traditional automated retries are dumb: they blindly retry payments until banks block cards, or send spam email reminders that customers ignore.

**RecoverAI** closes the loop autonomously from **Detection** to **Recovery**.
It dynamically analyzes payment failure events, customer lifetime value, historical success rates, and bank degradation signals to calculate a precise **Recovery Probability Score**, selects an optimal strategy, gates every decision through a **Bounded Policy Safety Engine**, and executes bounded actions via Razorpay APIs or controlled simulations.

```
DETECT → DIAGNOSE → DECIDE → POLICY CHECK → ACT → VERIFY → LOG
```

---

## 🏗️ Architecture Overview

```
 ┌────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
 │ Merchant/Demo  │ ───> │  FastAPI Event Listener │ ───> │ Recovery ML & AI Agent │
 │  Webhooks/Sim  │      │   & Ingestion Pipeline  │      │ (Scikit-Learn/LLM+Rule) │
 └────────────────┘      └─────────────────────────┘      └────────────┬────────────┘
                                                                       │
 ┌────────────────┐      ┌─────────────────────────┐                   │
 │ Merchant UI    │ <─── │ Policy Safety Engine    │ <─────────────────┘
 │ Dashboard/App  │      │ (Max Retry/Limit/Human) │
 └────────────────┘      └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐      ┌─────────────────────────┐
                         │ Bounded Action Execution│ ───> │ Razorpay Test API /     │
                         │ (Retry, Link, Escalation│      │ Simulation Execution    │
                         └────────────┬────────────┘      └─────────────────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │ DB & Immutable Audit Log│
                         └─────────────────────────┘
```

---

## 🔥 Key Features & Capabilities
<img width="1584" height="2099" alt="Screenshot_30-8-2026_154921_localhost" src="https://github.com/user-attachments/assets/59ff69d8-fbe4-4ec2-861b-ba6f89510139" />
<img width="1699" height="753" alt="Screenshot_30-8-2026_154935_localhost" src="https://github.com/user-attachments/assets/a89d9320-4fca-45a8-9195-cc400f9ea34c" />
<img width="1688" height="906" alt="Screenshot_30-8-2026_154953_localhost" src="https://github.com/user-attachments/assets/c878df38-ed79-4772-80d1-ace4fc8e6f32" />
<img width="1693" height="4082" alt="Screenshot_30-8-2026_15504_localhost" src="https://github.com/user-attachments/assets/bf522b3c-718b-4f36-982f-19e84d949c8e" />
<img width="1707" height="1340" alt="Screenshot_30-8-2026_155019_localhost" src="https://github.com/user-attachments/assets/e71c4efe-2cfe-4546-9e8e-e34498b0c563" />
<img width="1703" height="675" alt="Screenshot_30-8-2026_155025_localhost" src="https://github.com/user-attachments/assets/806725ba-08df-4291-8017-42cae3f2742f" />











1. **Autonomous Tool-Calling AI Agent**:
   Executes structured tool reasoning (`get_transaction`, `get_customer_history`, `analyze_failure`, `calculate_recovery_probability`, `check_recovery_policy`, `retry_payment`, `create_payment_link`, `send_recovery_message`, `verify_payment_status`, `escalate_to_human`, `write_audit_log`).

2. **Scikit-Learn ML Recovery Scoring Model**:
   Trained on a 600-sample synthetic dataset (80/20 train/test split) evaluating **Accuracy (88.5%)**, **Precision (89.2%)**, **Recall (87.1%)**, and **F1 Score (88.1%)**.

3. **Strict Bounded Safety Engine**:
   - `MAX_AUTOMATIC_RETRIES = 2`
   - `MAX_AUTOMATIC_RECOVERY_AMOUNT = ₹10,000`
   - `MIN_AI_CONFIDENCE = 70%`
   - Automatic Human Approval Queue for high-value or low-confidence cases.
   - Idempotent duplicate recovery protection.

4. **Dual Mode Architecture**:
   - **Razorpay Test Mode**: Connects directly to official Razorpay APIs (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
   - **Demo Simulation Mode**: Zero-config mode for hackathon judging and instant scenario evaluation.

5. **Deterministic Fallback Guarantee**:
   If the LLM API is offline or returns invalid JSON, the system gracefully falls back to deterministic decision rules without breaking execution.

---

## ⚡ Quick Start & Installation

### Option 1: Zero-Config Local Setup (Recommended)

#### Prerequisites
- Node.js v18+
- Python 3.10+

#### 1. Setup Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
*The backend automatically creates the SQLite database, trains the ML model, and seeds sample merchant transactions on boot at `http://localhost:8000`.*

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` (or Vite port) in your browser.*

---

### Option 2: Docker Compose Setup

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 🧪 Automated Testing

Run the automated test suite covering all 10 scenario cases, policy checks, webhook signature security, and ML predictions:

```bash
cd backend
python -m pytest tests/test_policy_and_recovery.py

