#!/usr/bin/env python3
"""
ONNX Export Pipeline
Converts trained Stable-Baselines3 PPO model to ONNX format
"""

import os
import sys
import argparse
import numpy as np
import torch
import torch.nn as nn

from stable_baselines3 import PPO


def parse_args():
    parser = argparse.ArgumentParser(description='Export trained model to ONNX')
    parser.add_argument('--model', type=str, required=True,
                        help='Path to trained SB3 model (.zip)')
    parser.add_argument('--output', type=str, default='../browser/models/policy.onnx',
                        help='Output ONNX file path')
    parser.add_argument('--opset', type=int, default=11,
                        help='ONNX opset version')
    parser.add_argument('--validate', action='store_true',
                        help='Validate ONNX model after export')
    return parser.parse_args()


class OnnxablePolicy(nn.Module):
    """
    Wrapper to make SB3 policy ONNX-exportable
    Returns only action (argmax of policy output)
    """

    def __init__(self, features_extractor, mlp_extractor, action_net):
        super().__init__()
        self.features_extractor = features_extractor
        self.mlp_extractor = mlp_extractor
        self.action_net = action_net

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        # Extract features
        features = self.features_extractor(obs)

        # Get latent policy representation
        latent_pi, _ = self.mlp_extractor(features)

        # Get action logits
        logits = self.action_net(latent_pi)

        # Get action (argmax)
        action = torch.argmax(logits, dim=-1)

        return action


class OnnxablePolicyWithProbs(nn.Module):
    """
    Wrapper that returns both action and probabilities
    """

    def __init__(self, features_extractor, mlp_extractor, action_net):
        super().__init__()
        self.features_extractor = features_extractor
        self.mlp_extractor = mlp_extractor
        self.action_net = action_net

    def forward(self, obs: torch.Tensor):
        features = self.features_extractor(obs)
        latent_pi, _ = self.mlp_extractor(features)
        logits = self.action_net(latent_pi)
        probs = torch.softmax(logits, dim=-1)
        action = torch.argmax(probs, dim=-1)
        return action, probs


def export_model(model_path: str, output_path: str, opset_version: int = 11):
    """
    Export SB3 model to ONNX format
    """
    print("=" * 60)
    print("ONNX Export Pipeline")
    print("=" * 60)
    print(f"Input model: {model_path}")
    print(f"Output ONNX: {output_path}")
    print(f"ONNX opset: {opset_version}")
    print("=" * 60)

    # Load model
    print("\n📥 Loading model...")
    model = PPO.load(model_path)
    policy = model.policy

    print(f"  Policy type: {type(policy)}")
    print(f"  Observation space: {model.observation_space}")
    print(f"  Action space: {model.action_space}")

    # Create ONNX-exportable wrapper
    print("\n🔧 Creating ONNX wrapper...")
    onnx_policy = OnnxablePolicy(
        policy.features_extractor,
        policy.mlp_extractor,
        policy.action_net
    )
    onnx_policy.eval()

    # Create dummy input
    obs_shape = model.observation_space.shape
    dummy_input = torch.randn(1, *obs_shape)

    print(f"  Input shape: {dummy_input.shape}")

    # Test forward pass
    with torch.no_grad():
        test_output = onnx_policy(dummy_input)
        print(f"  Output shape: {test_output.shape}")
        print(f"  Test output: {test_output}")

    # Create output directory
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)

    # Export to ONNX
    print("\n📤 Exporting to ONNX...")
    torch.onnx.export(
        onnx_policy,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=['obs'],
        output_names=['action'],
        dynamic_axes={
            'obs': {0: 'batch_size'},
            'action': {0: 'batch_size'}
        }
    )

    # Check file size
    file_size = os.path.getsize(output_path) / 1024
    print(f"  ✅ Exported successfully!")
    print(f"  File size: {file_size:.1f} KB")

    return model


def validate_onnx(model, onnx_path: str, n_tests: int = 10):
    """
    Validate ONNX model produces same outputs as PyTorch
    """
    print("\n🔍 Validating ONNX model...")

    try:
        import onnxruntime as ort
        import onnx

        # Load and check ONNX model
        onnx_model = onnx.load(onnx_path)
        onnx.checker.check_model(onnx_model)
        print("  ✅ ONNX model structure is valid")

        # Create inference session
        session = ort.InferenceSession(onnx_path)

        # Run multiple tests
        matches = 0
        for i in range(n_tests):
            # Random test input
            test_input = np.random.randn(1, 10).astype(np.float32)

            # PyTorch prediction
            with torch.no_grad():
                torch_action, _, _ = model.policy.forward(
                    torch.from_numpy(test_input),
                    deterministic=True
                )
                torch_action = torch_action.numpy()[0]

            # ONNX prediction
            onnx_action = session.run(None, {'obs': test_input})[0][0]

            if torch_action == onnx_action:
                matches += 1

        accuracy = matches / n_tests * 100
        print(f"  Accuracy: {accuracy:.0f}% ({matches}/{n_tests} tests passed)")

        if accuracy == 100:
            print("  ✅ Perfect match! ONNX model is valid.")
        elif accuracy >= 90:
            print("  ⚠️ Minor differences (likely floating point precision)")
        else:
            print("  ❌ Significant differences detected!")

        # Print model info
        print("\n📊 ONNX Model Info:")
        print(f"  Inputs: {[i.name for i in session.get_inputs()]}")
        print(f"  Outputs: {[o.name for o in session.get_outputs()]}")

    except ImportError as e:
        print(f"  ⚠️ Cannot validate: {e}")
        print("  Install with: pip install onnxruntime onnx")


def main():
    args = parse_args()

    # Check model exists
    if not os.path.exists(args.model):
        # Try with .zip extension
        if os.path.exists(args.model + '.zip'):
            args.model = args.model + '.zip'
        else:
            print(f"❌ Model not found: {args.model}")
            sys.exit(1)

    # Export
    model = export_model(args.model, args.output, args.opset)

    # Validate if requested
    if args.validate:
        validate_onnx(model, args.output)

    print("\n" + "=" * 60)
    print("✅ Export complete!")
    print(f"   ONNX model: {args.output}")
    print("=" * 60)


if __name__ == "__main__":
    main()
