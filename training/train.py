"""
PPO Training Script for Autonomous Car RL Agent
Uses Stable-Baselines3 with custom environment
"""

import os
import argparse
from datetime import datetime
import numpy as np

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.callbacks import (
    EvalCallback,
    CheckpointCallback,
    CallbackList
)
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import SubprocVecEnv, DummyVecEnv

from env.car_env import CarEnv, make_env


def parse_args():
    parser = argparse.ArgumentParser(description='Train PPO agent for autonomous driving')
    parser.add_argument('--timesteps', type=int, default=500000,
                        help='Total training timesteps')
    parser.add_argument('--n-envs', type=int, default=4,
                        help='Number of parallel environments')
    parser.add_argument('--lr', type=float, default=3e-4,
                        help='Learning rate')
    parser.add_argument('--batch-size', type=int, default=64,
                        help='Batch size for training')
    parser.add_argument('--n-epochs', type=int, default=10,
                        help='Number of epochs per update')
    parser.add_argument('--gamma', type=float, default=0.99,
                        help='Discount factor')
    parser.add_argument('--gae-lambda', type=float, default=0.95,
                        help='GAE lambda')
    parser.add_argument('--clip-range', type=float, default=0.2,
                        help='PPO clip range')
    parser.add_argument('--ent-coef', type=float, default=0.01,
                        help='Entropy coefficient')
    parser.add_argument('--save-freq', type=int, default=10000,
                        help='Save checkpoint every N steps')
    parser.add_argument('--eval-freq', type=int, default=5000,
                        help='Evaluate every N steps')
    parser.add_argument('--log-dir', type=str, default='./logs',
                        help='Directory for logs')
    parser.add_argument('--model-dir', type=str, default='./checkpoints',
                        help='Directory for model checkpoints')
    parser.add_argument('--seed', type=int, default=42,
                        help='Random seed')
    parser.add_argument('--device', type=str, default='auto',
                        help='Device (cpu, cuda, auto)')
    return parser.parse_args()


def create_env(n_envs: int, seed: int, use_subprocess: bool = True):
    """Create vectorized environment"""
    env_fns = [make_env(rank=i, seed=seed) for i in range(n_envs)]

    if use_subprocess and n_envs > 1:
        return SubprocVecEnv(env_fns)
    return DummyVecEnv(env_fns)


def train(args):
    """Main training loop"""
    # Create directories
    os.makedirs(args.log_dir, exist_ok=True)
    os.makedirs(args.model_dir, exist_ok=True)

    # Timestamp for this run
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = f"ppo_car_{timestamp}"

    print("=" * 60)
    print("Autonomous Car RL Training")
    print("=" * 60)
    print(f"Timesteps: {args.timesteps:,}")
    print(f"Environments: {args.n_envs}")
    print(f"Learning Rate: {args.lr}")
    print(f"Batch Size: {args.batch_size}")
    print(f"Device: {args.device}")
    print("=" * 60)

    # Create training environment
    print("\n📦 Creating environments...")
    train_env = create_env(args.n_envs, args.seed)

    # Create evaluation environment
    eval_env = create_env(1, args.seed + 100, use_subprocess=False)

    # Create callbacks
    checkpoint_callback = CheckpointCallback(
        save_freq=args.save_freq // args.n_envs,
        save_path=args.model_dir,
        name_prefix=run_name
    )

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=os.path.join(args.model_dir, 'best'),
        log_path=args.log_dir,
        eval_freq=args.eval_freq // args.n_envs,
        n_eval_episodes=5,
        deterministic=True,
        render=False
    )

    callbacks = CallbackList([checkpoint_callback, eval_callback])

    # Create PPO model
    print("\n🤖 Creating PPO model...")
    model = PPO(
        policy="MlpPolicy",
        env=train_env,
        learning_rate=args.lr,
        n_steps=2048,
        batch_size=args.batch_size,
        n_epochs=args.n_epochs,
        gamma=args.gamma,
        gae_lambda=args.gae_lambda,
        clip_range=args.clip_range,
        ent_coef=args.ent_coef,
        vf_coef=0.5,
        max_grad_norm=0.5,
        policy_kwargs=dict(
            net_arch=dict(pi=[64, 64], vf=[64, 64])
        ),
        tensorboard_log=args.log_dir,
        verbose=1,
        seed=args.seed,
        device=args.device
    )

    print(f"\n📊 Model architecture:")
    print(model.policy)

    # Train
    print(f"\n🚀 Starting training for {args.timesteps:,} timesteps...")
    print("-" * 60)

    try:
        model.learn(
            total_timesteps=args.timesteps,
            callback=callbacks,
            progress_bar=True,
            tb_log_name=run_name
        )
    except KeyboardInterrupt:
        print("\n⚠️ Training interrupted by user")

    # Save final model
    final_path = os.path.join(args.model_dir, f"{run_name}_final")
    model.save(final_path)
    print(f"\n💾 Final model saved to: {final_path}")

    # Cleanup
    train_env.close()
    eval_env.close()

    print("\n✅ Training complete!")
    return model


def evaluate(model, n_episodes: int = 10):
    """Evaluate trained model"""
    env = CarEnv()

    rewards = []
    distances = []
    avoided = []

    print(f"\n📈 Evaluating for {n_episodes} episodes...")

    for ep in range(n_episodes):
        obs, _ = env.reset()
        total_reward = 0
        done = False

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward
            done = terminated or truncated

        rewards.append(total_reward)
        distances.append(info['distance'])
        avoided.append(info['avoided'])

        print(f"  Episode {ep+1}: reward={total_reward:.1f}, "
              f"distance={info['distance']:.1f}m, avoided={info['avoided']}")

    print(f"\n📊 Evaluation Results:")
    print(f"  Mean Reward: {np.mean(rewards):.2f} ± {np.std(rewards):.2f}")
    print(f"  Mean Distance: {np.mean(distances):.1f}m")
    print(f"  Mean Avoided: {np.mean(avoided):.1f}")

    env.close()


def export_to_onnx(model, output_path: str = '../browser/models/policy.onnx'):
    """Export trained model to ONNX format for browser"""
    import torch
    import torch.nn as nn

    print("\n📤 Exporting model to ONNX...")

    # Create output directory
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Get policy network
    policy = model.policy

    # Create a wrapper that only returns action
    class PolicyWrapper(nn.Module):
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

    # Export to ONNX - try different methods
    try:
        # Method 1: Standard export with dynamo=False
        try:
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
            # Method 2: Fallback for older PyTorch (no dynamo parameter)
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
        try:
            import onnxruntime as ort
            session = ort.InferenceSession(output_path)
            test_input = np.random.randn(1, 10).astype(np.float32)
            result = session.run(None, {'obs': test_input})
            print(f"✅ ONNX validation passed! Test action: {result[0][0]}")
        except Exception as e:
            print(f"⚠️ ONNX validation skipped: {e}")

    except Exception as e:
        print(f"❌ ONNX export failed: {e}")
        print("   Try: pip install onnxscript")
        raise e


if __name__ == "__main__":
    args = parse_args()
    model = train(args)
    evaluate(model)

    # Auto-export to ONNX for browser
    export_to_onnx(model, '../browser/models/policy.onnx')

    print("\n" + "=" * 60)
    print("✅ Training complete!")
    print("   To run the simulation:")
    print("   cd .. && npx serve browser -l 8080")
    print("=" * 60)