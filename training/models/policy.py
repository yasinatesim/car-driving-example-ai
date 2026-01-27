"""
Custom Neural Network Policy for PPO
"""

import torch
import torch.nn as nn
from stable_baselines3.common.policies import ActorCriticPolicy
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
from gymnasium import spaces
from typing import Dict, List, Tuple, Type


class CustomFeaturesExtractor(BaseFeaturesExtractor):
    """
    Custom feature extractor with 64x64 hidden layers
    """

    def __init__(self, observation_space: spaces.Box, features_dim: int = 64):
        super().__init__(observation_space, features_dim)

        n_input = observation_space.shape[0]

        self.net = nn.Sequential(
            nn.Linear(n_input, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
        )

    def forward(self, observations: torch.Tensor) -> torch.Tensor:
        return self.net(observations)


class CustomPolicy(ActorCriticPolicy):
    """
    Custom Actor-Critic policy using 64x64 network
    """

    def __init__(self, *args, **kwargs):
        super().__init__(
            *args,
            **kwargs,
            features_extractor_class=CustomFeaturesExtractor,
            features_extractor_kwargs=dict(features_dim=64),
        )


class StandalonePolicy(nn.Module):
    """
    Standalone policy network for ONNX export
    Matches the structure used in training
    """

    def __init__(self, input_dim: int = 10, hidden_dim: int = 64, output_dim: int = 3):
        super().__init__()

        # Feature extractor (shared)
        self.features = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
        )

        # Policy head (actor)
        self.policy = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
        )

        # Value head (critic) - not needed for inference but included for completeness
        self.value = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass returns action logits"""
        features = self.features(x)
        logits = self.policy(features)
        return logits

    def get_action(self, x: torch.Tensor) -> torch.Tensor:
        """Get action from observation"""
        logits = self.forward(x)
        probs = torch.softmax(logits, dim=-1)
        action = torch.argmax(probs, dim=-1)
        return action

    def get_action_and_probs(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Get action and probabilities"""
        logits = self.forward(x)
        probs = torch.softmax(logits, dim=-1)
        action = torch.argmax(probs, dim=-1)
        return action, probs


def load_from_sb3(sb3_model, device: str = 'cpu') -> StandalonePolicy:
    """
    Load weights from Stable-Baselines3 model to standalone policy
    """
    policy = StandalonePolicy().to(device)

    # Get the policy network from SB3 model
    sb3_policy = sb3_model.policy

    # Copy feature extractor weights
    sb3_features = sb3_policy.features_extractor
    policy.features[0].weight.data = sb3_features.net[0].weight.data.clone()
    policy.features[0].bias.data = sb3_features.net[0].bias.data.clone()
    policy.features[2].weight.data = sb3_features.net[2].weight.data.clone()
    policy.features[2].bias.data = sb3_features.net[2].bias.data.clone()

    # Copy policy head weights from mlp_extractor and action_net
    if hasattr(sb3_policy, 'mlp_extractor'):
        mlp = sb3_policy.mlp_extractor
        if hasattr(mlp, 'policy_net') and len(mlp.policy_net) > 0:
            policy.policy[0].weight.data = mlp.policy_net[0].weight.data.clone()
            policy.policy[0].bias.data = mlp.policy_net[0].bias.data.clone()

    # Copy action network
    policy.policy[2].weight.data = sb3_policy.action_net.weight.data.clone()
    policy.policy[2].bias.data = sb3_policy.action_net.bias.data.clone()

    return policy
