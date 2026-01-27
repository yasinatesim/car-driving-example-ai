
<h3 align="center">
  <br />
  <a href="https://github.com/yasinatesim/car-driving-example-ai"><img width="300" src="https://img.shields.io/badge/🚗-white?style=for-the-badge&labelColor=0a0a1a" alt="Car Driving AI" /></a>
  <br />
  <br />
  Car Driving AI
  <br />
</h3>

<hr />

<p align="center">
  A browser-based Three.js autonomous car driving simulation with a <strong>HYBRID AI system</strong> combining <strong>Fuzzy Logic</strong> and <strong>Reinforcement Learning (PPO)</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Style-Cyberpunk-00f0ff?style=flat-square&labelColor=0a0a1a" alt="Cyberpunk Style" />
  <img src="https://img.shields.io/badge/3D-Three.js-black?style=flat-square" alt="Three.js" />
  <img src="https://img.shields.io/badge/RL-PPO-ff00aa?style=flat-square&labelColor=0a0a1a" alt="PPO" />
  <img src="https://img.shields.io/badge/Inference-ONNX-blue?style=flat-square" alt="ONNX" />
</p>

<p align="center">
  · <a href="https://car-driving-example-ai.yasinates.com/">View Demo</a> ·
</p>

<br />

## 📖 About

This project is a fully autonomous driving simulation where an AI agent learns to navigate through traffic using a hybrid approach. The system combines **Fuzzy Logic** for intelligent risk assessment with **Reinforcement Learning (PPO)** for optimal decision making.

> **Note**: The car is fully autonomous - no manual steering required!

### 💡 Idea

What if we could combine the interpretability of fuzzy logic with the adaptive power of deep reinforcement learning? This simulation demonstrates a hybrid AI system that:

- Uses **fuzzy membership functions** to assess lane risks in a human-interpretable way
- Leverages **PPO (Proximal Policy Optimization)** to learn optimal lane-changing strategies
- Runs inference in the browser at **60 FPS** using ONNX

### 🏗️ Architecture

<pre>
┌─────────────────────────────────────────┐
│         FUZZY LOGIC CONTROLLER          │
│  • Trapezoidal membership functions     │
│  • 8 fuzzy rules                        │
│  • Risk per lane calculation            │
│  • Threat level & safest lane           │
└──────────────────┬──────────────────────┘
                   ↓
         [Enriched State Information]
                   ↓
┌─────────────────────────────────────────┐
│           RL AGENT (PPO)                │
│  • 10-dim state input                   │
│  • 3 action output (left/stay/right)    │
│  • Trained offline, inference online    │
└─────────────────────────────────────────┘
</pre>

### 📚 Tech Stack

<table>
  <tr>
    <td><a href="https://threejs.org/">Three.js</a></td>
    <td>3D graphics library for creating the cyberpunk driving environment with neon aesthetics</td>
  </tr>
  <tr>
    <td><a href="https://onnxruntime.ai/">ONNX Runtime</a></td>
    <td>High-performance inference engine for running trained neural networks in the browser</td>
  </tr>
  <tr>
    <td><a href="https://stable-baselines3.readthedocs.io/">Stable Baselines3</a></td>
    <td>Reliable implementations of reinforcement learning algorithms for training</td>
  </tr>
  <tr>
    <td><a href="https://gymnasium.farama.org/">Gymnasium</a></td>
    <td>Standard API for reinforcement learning environments</td>
  </tr>
  <tr>
    <td><a href="https://pytorch.org/">PyTorch</a></td>
    <td>Deep learning framework powering the neural network training</td>
  </tr>
</table>

<br />

## 🧐 What's Inside?

### 🎮 Features

| Feature | Description |
|---------|-------------|
| 🤖 **Fully Autonomous** | No human control - AI drives the car |
| 🧠 **Hybrid AI System** | Fuzzy Logic + RL working together |
| 🎨 **Cyberpunk Visuals** | Neon aesthetics with Three.js |
| 📊 **Debug Panel** | Live state vectors, action probabilities |
| ⚡ **60 FPS Inference** | ONNX-powered browser performance |

### 🎯 Fuzzy Logic Controller

The fuzzy system uses **trapezoidal membership functions** to assess risk:

<details>
<summary><strong>Distance Membership Sets</strong></summary>

| Set | Parameters |
|-----|------------|
| Very Close | [0, 0, 10, 20] |
| Close | [15, 25, 35, 45] |
| Medium | [40, 50, 60, 70] |
| Far | [65, 80, 100, 100] |

</details>

<details>
<summary><strong>Fuzzy Rules (8 total)</strong></summary>

1. Very Close → Critical Risk
2. Close + Fast → Very High Risk
3. Close + Normal → High Risk
4. Close + Slow → Medium Risk
5. Medium + Fast → High Risk
6. Medium + Normal → Medium Risk
7. Medium + Slow → Low Risk
8. Far → Very Low Risk

</details>

### 🤖 Reinforcement Learning (PPO)

<details>
<summary><strong>State Vector (10 dimensions)</strong></summary>

| Index | Feature | Range |
|-------|---------|-------|
| 0-1 | Left lane distance + risk | [0, 1] |
| 2-3 | Center lane distance + risk | [0, 1] |
| 4-5 | Right lane distance + risk | [0, 1] |
| 6 | Current lane | 0/0.5/1 |
| 7 | Lane change cooldown | [0, 1] |
| 8 | Min time-to-collision | [0, 1] |
| 9 | Car speed | [0, 1] |

</details>

<details>
<summary><strong>Reward Function</strong></summary>

| Event | Reward |
|-------|--------|
| Survival (per step) | +0.1 |
| Obstacle avoided | +0.5 |
| Safe distance (>30m) | +0.2 |
| Center lane preference | +0.05 |
| Unnecessary lane change | -0.3 |
| Oscillation (back-and-forth) | -0.5 |
| Collision | -100 |

</details>

<br />

## 📁 Project Structure

<pre>
car-driving-example-ai/
├── browser/
│   ├── models/
│   │   └── policy.onnx         # Exported ONNX model
│   └── index.html              # Main simulation
├── training/
│   ├── checkpoints/
│   │   └── best/               # Best model checkpoints
│   ├── env/
│   │   ├── __init__.py
│   │   └── car_env.py          # Gymnasium environment
│   ├── logs/                   # TensorBoard logs
│   ├── models/
│   │   ├── __init__.py
│   │   └── policy.py           # Neural network architecture
│   ├── export_onnx.py          # ONNX export pipeline
│   ├── quick_train.py          # Quick training script
│   ├── train.py                # Full PPO training script
│   └── requirements.txt        # Python dependencies
└── README.md
</pre>

<br />

## 🚀 Getting Started

### 📦 Prerequisites

- Python (v3.8+)
- Node.js (v14.0.0+) - for local server
- pip (v21.0+)

### ⚙️ Installation

**1. Clone & Install Dependencies**

<pre>
git clone https://github.com/yasinatesim/car-driving-example-ai.git
cd car-driving-example-ai/training
pip install -r requirements.txt
</pre>

**2. Train the Model**

<pre>
# Quick training (~5 minutes, 100k steps)
python quick_train.py --timesteps 100000

# Standard training (~35 minutes, 500k steps)
python train.py --timesteps 500000

# Full training with all options
python train.py \
    --timesteps 1000000 \
    --n-envs 4 \
    --lr 3e-4 \
    --batch-size 64 \
    --save-freq 10000 \
    --eval-freq 5000
</pre>

> **Note**: The ONNX model is automatically exported to `browser/models/policy.onnx` after training.

**3. Run the Simulation**

<pre>
# From project root
npx serve . -l 8080

# Or use Python
python -m http.server 8080
</pre>

Open `http://localhost:8080/browser` in your browser 🎮

### 🎮 Controls

| Key | Action |
|-----|--------|
| `D` | Toggle Debug Panel |
| `R` | Reset Episode |
| `Space` | Pause/Resume |

<br />

## 📊 Training Progress

Expected learning curve:

| Timesteps | Expected Reward | Behavior |
|-----------|-----------------|----------|
| 10k | -50 to 0 | Random crashing |
| 50k | 0 to 50 | Basic avoidance |
| 100k | 50 to 150 | Decent driving |
| 500k | 150 to 300 | Good performance |
| 1M+ | 300+ | Expert driving |

### 📈 Monitor with TensorBoard

<pre>
tensorboard --logdir training/logs
</pre>

<br />

## 🎨 Visual Style

The simulation features a **premium cyberpunk aesthetic**:

- 🌑 Dark background (`#0a0a1a`)
- 💠 Neon cyan accents (`#00f0ff`)
- 💜 Magenta highlights (`#ff00aa`)
- ✨ Glowing effects on car and UI
- 🌃 City skyline silhouette
- ⭐ Starfield background
- 💡 Animated road with light posts

<br />

## 🔑 License

- Copyright © 2026 - MIT License.

See [LICENSE](LICENSE) for more information.

---

_This README was generated with by [markdown-manager](https://github.com/yasinatesim/markdown-manager)_ 🥲
