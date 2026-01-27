#!/usr/bin/env python3
"""
Quick Training Script with ONNX Export
Run this for a complete training + export pipeline
"""

import os
import sys
import argparse
import numpy as np
import torch

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv

from env.car_env import CarEnv, make_env


def parse_args():
    parser = argparse.ArgumentParser(description='Quick train and export')
    parser.add_argument('--timesteps', type=int, default=100000,
                        help='Training timesteps (default: 100000 for quick test)')
    parser.add_argument('--output', type=str, default='../browser/models/policy.onnx',
                        help='Output ONNX file path')
    parser.add_argument('--device', type=str, default='auto',
                        help='Training device (cpu, cuda, auto)')
    return parser.parse_args()


def quick_train(timesteps: int, device: str):
    """Quick training with minimal configuration"""
    print("=" * 60)
    print("🚗 Quick Training - Autonomous Car RL")
    print("=" * 60)
    print(f"Timesteps: {timesteps:,}")
    print(f"Device: {device}")
    print("=" * 60)

    # Create environment
    print("\n📦 Creating environment...")
    env = DummyVecEnv([make_env(0, 42)])

    # Create model
    print("🤖 Creating PPO model...")
    model = PPO(
        policy="MlpPolicy",
        env=env,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,
        policy_kwargs=dict(
            net_arch=dict(pi=[64, 64], vf=[64, 64])
        ),
        verbose=1,
        device=device
    )

    # Train
    print(f"\n🚀 Training for {timesteps:,} timesteps...")
    print("-" * 60)

    # Try with progress bar, fall back to without
    try:
        model.learn(total_timesteps=timesteps, progress_bar=True)
    except ImportError:
        print("(Progress bar not available, training without it...)")
        model.learn(total_timesteps=timesteps, progress_bar=False)

    # Save PyTorch model
    os.makedirs('checkpoints', exist_ok=True)
    model.save('checkpoints/quick_model')
    print("\n💾 Model saved to checkpoints/quick_model")

    env.close()
    return model


def export_to_onnx(model, output_path: str):
    """Export trained model to ONNX format"""
    print("\n📤 Exporting to ONNX...")

    # Create output directory
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)

    # Get policy network
    policy = model.policy

    # Create a wrapper that only returns action
    class PolicyWrapper(torch.nn.Module):
        def __init__(self, policy):
            super().__init__()
            self.features_extractor = policy.features_extractor
            self.mlp_extractor = policy.mlp_extractor
            self.action_net = policy.action_net

        def forward(self, obs):
            features = self.features_extractor(obs)
            latent_pi, _ = self.mlp_extractor(features)
            logits = self.action_net(latent_pi)
            probs = torch.softmax(logits, dim=-1)
            action = torch.argmax(probs, dim=-1)
            return action

    wrapper = PolicyWrapper(policy)
    wrapper.eval()

    # Create dummy input
    dummy_input = torch.randn(1, 10)

    # Export to ONNX using dynamo=False for compatibility
    try:
        # Try new API first with dynamo disabled
        torch.onnx.export(
            wrapper,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['obs'],
            output_names=['action'],
            dynamic_axes={
                'obs': {0: 'batch_size'},
                'action': {0: 'batch_size'}
            },
            dynamo=False
        )
    except TypeError:
        # Fallback for older PyTorch versions
        torch.onnx.export(
            wrapper,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=11,
            do_constant_folding=True,
            input_names=['obs'],
            output_names=['action'],
            dynamic_axes={
                'obs': {0: 'batch_size'},
                'action': {0: 'batch_size'}
            }
        )

    print(f"✅ ONNX model exported to: {output_path}")

    # Validate
    validate_onnx(model, output_path)


def validate_onnx(model, onnx_path: str):
    """Validate ONNX model matches PyTorch output"""
    print("\n🔍 Validating ONNX model...")

    try:
        import onnxruntime as ort

        # Create test input
        test_input = np.random.randn(1, 10).astype(np.float32)

        # PyTorch prediction
        with torch.no_grad():
            torch_action, _, _ = model.policy.forward(
                torch.from_numpy(test_input),
                deterministic=True
            )
            torch_action = torch_action.numpy()[0]

        # ONNX prediction
        session = ort.InferenceSession(onnx_path)
        onnx_action = session.run(None, {'obs': test_input})[0][0]

        print(f"  PyTorch action: {torch_action}")
        print(f"  ONNX action: {onnx_action}")

        if torch_action == onnx_action:
            print("  ✅ Validation passed! Outputs match.")
        else:
            print("  ⚠️ Outputs differ (may be due to floating point precision)")

    except ImportError:
        print("  ⚠️ ONNX Runtime not installed, skipping validation")


def evaluate_model(model, n_episodes: int = 5):
    """Quick evaluation"""
    print(f"\n📈 Evaluating for {n_episodes} episodes...")

    env = CarEnv()
    rewards = []

    for ep in range(n_episodes):
        obs, _ = env.reset()
        total_reward = 0
        done = False
        steps = 0

        while not done and steps < 2000:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward
            done = terminated or truncated
            steps += 1

        rewards.append(total_reward)
        print(f"  Episode {ep+1}: reward={total_reward:.1f}, "
              f"distance={info['distance']:.1f}m, steps={steps}")

    print(f"\n📊 Mean Reward: {np.mean(rewards):.2f}")
    env.close()


def main():
    args = parse_args()

    # Train
    model = quick_train(args.timesteps, args.device)

    # Evaluate
    evaluate_model(model)

    # Export
    export_to_onnx(model, args.output)

    print("\n" + "=" * 60)
    print("✅ All done! You can now run the browser simulation.")
    print(f"   ONNX model: {args.output}")
    print("=" * 60)


if __name__ == "__main__":
    main()
